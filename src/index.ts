import express from "express";
import type { Request, Response } from "express";
import { config } from "./config/index.js";
import { OracleClient } from "./infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "./infrastructure/hubspot/HubSpotClient.js";
import { mapOracleToUnified, mapHubSpotReservationToOracle } from "./application/mappers.js";
import { OracleStreamer } from "./infrastructure/oracle/OracleStreamer.js";
import type { GuestProfile } from "./domain/types.js";

const app = express();
app.use(express.json());



// ============================================================================
// Servidor principal, rutas HTTP y lógica de negocio
// ============================================================================

// ============================================================================
// Clientes e instancias
// ============================================================================
const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// 🔥 Escuchador WebSocket (OHIP Streaming) — activar cuando el ticket de Oracle esté listo
const oracleStreamer = new OracleStreamer(oracle, async (oracleEventData) => {
  try {
    const unifiedContact = mapOracleToUnified(oracleEventData);
    await hubspot.syncContact(unifiedContact);
    console.log(`✅ [Streamer] Contacto sincronizado a HubSpot.`);
  } catch (error: any) {
    console.error("❌ [Streamer] Error sincronizando evento:", error.message);
  }
});

// oracleStreamer.connect(); // ← Descomentar cuando el ticket de Oracle esté listo

// ============================================================================
// 🕵️ FUNCIÓN RASTREADORA
// Busca el Confirmation Number (9 dígitos) en cualquier nivel del JSON de Oracle.
// ============================================================================
function findConfirmationId(obj: unknown): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findConfirmationId(item);
      if (found) return found;
    }
    return undefined;
  }

  const record = obj as Record<string, unknown>;
  if (String(record['type'] ?? "").toUpperCase() === 'CONFIRMATION' && record['id']) {
    return String(record['id']);
  }

  for (const key in record) {
    const found = findConfirmationId(record[key]);
    if (found) return found;
  }

  return undefined;
}

// ============================================================================
// 🩺 HEALTH CHECK
// ============================================================================
app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "online", project: "Puente Clos Apalta", version: "1.6.0" });
});

// ============================================================================
// 🟠 WEBHOOK DE RESERVAS (DEALS) — CREACIÓN Y ACTUALIZACIÓN
// ============================================================================
app.post("/webhook/hubspot/deal", async (req: Request, res: Response) => {
  console.log("\n📥 [RECIBIDO] Petición de Negocio Multi-Huésped...");

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    if (events.length === 0) {
      res.status(200).send("OK");
      return;
    }

    const dealId = String(events[0].objectId);
    console.log(`📥 [Deal] Procesando Negocio ${dealId}...`);

    // 1. Descargamos la ficha fresca y completa del Negocio desde HubSpot
    const fullDeal = await hubspot.getDealById(dealId);
    const props = fullDeal.properties;

    const existingOracleId = props['id_oracle'];
    const currentConfirmation = props['numero_de_reserva'];

    // 2. Buscar TODOS los contactos asociados con sus etiquetas
    const associations = await hubspot.getAssociatedContacts(dealId);
    if (associations.length === 0) {
      console.warn(`⚠️ [Deal] Negocio ${dealId} no tiene contactos asociados.`);
      res.status(400).json({ error: "El negocio no tiene contactos asociados." });
      return;
    }

    // 3. HANDSHAKE MÚLTIPLE: aseguramos que cada contacto tenga ID en Oracle
    const guestProfiles: GuestProfile[] = await Promise.all(
      associations.map(async (assoc) => {
        const hsContact = await hubspot.getContactById(assoc.contactId);
        let oracleId = hsContact.id_oracle;

        if (!oracleId) {
          console.log(`🆕 [Deal] Creando perfil faltante para: ${hsContact.firstName}`);
          oracleId = await oracle.createGuestProfile(hsContact);
          await hubspot.updateOracleId(assoc.contactId, oracleId);
        }

        const isPrimary = assoc.labels.some(
          (l) => l.toLowerCase() === "huésped principal"
        );
        return { id: oracleId, isPrimary };
      })
    );

    // 🛡️ Seguridad: si ninguno tiene la etiqueta, el primero es el principal
    const hasPrimary = guestProfiles.some((g) => g.isPrimary);
    if (!hasPrimary && guestProfiles.length > 0) {
      // El operador ! es seguro aquí porque ya validamos guestProfiles.length > 0
      guestProfiles[0]!.isPrimary = true;
    }

    // 4. Mapear datos con la lista de perfiles (Primary + Acompañantes)
    const oracleJsonPayload = mapHubSpotReservationToOracle(props, guestProfiles);
    console.log("📤 [Debug] Payload enviado a Oracle:", JSON.stringify(oracleJsonPayload, null, 2));

    let internalId: string;
    let rawResponse: any;

    // 5. CREAR O ACTUALIZAR en Oracle
    const isValidOracleId = existingOracleId &&
      existingOracleId !== "" &&
      existingOracleId !== "undefined";

    if (isValidOracleId) {
      console.log(`🔄 [Deal] Actualizando reserva existente ${existingOracleId}...`);

      // PUT: body es { reservations: [...] } — array directo (confirmado en ApiOracleReservations.json)
      const updatePayload = {
        reservations: [{
          reservationIdList: [{ type: "Reservation", id: String(existingOracleId) }],
          ...oracleJsonPayload.reservations.reservation[0],
        }],
      };

      rawResponse = await oracle.updateReservation(String(existingOracleId), updatePayload);
      internalId = String(existingOracleId);

    } else {
      console.log(`📡 [Deal] Creando NUEVA reserva para ${guestProfiles.length} huésped(es)...`);
      const createResponse = await oracle.createReservationInOracle(oracleJsonPayload);
      internalId = String(createResponse.id);
      rawResponse = createResponse.raw;
    }

    // 6. RASTREADOR: captura el Confirmation Number (9 dígitos)
    let confirmationId = findConfirmationId(rawResponse);
    if (!confirmationId) {
      console.log(`🔍 [Deal] ID de confirmación no hallado. Re-consultando reserva ${internalId}...`);
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      const freshRes = await oracle.getReservation(internalId);
      confirmationId = findConfirmationId(freshRes);
    }

    console.log(`✅ [Deal] ID Interno: ${internalId} | Confirmation: ${confirmationId ?? 'Sin cambio'}`);

    // 7. ACTUALIZACIÓN FINAL en HubSpot
    await hubspot.updateDeal(dealId, {
      id_oracle: internalId,
      // ✅ FIX #4: Corregido el typo "numero_de_reserva_" (tenía un guión bajo extra)
      numero_de_reserva: String(confirmationId ?? currentConfirmation ?? internalId),
      id_synxis: "SINCRO_MULTI_PAX_OK",
    });

    console.log(`✨ [Deal] ÉXITO: Negocio ${dealId} sincronizado (${guestProfiles.length} huésped(es)).`);
    res.status(200).json({ success: true, guestsSynced: guestProfiles.length });

  } catch (error: any) {
    console.error("❌ [Deal] Error en webhook:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🔄 SYNC MANUAL: HubSpot → Oracle (por ID de contacto)
// ============================================================================
app.get("/sync-to-oracle/:hsId", async (req: Request, res: Response) => {
  // ✅ FIX #9: Unificada la validación en una sola guarda (era redundante)
  const hsId = req.params.hsId;
  if (!hsId || typeof hsId !== "string") {
    res.status(400).json({ error: "ID de HubSpot no válido o ausente." });
    return;
  }

  try {
    const hsContact = await hubspot.getContactById(hsId);
    const newOracleId = await oracle.createGuestProfile(hsContact);
    await hubspot.updateOracleId(hsId, newOracleId);
    res.json({ success: true, newOracleId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🔄 WEBHOOK: Oracle → HubSpot (perfil)
// ============================================================================
app.post('/webhook/oracle', async (req: Request, res: Response) => {
  try {
    const unifiedContact = mapOracleToUnified(req.body);
    await hubspot.syncContact(unifiedContact);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🔄 WEBHOOK: Oracle → HubSpot (reserva)
// ============================================================================
app.post("/webhook/oracle/reservation", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const profileId = String(data.profileId ?? data.guestDetails?.profileId ?? "");

    if (!profileId) {
      res.status(400).json({ error: "profileId ausente en el payload." });
      return;
    }

    const contact = await hubspot.findContactByOracleId(profileId);
    if (contact) {
      await hubspot.updateContact(contact.id, { id_oracle: profileId });
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("❌ [Webhook Oracle/Reserva] Error:", error.message);
    res.status(500).json({ error: "Error en el puente" });
  }
});

// ============================================================================
// 🚀 INICIO
// ============================================================================
app.listen(config.server.port, () => {
  console.log("---------------------------------------------------------");
  console.log(`🚀 PUENTE ONLINE | Puerto: ${config.server.port}`);
  console.log("** Proyecto Clos Apalta - Sincronización Bidireccional **");
  console.log("---------------------------------------------------------");
});

// Exportado solo para uso futuro en tests
export { oracleStreamer };