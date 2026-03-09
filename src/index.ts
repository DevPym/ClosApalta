import express from "express";
import type { Request, Response } from "express";
import { config } from "./config/index.js";
import { OracleClient } from "./infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "./infrastructure/hubspot/HubSpotClient.js";
import {
  mapOracleReservation,
  mapOracleToUnified,
} from "./application/mappers.js";

const app = express();
app.use(express.json());

// Clientes e Instancias
const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// Constantes de Eventos HubSpot
const EVENT_CREATION = "contact.creation";
const EVENT_PROPERTY_CHANGE = "contact.propertyChange";
const EVENT_DELETION = "contact.deletion";

// ----------------------------------------------------------------------------------------
// 🩺 HEALTH CHECK (Para monitoreo del servidor)
// ----------------------------------------------------------------------------------------
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "online", project: "Puente Clos Apalta", version: "1.2.0" });
});

// ----------------------------------------------------------------------------------------
// 🟠 WEBHOOK DE HUBSPOT (CRM -> Oracle)
// ----------------------------------------------------------------------------------------
app.post("/webhook/hubspot", async (req: Request, res: Response) => {
  const events = req.body;
  if (!Array.isArray(events)) return res.status(400).send("Formato inválido");

  console.log(`\n📩 [WEBHOOK HUBSPOT] ${events.length} evento(s) recibido(s)`);

  try {
    for (const event of events) {
      const { subscriptionType, objectId, propertyName, propertyValue } = event;

      // 🛡️ PROTECCIÓN INICIAL: Envolvemos Creación y Edición
      // para evitar que un 404 de un contacto borrado detenga todo el proceso.
      try {
        // ✨ 1. CREACIÓN (Handshake inicial)
        if (subscriptionType === EVENT_CREATION) {
          console.log(`🆕 Handshake: Iniciando para HS ${objectId}`);
          const hsData = await hubspot.getContactById(objectId);
          const newOracleId = await oracle.createGuestProfile(hsData);
          await hubspot.updateOracleId(objectId, newOracleId);
        }

        // ✏️ 2. EDICIÓN (Sincronización de cambios)
        else if (subscriptionType === EVENT_PROPERTY_CHANGE) {
          if (propertyName === "id_oracle") continue;

          console.log(`✏️ Cambio detectado: ${propertyName} = ${propertyValue}`);
          const oracleId = await hubspot.getOracleIdFromContact(objectId);

          if (oracleId) {
            const fullContact = await hubspot.getContactById(objectId);
            await oracle.updateGuestProfile(oracleId, {
              firstname: fullContact.firstName,
              lastname: fullContact.lastName
            });
          }
        }
      } catch (innerError: any) {
        // Si el error es un 404, significa que el contacto ya no existe en HS
        if (innerError.message.includes("404")) {
          console.log(`ℹ️ Evento ignorado: El contacto ${objectId} ya no existe en HubSpot.`);
          continue; // Salta al siguiente evento del bucle 'for'
        }
        // Si es otro tipo de error (ej: error 400 de Oracle), lo lanzamos hacia afuera
        throw innerError;
      }

      // 🗑️ 3. BORRADO (Ya tiene su propia protección interna en tu código)
      if (subscriptionType === EVENT_DELETION) {
        console.log(`🗑️ Borrado detectado en HS: ${objectId}. Limpiando...`);
        try {
          const oracleId = await hubspot.getOracleIdFromContact(objectId);
          if (oracleId) {
            await oracle.deleteGuestProfile(oracleId);
            console.log(`✅ Vínculo Oracle ${oracleId} eliminado.`);
          }
        } catch (e: any) {
          console.log(`ℹ️ Finalizado: No se pudo consultar el ID de Oracle porque el contacto ${objectId} ya no existe.`);
        }
      }
    }
    res.status(200).send("EVENTOS_RECIBIDOS");
  } catch (error: any) {
    // Este catch solo atrapará errores críticos o fallos de Oracle que no sean 404 de HS
    console.error("❌ [WEBHOOK HUBSPOT] Error crítico:", error.message);
    res.status(500).send("ERROR_INTERNO");
  }
});

// ----------------------------------------------------------------------------------------
// 🔄 RUTA DE SINCRONIZACIÓN MANUAL (HubSpot -> Oracle)
// ----------------------------------------------------------------------------------------
app.get("/sync-to-oracle/:hsId", async (req: Request, res: Response) => {
  const { hsId } = req.params as { hsId: string };
  console.log(`\n🔄 [MANUAL SYNC] HubSpot ID: ${hsId} -> Oracle`);

  try {
    const hsContact = await hubspot.getContactById(hsId);
    if (!hsContact) return res.status(404).json({ error: "No encontrado en HubSpot" });

    const oracleId = hsContact.id_oracle || await hubspot.getOracleIdFromContact(hsId);

    if (oracleId) {
      console.log(`📌 Actualizando perfil existente: ${oracleId}`);
      await oracle.updateGuestProfile(oracleId, {
        firstname: hsContact.firstName,
        lastname: hsContact.lastName
      });
      res.json({ message: "Sincronizado (Update)", oracleId });
    } else {
      console.log(`📌 Sin vínculo previo. Creando nuevo perfil...`);
      const newOracleId = await oracle.createGuestProfile(hsContact);
      await hubspot.updateOracleId(hsId, newOracleId);
      res.json({ message: "Sincronizado (Create)", oracleId: newOracleId });
    }
  } catch (error: any) {
    console.error("❌ Error en Sync Manual:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------------------
// 🔵 WEBHOOKS DE ORACLE (Oracle -> HubSpot)
// ----------------------------------------------------------------------------------------

// Perfiles
app.post('/webhook/oracle', async (req: Request, res: Response) => {
  console.log('\n🔔 [WEBHOOK ORACLE] ¡Cambio de perfil detectado!');
  try {
    const unifiedContact = mapOracleToUnified(req.body);
    const result = await hubspot.syncContact(unifiedContact);
    res.status(200).json({ success: true, hubspotId: (result as any)?.id });
  } catch (error: any) {
    console.error('❌ [WEBHOOK ORACLE] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reservas
app.post('/webhook/oracle/reservation', async (req: Request, res: Response) => {
  console.log('\n🛎️ [WEBHOOK RESERVAS] ¡Actualización de estadía!');
  try {
    const unifiedRes = mapOracleReservation(req.body);
    await hubspot.syncReservationToContact(unifiedRes);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ [WEBHOOK RESERVAS] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 INICIO DEL SERVIDOR
app.listen(config.server.port, () => {
  console.log("---------------------------------------------------------");
  console.log(`🚀 PUENTE ONLINE | Puerto: ${config.server.port}`);
  console.log(`🛡️ Escudo App ID: ${config.hubspot.appId}`);
  console.log("** Proyecto Clos Apalta - Sincronización Bidireccional **");
  console.log("---------------------------------------------------------");
});