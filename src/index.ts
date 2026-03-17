// 1 - Capa de entrada (index.ts) — recibe webhooks, encola jobs, responde inmediatamente. No tiene lógica de negocio.



import express from "express";
import type { Request, Response } from "express";
import { config } from "./config/index.js";
import { OracleClient } from "./infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "./infrastructure/hubspot/HubSpotClient.js";
import { mapHubSpotContactToGuestProfile } from "./application/mappers.js";
import { queue } from "./queue/queue.js";
import { startWorker } from "./queue/worker.js";

const app = express();
app.use(express.json());

// Instancias para la ruta de emergencia /sync-to-oracle
const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// ============================================================================
// 🩺 HEALTH CHECK
// ============================================================================
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "online",
    project: "Puente Clos Apalta",
    version: "3.0.0",
    queue: { pending: queue.size },
    endpoints: [
      "POST /webhook/hubspot/contact  (contact.creation | contact.propertyChange)",
      "POST /webhook/hubspot/deal     (deal.creation | deal.propertyChange)",
      "GET  /sync-to-oracle/:hsId     (solo uso manual)",
    ],
  });
});

// ============================================================================
// 👤 WEBHOOK 1: CONTACTO CREADO O ACTUALIZADO
// Trigger: HubSpot → contact.creation | contact.propertyChange
//
// ANTES: hacía todo el trabajo aquí (async, 30+ líneas, podía tardar >5s)
// AHORA: encola el job y responde 200 OK en <1ms
//        El trabajo real ocurre en src/jobs/processContact.ts
// ============================================================================
app.post("/webhook/hubspot/contact", (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const contactId = String(events[0].objectId);
  const jobId = queue.push("contact", { contactId });

  console.log(
    `📥 [Webhook:Contact] Contacto ${contactId} encolado → job ${jobId}`
  );

  // Respuesta inmediata — HubSpot no espera el procesamiento
  return res.status(200).json({ received: true, jobId });
});

// ============================================================================
// 🏨 WEBHOOK 2: DEAL CREADO O ACTUALIZADO
// Trigger: HubSpot → deal.creation | deal.propertyChange
//
// ANTES: hacía todo el trabajo aquí (async, 100+ líneas, podía tardar >5s)
// AHORA: encola el job y responde 200 OK en <1ms
//        El trabajo real ocurre en src/jobs/processDeal.ts
// ============================================================================
app.post("/webhook/hubspot/deal", (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const dealId = String(events[0].objectId);
  const jobId = queue.push("deal", { dealId });

  console.log(
    `📥 [Webhook:Deal] Deal ${dealId} encolado → job ${jobId}`
  );

  // Respuesta inmediata — HubSpot no espera el procesamiento
  return res.status(200).json({ received: true, jobId });
});

// ============================================================================
// 🔧 RUTA DE EMERGENCIA: Sincronización manual de un Contacto
// GET /sync-to-oracle/:hsId
// No pasa por la cola — se ejecuta de forma síncrona e inmediata.
// Útil para migrar contactos existentes o recuperar sincronizaciones fallidas.
// ============================================================================
app.get("/sync-to-oracle/:hsId", async (req: Request, res: Response) => {
  const hsId = String(req.params.hsId ?? "");

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
      `✅ [Manual] Contacto ${hsId} → Oracle ${newOracleId}`
    );
    return res.json({ success: true, newOracleId });
  } catch (error: any) {
    console.error("❌ [Manual] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🚀 INICIO DEL SERVIDOR
// ============================================================================
app.listen(config.server.port, () => {
  console.log("─────────────────────────────────────────────────────");
  console.log(`🚀 PUENTE ONLINE | Puerto: ${config.server.port}`);
  console.log("   Proyecto: Clos Apalta — Sincronización Oracle ↔ HubSpot");
  console.log("   Versión: 3.0.0");
  console.log("─────────────────────────────────────────────────────");
  console.log("   Endpoints activos:");
  console.log("   POST /webhook/hubspot/contact");
  console.log("   POST /webhook/hubspot/deal");
  console.log("   GET  /sync-to-oracle/:hsId  (solo uso manual)");
  console.log("─────────────────────────────────────────────────────");

  // Iniciar el worker — procesa la cola en segundo plano
  // dentro del mismo proceso Node.js
  startWorker();
});