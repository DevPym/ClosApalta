// 3.2 - Capa de aplicación (jobs/) — contiene la lógica de negocio pura. No sabe nada de HTTP ni de la cola.

import { oracle, hubspot } from "../shared/clients.js";
import {
    mapHubSpotContactToGuestProfile,
    mapHubSpotReservationToOracle,
    resolveOracleCompanyType,
} from "../application/mappers.js";

// ============================================================================
// 🏨 CREAR / ACTUALIZAR Deal (reserva)
//
// Disparado por: POST /webhook/hubspot/deal
// Triggers HubSpot: deal.creation | deal.propertyChange
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
    const existingOracleId: string | null = props.id_oracle || null;
    const currentConfirmation: string | null = props.numero_de_reserva || null;


    // ── PASO 2: Contactos con etiquetas ─────────────────────────────────────
    const associations = await hubspot.getAssociatedContacts(dealId);
    if (associations.length === 0) {
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

        if (!hsCompany.name || !hsCompany.name.trim()) {
            console.warn(
                `⚠️ [Job:Deal] Company asociada al Deal no tiene nombre. ` +
                `Se omite — verificar en HubSpot que el campo 'name' esté completo.`
            );
        } else if (!companyOracleId) {
            console.warn(
                `⚠️ [Job:Deal] Company "${hsCompany.name}" no tiene id_oracle. ` +
                `El webhook de company no se procesó antes. ` +
                `Creando en Oracle solo con nombre — revisar webhook de Company en HubSpot.`
            );
            const oracleProfileType = resolveOracleCompanyType(hsCompany.tipo_de_empresa ?? "");
            companyOracleId = await oracle.createCompanyProfile(
                hsCompany.name,
                oracleProfileType
            );
            await hubspot.updateCompany(hsCompany.id, { id_oracle: companyOracleId });
        } else {
            console.log(`ℹ️ [Job:Deal] Company ya tiene Oracle ID: ${companyOracleId}`);
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
        console.log(`🔄 [Job:Deal] Actualizando reserva Oracle ${existingOracleId}...`);
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
        confirmationId = findConfirmationId(freshRes) ?? null;
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
            numero_de_reserva: String(finalConfirmation),
        });
    }

    console.log(
        `✨ [Job:Deal] Deal ${dealId} sincronizado con ${guestProfiles.length} huésped(es).`
    );
}

// ============================================================================
// 🗑️ ELIMINAR Deal (cancela reserva en Oracle)
//
// Disparado por: POST /webhook/hubspot/deal/delete
// Trigger HubSpot: deal.deletion
//
// ⚠️ No existe eliminación permanente para reservas confirmadas en Oracle.
//    El único mecanismo disponible es la cancelación:
//    POST /hotels/{hotelId}/reservations/{reservationId}/cancellations
//    operationId: postCancelReservation
//
// ⚠️ El código de cancelación se configura vía ORACLE_CANCELLATION_REASON_CODE en .env.
//    Verificar con el equipo Oracle el código correcto para tu instancia.
// ============================================================================

export async function deleteDeal(payload: { dealId: string }): Promise<void> {
    const { dealId } = payload;
    console.log(`🗑️ [Job:DeleteDeal] Eliminando Deal HubSpot ${dealId}`);

    const archived = await hubspot.getArchivedDealById(dealId);

    if (!archived) {
        console.warn(
            `⚠️ [Job:DeleteDeal] Deal ${dealId} ya no existe en HubSpot ` +
            `(ni archivado). No se puede obtener id_oracle. Operación omitida.`
        );
        return;
    }

    if (!archived.id_oracle) {
        console.log(
            `ℹ️ [Job:DeleteDeal] Deal ${dealId} no tenía id_oracle. ` +
            `La reserva nunca fue sincronizada. No hay acción en Oracle.`
        );
        return;
    }

    const cancellationNumber = await oracle.cancelReservation(archived.id_oracle);

    console.log(
        `✅ [Job:DeleteDeal] Deal ${dealId} → Reserva Oracle ${archived.id_oracle} cancelada. ` +
        `Número de cancelación: ${cancellationNumber ?? "no devuelto por Oracle"}`
    );
}

// ============================================================================
// 🔍 FUNCIÓN RASTREADORA DE CONFIRMATION NUMBER
// ============================================================================

function findConfirmationId(data: any): string | null {
    if (!data) return null;
    const list =
        data?.reservationIdList ||
        data?.reservations?.[0]?.reservationIdList ||
        [];
    const found = list.find(
        (item: any) =>
            item.type === "Confirmation" || item.type === "confirmation"
    );
    return found?.id ?? null;
}
