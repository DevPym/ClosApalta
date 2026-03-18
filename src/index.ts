// 1 - Capa de entrada (index.ts) — recibe webhooks, encola jobs, responde inmediatamente. No tiene lógica de negocio.

import express from "express";
import type { Request, Response } from "express";
import { config } from "./config/index.js";
import { oracle, hubspot } from "./shared/clients.js";
import { mapHubSpotContactToGuestProfile } from "./application/mappers.js";
import { queue } from "./queue/queue.js";
import { startWorker } from "./queue/worker.js";
import { verifyHubSpotSignature } from "./middleware/hubspotSignature.js";

const app = express();

// 1. Indicar a Express que confíe en el proxy (necesario para req.protocol en Railway)
app.set('trust proxy', true);

// 2. Modificar el middleware de JSON para capturar el rawBody
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// ============================================================================
// 🩺 HEALTH CHECK
// ============================================================================
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "online",
    project: "Puente Clos Apalta",
    version: "4.0.0",
    queue: {
      pending: queue.size,
      dead: queue.deadSize,
    },
    endpoints: [
      "POST /webhook/hubspot/contact        (contact.creation | contact.propertyChange)",
      "POST /webhook/hubspot/contact/delete (contact.deletion)",
      "POST /webhook/hubspot/deal           (deal.creation | deal.propertyChange)",
      "POST /webhook/hubspot/deal/delete    (deal.deletion)",
      "POST /webhook/hubspot/company        (company.creation | company.propertyChange)",
      "POST /webhook/hubspot/company/delete (company.deletion)",
      "GET  /sync-to-oracle/:hsId           (sincronización manual de contacto)",
      "GET  /dead-jobs                      (jobs fallidos — diagnóstico)",
      "DELETE /dead-jobs                    (limpiar dead letter store)",
    ],
  });
});

// Reemplaza todos los bloques app.post("/webhook/hubspot/...") por este único bloque:

// ============================================================================
// 📨 WEBHOOK ÚNICO (Dispatcher)
// Target URL en HubSpot: https://TU-DOMINIO.up.railway.app/webhook/hubspot
// ============================================================================
app.post("/webhook/hubspot", verifyHubSpotSignature, (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];

  if (events.length === 0) return res.status(200).send("OK");

  // Procesamos el lote de eventos que envía HubSpot
  for (const event of events) {
    const objectId = String(event.objectId);
    const type = event.subscriptionType; // Ejemplo: 'contact.creation'

    try {
      if (type === "contact.creation" || type === "contact.propertyChange") {
        queue.push("contact", { contactId: objectId });
        console.log(`📥 [Dispatcher] Contacto ${objectId} encolado`);
      }
      else if (type === "contact.deletion") {
        queue.push("delete-contact", { contactId: objectId });
        console.log(`📥 [Dispatcher] Eliminación Contacto ${objectId} encolada`);
      }
      else if (type === "deal.creation" || type === "deal.propertyChange") {
        queue.push("deal", { dealId: objectId });
        console.log(`📥 [Dispatcher] Deal ${objectId} encolado`);
      }
      else if (type === "deal.deletion") {
        queue.push("delete-deal", { dealId: objectId });
        console.log(`📥 [Dispatcher] Cancelación Deal ${objectId} encolada`);
      }
      else if (type === "company.creation" || type === "company.propertyChange") {
        queue.push("company", { companyId: objectId });
        console.log(`📥 [Dispatcher] Company ${objectId} encolada`);
      }
      else if (type === "company.deletion") {
        queue.push("delete-company", { companyId: objectId });
        console.log(`📥 [Dispatcher] Eliminación Company ${objectId} encolada`);
      }
    } catch (err: any) {
      console.error(`❌ [Dispatcher] Error al procesar evento ${type}:`, err.message);
    }
  }

  // Respondemos 200 inmediatamente para cumplir con el límite de 5s de HubSpot
  return res.status(200).json({ received: true, batchSize: events.length });
});

// ============================================================================
// 🔧 RUTA DE EMERGENCIA: Sincronización manual de un Contacto
// GET /sync-to-oracle/:hsId
// No pasa por la cola — se ejecuta de forma síncrona e inmediata.
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
// 💀 DEAD LETTER STORE: Jobs fallidos
// GET    /dead-jobs → lista de jobs que agotaron todos los intentos
// DELETE /dead-jobs → limpia el dead letter store
// ============================================================================
app.get("/dead-jobs", (_req: Request, res: Response) => {
  const deadJobs = queue.getDeadJobs();
  res.json({
    count: deadJobs.length,
    jobs: deadJobs,
  });
});

app.delete("/dead-jobs", (_req: Request, res: Response) => {
  queue.clearDeadJobs();
  res.json({ success: true, message: "Dead jobs limpiados." });
});

// ============================================================================
// 🚀 INICIO DEL SERVIDOR
// ============================================================================
app.listen(config.server.port, () => {
  console.log("─────────────────────────────────────────────────────");
  console.log(`🚀 PUENTE ONLINE | Puerto: ${config.server.port}`);
  console.log("   Proyecto: Clos Apalta — Sincronización Oracle ↔ HubSpot");
  console.log("   Versión: 4.0.0");
  console.log("─────────────────────────────────────────────────────");
  console.log("   Webhooks activos (con verificación de firma):");
  console.log("   POST /webhook/hubspot/contact");
  console.log("   POST /webhook/hubspot/contact/delete");
  console.log("   POST /webhook/hubspot/deal");
  console.log("   POST /webhook/hubspot/deal/delete");
  console.log("   POST /webhook/hubspot/company");
  console.log("   POST /webhook/hubspot/company/delete");
  console.log("   GET  /sync-to-oracle/:hsId  (uso manual)");
  console.log("   GET  /dead-jobs             (diagnóstico)");
  console.log("─────────────────────────────────────────────────────");

  startWorker();
});

