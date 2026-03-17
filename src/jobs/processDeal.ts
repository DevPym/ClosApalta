// 3.2 - Capa de aplicación (jobs/) — contiene la lógica de negocio pura. No sabe nada de HTTP ni de la cola.

import { OracleClient } from "../infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "../infrastructure/hubspot/HubSpotClient.js";
import {
    mapHubSpotContactToGuestProfile,
    mapHubSpotReservationToOracle,
    resolveOracleCompanyType,
} from "../application/mappers.js";

const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// ============================================================================
// 🏨 JOB: Procesar Deal
//
// Lógica pura extraída del webhook POST /webhook/hubspot/deal.
// No recibe req/res — solo datos y lanza excepciones si algo falla.
// El worker en queue/worker.ts maneja los reintentos.
//
// Flujo (7 pasos):
//   1. Obtener Deal completo desde HubSpot
//   2. Obtener contactos asociados con etiquetas
//   3. Handshake: cada contacto debe tener id_oracle en Oracle
//   4. Procesar Company asociada (agencia de viajes si tipo_de_empresa="Agencia")
//   5. Construir payload y crear/actualizar reserva en Oracle
//   6. Capturar Confirmation Number (con re-intento si no llega en la respuesta)
//   7. Guardar id_oracle + numero_de_reserva en Deal y Contacto principal
// ============================================================================

export async function processDeal(payload: { dealId: string }): Promise<void> {
    const { dealId } = payload;
    console.log(`🏨 [Job:Deal] Procesando Deal HubSpot ${dealId}`);

    // ── PASO 1: Deal completo ────────────────────────────────────────────────
    const fullDeal = await hubspot.getDealById(dealId);
    const props = fullDeal.properties;

    const existingOracleId: string | null =
        props.id_oracle?.value || props.id_oracle || null;
    const currentConfirmation: string | null =
        props.numero_de_reserva?.value || props.numero_de_reserva || null;

    // ── PASO 2: Contactos con etiquetas ─────────────────────────────────────
    const associations = await hubspot.getAssociatedContacts(dealId);
    if (associations.length === 0) {
        // Lanzar error para que el worker lo reintente —
        // el contacto puede no estar asociado aún por latencia de HubSpot.
        throw new Error(
            `Deal ${dealId} no tiene contactos asociados. Se reintentará.`
        );
    }

    // ── PASO 3: Handshake de cada contacto ───────────────────────────────────
    const guestProfiles = await Promise.all(
        associations.map(async (assoc: any) => {
            const hsContact = await hubspot.getContactById(assoc.contactId);
            let oracleId = hsContact.id_oracle;

            if (!oracleId) {
                console.log(
                    `🆕 [Job:Deal] Creando perfil Oracle para: ${hsContact.firstName} ${hsContact.lastName}`
                );
                const profileData = mapHubSpotContactToGuestProfile(hsContact);
                oracleId = await oracle.createGuestProfile(profileData);
                await hubspot.updateOracleId(assoc.contactId, oracleId);
            }

            const isPrimary = assoc.labels.some(
                (l: string) => l.toLowerCase() === "huésped principal"
            );

            return { id: oracleId, isPrimary, contactId: assoc.contactId };
        })
    );

    // Seguridad: si ninguno tiene etiqueta de principal, el primero lo es
    if (!guestProfiles.some((g) => g.isPrimary)) {
        guestProfiles[0]!.isPrimary = true;
        console.log(
            "⚠️ [Job:Deal] Sin etiqueta 'huésped principal'. Se asignó el primer contacto."
        );
    }

    // ── PASO 4: Company / Agencia de viajes ──────────────────────────────────
    let travelAgentOracleId: string | undefined = undefined;
    const hsCompany = await hubspot.getCompanyByDealId(dealId);

    if (hsCompany) {
        console.log(
            `🏢 [Job:Deal] Company: "${hsCompany.name}" | tipo: ${hsCompany.tipo_de_empresa}`
        );

        let companyOracleId = hsCompany.id_oracle;

        if (!companyOracleId) {
            const oracleProfileType = resolveOracleCompanyType(
                hsCompany.tipo_de_empresa
            );
            console.warn(
                `⚠️ [Job:Deal] Company "${hsCompany.name}" no tiene id_oracle. ` +
                `El webhook de company no se procesó antes. ` +
                `Creando en Oracle solo con nombre — revisar webhook de Company en HubSpot.`
            );
            companyOracleId = await oracle.createCompanyProfile(
                hsCompany.name,
                oracleProfileType
            );
            await hubspot.updateCompany(hsCompany.id, { id_oracle: companyOracleId });
        } else {
            console.log(
                `ℹ️ [Job:Deal] Company ya tiene Oracle ID: ${companyOracleId}`
            );
        }

        if (hsCompany.tipo_de_empresa === "Agencia") {
            travelAgentOracleId = companyOracleId;
            console.log(
                `✈️ [Job:Deal] Agencia "${hsCompany.name}" → TravelAgent en Oracle.`
            );
        }
    } else {
        console.log("ℹ️ [Job:Deal] Sin Company asociada. Reserva individual.");
    }

    // ── PASO 5: Crear o actualizar reserva en Oracle ─────────────────────────
    const oraclePayload = mapHubSpotReservationToOracle(
        props,
        guestProfiles,
        travelAgentOracleId
    );

    let internalId: string;
    let rawResponse: any;

    if (
        existingOracleId &&
        existingOracleId !== "" &&
        existingOracleId !== "undefined"
    ) {
        console.log(
            `🔄 [Job:Deal] Actualizando reserva Oracle ${existingOracleId}...`
        );
        const updatePayload = {
            reservations: [
                {
                    reservationIdList: [
                        { type: "Reservation", id: String(existingOracleId) },
                    ],
                    ...oraclePayload.reservations.reservation[0],
                },
            ],
        };
        rawResponse = await oracle.updateReservation(
            String(existingOracleId),
            updatePayload
        );
        internalId = String(existingOracleId);
    } else {
        console.log(
            `📡 [Job:Deal] Creando nueva reserva para ${guestProfiles.length} huésped(es)...`
        );
        const createResponse = await oracle.createReservationInOracle(oraclePayload);
        internalId = String(createResponse.id);
        rawResponse = createResponse.raw;
    }

    // ── PASO 6: Confirmation Number ──────────────────────────────────────────
    let confirmationId = findConfirmationId(rawResponse);
    if (!confirmationId) {
        console.log(
            `🔍 [Job:Deal] Confirmation no hallado. Re-consultando ${internalId}...`
        );
        await new Promise((resolve) => setTimeout(resolve, 600));
        const freshRes = await oracle.getReservation(internalId);
        confirmationId = findConfirmationId(freshRes) ?? undefined;
    }

    const finalConfirmation = confirmationId || currentConfirmation || internalId;
    console.log(
        `✅ [Job:Deal] ID Oracle: ${internalId} | Confirmation: ${finalConfirmation}`
    );

    // ── PASO 7: Guardar IDs en HubSpot ───────────────────────────────────────
    await hubspot.updateDeal(dealId, {
        id_oracle: internalId,
        numero_de_reserva: String(finalConfirmation),
    });

    const primaryGuest = guestProfiles.find((g) => g.isPrimary);
    if (primaryGuest) {
        await hubspot.updateContact(primaryGuest.contactId, {
            id_oracle: primaryGuest.id,
            numero_de_reserva: String(finalConfirmation),
        });
    }

    console.log(
        `✨ [Job:Deal] Deal ${dealId} sincronizado con ${guestProfiles.length} huésped(es).`
    );
}

// ============================================================================
// 🔍 FUNCIÓN RASTREADORA DE CONFIRMATION NUMBER
// Movida aquí desde index.ts porque solo la necesita processDeal.
// ============================================================================
function findConfirmationId(obj: any): string | undefined {
    if (!obj || typeof obj !== "object") return undefined;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findConfirmationId(item);
            if (found) return found;
        }
        return undefined;
    }
    if (obj.type?.toString().toUpperCase() === "CONFIRMATION" && obj.id) {
        return String(obj.id);
    }
    for (const key in obj) {
        const found = findConfirmationId(obj[key]);
        if (found) return found;
    }
    return undefined;
}