import express from "express";
import type { Request, Response } from "express";
import { config } from "./config/index.js";
import { OracleClient } from "./infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "./infrastructure/hubspot/HubSpotClient.js";
import {
  mapHubSpotContactToGuestProfile,
  mapHubSpotReservationToOracle,
  resolveOracleCompanyType,
} from "./application/mappers.js";

const app = express();
app.use(express.json());

const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// ============================================================================
// 🔍 FUNCIÓN RASTREADORA DE CONFIRMATION NUMBER
// Busca recursivamente un ID de tipo "CONFIRMATION" en la respuesta de Oracle.
// Oracle a veces lo devuelve en la respuesta directa, otras veces solo
// al consultar la reserva con GET.
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

// ============================================================================
// 🩺 HEALTH CHECK
// ============================================================================
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "online",
    project: "Puente Clos Apalta",
    version: "2.0.0",
    endpoints: [
      "POST /webhook/hubspot/contact",
      "POST /webhook/hubspot/deal",
      "GET  /sync-to-oracle/:hsId",
    ],
  });
});

// ============================================================================
// 👤 WEBHOOK 1: CONTACTO NUEVO EN HUBSPOT
// Trigger: HubSpot → contact.creation
// Acción:  Crear perfil Guest en Oracle → guardar id_oracle en el Contacto
// ============================================================================
app.post("/webhook/hubspot/contact", async (req: Request, res: Response) => {
  console.log("\n📥 [CONTACTO] Webhook recibido.");

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    if (events.length === 0) return res.status(200).send("OK");

    const contactId = String(events[0].objectId);
    console.log(`📥 [CONTACTO] ID HubSpot: ${contactId}`);

    // 1. Obtener datos frescos del contacto desde HubSpot
    const hsContact = await hubspot.getContactById(contactId);

    // 2. Si ya tiene id_oracle, no crear duplicado
    if (hsContact.id_oracle) {
      console.log(
        `ℹ️ [CONTACTO] Ya tiene Oracle ID: ${hsContact.id_oracle}. Sin acción.`
      );
      return res.status(200).json({ success: true, skipped: true });
    }

    // 3. Crear perfil Guest en Oracle
    const profileData = mapHubSpotContactToGuestProfile(hsContact);
    const oracleId = await oracle.createGuestProfile(profileData);

    // 4. Guardar el id_oracle en el Contacto de HubSpot
    await hubspot.updateOracleId(contactId, oracleId);

    console.log(
      `✅ [CONTACTO] Contacto ${contactId} → Oracle Guest ${oracleId}`
    );
    return res.status(200).json({ success: true, oracleId });
  } catch (error: any) {
    console.error("❌ [CONTACTO] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🏨 WEBHOOK 2: DEAL CREADO O ACTUALIZADO EN HUBSPOT
// Trigger: HubSpot → deal.creation | deal.propertyChange
// Acción:
//   1. Obtener Deal completo + contactos con etiquetas
//   2. Handshake: cada contacto debe tener id_oracle en Oracle
//   3. Si hay Company asociada al Deal:
//      a. Obtener datos de la Company de HubSpot
//      b. Si tipo_de_empresa === "Agencia" → crear como Travel Agent en Oracle
//         y vincular a la reserva como reservationProfileType: "TravelAgent"
//      c. Si no es Agencia → crear como Company en Oracle (sin vincular a reserva)
//      d. Guardar id_oracle en la Company de HubSpot
//   4. Crear o actualizar la reserva en Oracle
//   5. Guardar id_oracle + numero_de_reserva en el Deal Y en el Contacto principal
// ============================================================================
app.post("/webhook/hubspot/deal", async (req: Request, res: Response) => {
  console.log("\n📥 [DEAL] Webhook recibido.");

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    if (events.length === 0) return res.status(200).send("OK");

    const dealId = String(events[0].objectId);
    console.log(`📥 [DEAL] ID HubSpot: ${dealId}`);

    // ── PASO 1: Obtener Deal completo desde HubSpot ──────────────────────────
    const fullDeal = await hubspot.getDealById(dealId);
    const props = fullDeal.properties;
    const existingOracleId: string | null =
      props.id_oracle?.value || props.id_oracle || null;
    const currentConfirmation: string | null =
      props.numero_de_reserva?.value || props.numero_de_reserva || null;

    // ── PASO 2: Obtener contactos asociados con etiquetas ────────────────────
    const associations = await hubspot.getAssociatedContacts(dealId);
    if (associations.length === 0) {
      console.warn(`⚠️ [DEAL] ${dealId} no tiene contactos asociados.`);
      return res
        .status(400)
        .json({ error: "El negocio no tiene contactos asociados." });
    }

    // ── PASO 3: Handshake de cada contacto con Oracle ────────────────────────
    const guestProfiles = await Promise.all(
      associations.map(async (assoc: any) => {
        const hsContact = await hubspot.getContactById(assoc.contactId);
        let oracleId = hsContact.id_oracle;

        if (!oracleId) {
          console.log(
            `🆕 [DEAL] Creando perfil faltante para: ${hsContact.firstName}`
          );
          const profileData = mapHubSpotContactToGuestProfile(hsContact);
          oracleId = await oracle.createGuestProfile(profileData);
          await hubspot.updateOracleId(assoc.contactId, oracleId);
        }

        // Determinar si este contacto es el huésped principal
        const isPrimary = assoc.labels.some(
          (l: string) => l.toLowerCase() === "huésped principal"
        );

        return { id: oracleId, isPrimary, contactId: assoc.contactId };
      })
    );

    // Seguridad: si ninguno tiene la etiqueta, el primero es el principal
    if (guestProfiles.length > 0 && !guestProfiles.some((g) => g.isPrimary)) {
      guestProfiles[0]!.isPrimary = true;
      console.log(
        "⚠️ [DEAL] Ningún contacto tenía etiqueta 'huésped principal'. Se asignó el primero."
      );
    }

    // ── PASO 4: Procesar Company (Agencia de viajes) ─────────────────────────
    let travelAgentOracleId: string | undefined = undefined;

    const hsCompany = await hubspot.getCompanyByDealId(dealId);

    if (hsCompany) {
      console.log(
        `🏢 [DEAL] Company encontrada: "${hsCompany.name}" (${hsCompany.tipo_de_empresa})`
      );

      let companyOracleId = hsCompany.id_oracle;

      // Solo crear en Oracle si aún no tiene id_oracle
      if (!companyOracleId) {
        const oracleProfileType = resolveOracleCompanyType(
          hsCompany.tipo_de_empresa
        );
        companyOracleId = await oracle.createCompanyProfile(
          hsCompany.name,
          oracleProfileType
        );

        // Guardar id_oracle en la Company de HubSpot
        await hubspot.updateCompany(hsCompany.id, { id_oracle: companyOracleId });
      } else {
        console.log(
          `ℹ️ [DEAL] Company ya tiene Oracle ID: ${companyOracleId}`
        );
      }

      // Solo vincular a la reserva si es una Agencia de viajes
      if (hsCompany.tipo_de_empresa === "Agencia") {
        travelAgentOracleId = companyOracleId;
        console.log(
          `✈️ [DEAL] Agencia "${hsCompany.name}" se vinculará como TravelAgent en Oracle.`
        );
      }
    } else {
      console.log("ℹ️ [DEAL] Sin Company asociada. Reserva individual.");
    }

    // ── PASO 5: Construir payload y crear/actualizar reserva en Oracle ────────
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
      // ACTUALIZAR reserva existente
      console.log(`🔄 [DEAL] Actualizando reserva Oracle ${existingOracleId}...`);
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
      // CREAR nueva reserva
      console.log(
        `📡 [DEAL] Creando nueva reserva para ${guestProfiles.length} huésped(es)...`
      );
      const createResponse =
        await oracle.createReservationInOracle(oraclePayload);
      internalId = String(createResponse.id);
      rawResponse = createResponse.raw;
    }

    // ── PASO 6: Obtener Confirmation Number (puede requerir un GET extra) ─────
    let confirmationId = findConfirmationId(rawResponse);
    if (!confirmationId) {
      console.log(
        `🔍 [DEAL] Confirmation no hallado en respuesta. Re-consultando ${internalId}...`
      );
      await new Promise((resolve) => setTimeout(resolve, 600));
      const freshRes = await oracle.getReservation(internalId);
      confirmationId = findConfirmationId(freshRes) ?? undefined;
    }

    const finalConfirmation =
      confirmationId || currentConfirmation || internalId;
    console.log(
      `✅ [DEAL] ID Oracle: ${internalId} | Confirmation: ${finalConfirmation}`
    );

    // ── PASO 7: Guardar IDs de vuelta en HubSpot ──────────────────────────────
    // En el Deal
    await hubspot.updateDeal(dealId, {
      id_oracle: internalId,
      numero_de_reserva: String(finalConfirmation),
    });

    // En el Contacto principal (el que tiene isPrimary: true)
    const primaryGuest = guestProfiles.find((g) => g.isPrimary);
    if (primaryGuest) {
      await hubspot.updateContact(primaryGuest.contactId, {
        id_oracle: primaryGuest.id,
        numero_de_reserva: String(finalConfirmation),
      });
    }

    console.log(
      `✨ [DEAL] Éxito: Deal ${dealId} sincronizado con ${guestProfiles.length} huésped(es).`
    );
    return res
      .status(200)
      .json({ success: true, guestsSynced: guestProfiles.length });
  } catch (error: any) {
    console.error("❌ [DEAL] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🔧 RUTA DE EMERGENCIA: Sincronización manual de un Contacto
// GET /sync-to-oracle/:hsId
// Útil para migrar contactos existentes o recuperar sincronizaciones fallidas.
// No se expone en producción como webhook — solo uso manual.
// ============================================================================
app.get("/sync-to-oracle/:hsId", async (req: Request, res: Response) => {
  
  // Cast explícito a string: dentro de una ruta definida req.params.hsId
  // siempre es string, pero @types/express lo infiere como string | string[] | undefined
  const hsId = String(req.params.hsId ?? "");

  // Validar que el ID sea numérico (formato HubSpot)
  if (!hsId || !/^\d+$/.test(hsId)) {
    return res
      .status(400)
      .json({ error: "ID de HubSpot inválido. Debe ser numérico." });
  }

  try {
    const hsContact = await hubspot.getContactById(hsId);

    if (hsContact.id_oracle) {
      return res.json({
        success: true,
        skipped: true,
        existingOracleId: hsContact.id_oracle,
        message: "El contacto ya tiene Oracle ID. Sin acción.",
      });
    }

    const profileData = mapHubSpotContactToGuestProfile(hsContact);
    const newOracleId = await oracle.createGuestProfile(profileData);
    await hubspot.updateOracleId(hsId, newOracleId);

    console.log(
      `✅ [MANUAL] Contacto ${hsId} sincronizado con Oracle ID ${newOracleId}`
    );
    return res.json({ success: true, newOracleId });
  } catch (error: any) {
    console.error("❌ [MANUAL] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🚀 INICIO DEL SERVIDOR
// ============================================================================
app.listen(config.server.port, () => {
  console.log("─────────────────────────────────────────────────");
  console.log(`🚀 PUENTE ONLINE | Puerto: ${config.server.port}`);
  console.log("   Proyecto: Clos Apalta — Sincronización Oracle ↔ HubSpot");
  console.log("   Versión: 2.0.0");
  console.log("─────────────────────────────────────────────────");
  console.log("   Endpoints activos:");
  console.log("   POST /webhook/hubspot/contact");
  console.log("   POST /webhook/hubspot/deal");
  console.log("   GET  /sync-to-oracle/:hsId  (solo uso manual)");
  console.log("─────────────────────────────────────────────────");
});