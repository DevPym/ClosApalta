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
app.use(express.json());

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

// ============================================================================
// 👤 WEBHOOK 1: CONTACTO CREADO O ACTUALIZADO
// Trigger: HubSpot → contact.creation | contact.propertyChange
// ============================================================================
app.post("/webhook/hubspot/contact", verifyHubSpotSignature, (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const contactId = String(events[0].objectId);
  const jobId = queue.push("contact", { contactId });

  console.log(
    `📥 [Webhook:Contact] Contacto ${contactId} encolado → job ${jobId}`
  );

  return res.status(200).json({ received: true, jobId });
});

// ============================================================================
// 🏨 WEBHOOK 2: DEAL CREADO O ACTUALIZADO
// Trigger: HubSpot → deal.creation | deal.propertyChange
// ============================================================================
app.post("/webhook/hubspot/deal", verifyHubSpotSignature, (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const dealId = String(events[0].objectId);
  const jobId = queue.push("deal", { dealId });

  console.log(
    `📥 [Webhook:Deal] Deal ${dealId} encolado → job ${jobId}`
  );

  return res.status(200).json({ received: true, jobId });
});

// ============================================================================
// 🏢 WEBHOOK 3: COMPANY CREADA O ACTUALIZADA
// Trigger: HubSpot → company.creation | company.propertyChange
// ============================================================================
app.post("/webhook/hubspot/company", verifyHubSpotSignature, (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const companyId = String(events[0].objectId);
  const jobId = queue.push("company", { companyId });

  console.log(
    `📥 [Webhook:Company] Company ${companyId} encolada → job ${jobId}`
  );

  return res.status(200).json({ received: true, jobId });
});

// ============================================================================
// 🗑️ WEBHOOK 4: CONTACT ELIMINADO
// Trigger: HubSpot → contact.deletion
//
// ⚠️ El payload de deletion NO incluye propiedades del objeto (id_oracle, etc.).
//    Solo entrega objectId. El job lee el objeto archivado (archived=true)
//    para recuperar el id_oracle antes de operar en Oracle.
// ============================================================================
app.post("/webhook/hubspot/contact/delete", verifyHubSpotSignature, (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const contactId = String(events[0].objectId);
  const jobId = queue.push("delete-contact", { contactId });

  console.log(
    `📥 [Webhook:DeleteContact] Contact ${contactId} encolado para eliminación → job ${jobId}`
  );

  return res.status(200).json({ received: true, jobId });
});

// ============================================================================
// 🗑️ WEBHOOK 5: COMPANY ELIMINADA
// Trigger: HubSpot → company.deletion
// ============================================================================
app.post("/webhook/hubspot/company/delete", verifyHubSpotSignature, (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const companyId = String(events[0].objectId);
  const jobId = queue.push("delete-company", { companyId });

  console.log(
    `📥 [Webhook:DeleteCompany] Company ${companyId} encolada para eliminación → job ${jobId}`
  );

  return res.status(200).json({ received: true, jobId });
});

// ============================================================================
// 🗑️ WEBHOOK 6: DEAL ELIMINADO
// Trigger: HubSpot → deal.deletion
// ============================================================================
app.post("/webhook/hubspot/deal/delete", verifyHubSpotSignature, (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const dealId = String(events[0].objectId);
  const jobId = queue.push("delete-deal", { dealId });

  console.log(
    `📥 [Webhook:DeleteDeal] Deal ${dealId} encolado para cancelación → job ${jobId}`
  );

  return res.status(200).json({ received: true, jobId });
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
