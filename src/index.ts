import express from "express";
import type { Request, Response } from "express";
import { config } from "./config/index.js";
import { OracleClient } from "./infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "./infrastructure/hubspot/HubSpotClient.js";
import {
  mapOracleToUnified,
  mapHubSpotReservationToOracle
} from "./application/mappers.js";
import { OracleStreamer } from "./infrastructure/oracle/OracleStreamer.js";

const app = express();
app.use(express.json());

// Clientes e Instancias
const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// 🔥 INICIALIZAR EL ESCUCHADOR DE WEBSOCKETS (OHIP Streaming)
const oracleStreamer = new OracleStreamer(oracle, async (oracleEventData) => {
  try {
    const unifiedContact = mapOracleToUnified(oracleEventData);
    await hubspot.syncContact(unifiedContact);
    console.log(`✅ [Streamer] Contacto sincronizado a HubSpot.`);
  } catch (error: any) {
    console.error("❌ [Streamer] Error sincronizando evento:", error.message);
  }
});

// oracleStreamer.connect(); // Activar cuando el ticket de Oracle esté listo

// ----------------------------------------------------------------------------------------
// 🕵️ FUNCIÓN RASTREADORA UNIVERSAL
// Busca el Confirmation Number (9 dígitos) en cualquier rincón del JSON de Oracle
// ----------------------------------------------------------------------------------------
function findConfirmationId(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findConfirmationId(item);
      if (found) return found;
    }
  }
  if (obj.type?.toString().toUpperCase() === 'CONFIRMATION' && obj.id) {
    return String(obj.id);
  }
  for (const key in obj) {
    const found = findConfirmationId(obj[key]);
    if (found) return found;
  }
  return undefined;
}

// ----------------------------------------------------------------------------------------
// 🩺 HEALTH CHECK
// ----------------------------------------------------------------------------------------
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "online", project: "Puente Clos Apalta", version: "1.5.0" });
});

// ----------------------------------------------------------------------------------------
// 🟠 WEBHOOK DE RESERVAS (DEALS) - CREACIÓN Y ACTUALIZACIÓN
// ----------------------------------------------------------------------------------------
app.post("/webhook/hubspot/deal", async (req: Request, res: Response) => {
  console.log("\n📥 [RECIBIDO] Petición de Negocio Multi-Huésped...");
  try {
    const payload = req.body;
    if (!payload.objectId) return res.status(400).json({ error: "Falta objectId" });
    const dealId = String(payload.objectId);
    const props = payload.properties;
    // 🕵️ Datos previos en HubSpot
    const existingOracleId = props.id_oracle?.value || props.id_oracle;
    const currentConfirmation = props.numero_de_reserva?.value || props.numero_de_reserva;
    // 🔍 1. Buscar TODOS los contactos asociados con sus etiquetas
    const associations = await hubspot.getAssociatedContacts(dealId);
    if (associations.length === 0) {
      console.warn(`⚠️ Negocio ${dealId} no tiene contactos asociados.`);
      return res.status(400).json({ error: "El negocio no tiene contactos asociados." });
    }
    // 🔍 2. HANDSHAKE MULTIPLE: Asegurar que cada contacto tenga ID en Oracle
    // 'assoc' está tipado correctamente desde HubSpotClient
    const guestProfiles = await Promise.all(associations.map(async (assoc: any) => {
      const hsContact = await hubspot.getContactById(assoc.contactId);
      let oracleId = hsContact.id_oracle;
      if (!oracleId) {
        console.log(`🆕 Creando perfil faltante para: ${hsContact.firstName}`);
        oracleId = await oracle.createGuestProfile(hsContact);
        await hubspot.updateOracleId(assoc.contactId, oracleId);
      }
      // Validamos el label: Buscamos si alguno coincide con "huésped principal"
      const isPrimary = assoc.labels.some((l: string) =>
        l.toLowerCase() === "huésped principal"
      );
      return { id: oracleId, isPrimary };
    }));
    // 🛡️ Validación de seguridad: Si nadie tiene la etiqueta, el primero es el principal
    if (guestProfiles.length > 0 && !guestProfiles.some(g => g.isPrimary)) {
      const firstGuest = guestProfiles[0];
      if (firstGuest) {
        firstGuest.isPrimary = true;
      }
    }
    // 🏨 3. Mapear datos con la lista de perfiles (Primary + Acompañantes)
    const oracleJsonPayload = mapHubSpotReservationToOracle(props, guestProfiles);
    let internalId: string;
    let rawResponse: any;
    // 🚀 4. CREAR O ACTUALIZAR
    if (existingOracleId && existingOracleId !== "" && existingOracleId !== "undefined") {
      console.log(`🔄 Actualizando reserva existente ${existingOracleId}...`);
      const updatePayload = {
        reservation: oracleJsonPayload.reservations.reservation[0]
      };
      rawResponse = await oracle.updateReservation(String(existingOracleId), updatePayload);
      internalId = String(existingOracleId);
    } else {
      console.log(`📡 Creando NUEVA reserva en Oracle para ${guestProfiles.length} personas...`);
      const createResponse = await oracle.createReservationInOracle(oracleJsonPayload);
      internalId = String(createResponse.id);
      rawResponse = createResponse.raw;
    }
    // 🕵️ 5. RASTREADOR Y RE-INTENTO (Para capturar los 9 dígitos)
    let confirmationId = findConfirmationId(rawResponse);
    if (!confirmationId) {
      console.log(`🔍 No hallado a la primera. Re-consultando reserva ${internalId}...`);
      await new Promise(resolve => setTimeout(resolve, 600));
      const freshRes = await oracle.getReservation(internalId);
      confirmationId = findConfirmationId(freshRes);
    }
    console.log(`✅ ID Interno: ${internalId} | Confirmation: ${confirmationId || 'Mantiene'}`);
    // 🔄 6. ACTUALIZACIÓN FINAL EN HUBSPOT
    await hubspot.updateDeal(dealId, {
      "id_oracle": internalId,
      "numero_de_reserva": String(confirmationId || currentConfirmation || internalId),
      "id_synxis": "SINCRO_MULTI_PAX_OK"
    });
    console.log(`✨ ÉXITO: Negocio ${dealId} sincronizado con ${guestProfiles.length} huéspedes.`);
    return res.status(200).json({ success: true, guestsSynced: guestProfiles.length });
  } catch (error: any) {
    console.error("❌ Error en Multi-Guest Deal Webhook:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------------------
// 🔄 OTRAS RUTAS (PERFILES Y SYNC MANUAL)
// ----------------------------------------------------------------------------------------
app.get("/sync-to-oracle/:hsId", async (req: Request, res: Response) => {
  try {
    const hsId = req.params.hsId;
    if (!hsId) return res.status(400).json({ error: "Falta ID" });
    if (!hsId || typeof hsId !== "string") {
      return res.status(400).json({ error: "ID de HubSpot no válido o mal formateado" });
    }
    const hsContact = await hubspot.getContactById(hsId);
    const newOracleId = await oracle.createGuestProfile(hsContact);
    await hubspot.updateOracleId(hsId, newOracleId);
    res.json({ success: true, newOracleId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook/oracle', async (req: Request, res: Response) => {
  try {
    const unifiedContact = mapOracleToUnified(req.body);
    await hubspot.syncContact(unifiedContact);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/webhook/oracle/reservation", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const profileId = data.profileId || data.guestDetails?.profileId;
    const contact = await hubspot.findContactByOracleId(String(profileId));
    if (contact) {
      await hubspot.updateContact(contact.id, {
        "numero_de_reserva": String(data.confirmationId || data.reservationId),
        "estado_de_reserva": data.status || "Reserved"
      });
    }
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Error en el puente" });
  }
});

// 🚀 INICIO
app.listen(config.server.port, () => {
  console.log("---------------------------------------------------------");
  console.log(`🚀 PUENTE ONLINE | Puerto: ${config.server.port}`);
  console.log("** Proyecto Clos Apalta - Sincronización Bidireccional **");
  console.log("---------------------------------------------------------");
});