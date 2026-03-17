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
      "POST /webhook/hubspot/company  (company.creation | company.propertyChange)",
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
// 🏢 WEBHOOK 3: COMPANY CREADA O ACTUALIZADA
// Trigger: HubSpot → company.creation | company.propertyChange
//
// Patrón idéntico al webhook de contacto y deal:
//   - Respuesta inmediata 200 OK en <1ms
//   - El trabajo real ocurre en src/jobs/processCompany.ts
//   - Reintentos con backoff gestionados por src/queue/worker.ts
//
// Flujo de processCompany:
//   1. Obtener Company completa de HubSpot
//   2. Si id_oracle existe → actualizar perfil en Oracle (PUT /crm/v1/profiles/{id})
//   3. Si no existe        → crear perfil en Oracle (POST /crm/v1/companies)
//   4. Guardar id_oracle devuelto por Oracle de vuelta en HubSpot
// ============================================================================
app.post("/webhook/hubspot/company", (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return res.status(200).send("OK");

  const companyId = String(events[0].objectId);
  const jobId = queue.push("company", { companyId });

  console.log(
    `📥 [Webhook:Company] Company ${companyId} encolada → job ${jobId}`
  );

  // Respuesta inmediata — HubSpot no espera el procesamiento
  return res.status(200).json({ received: true, jobId });
});
// ============================================================================
// 🗑️ WEBHOOK 4: CONTACT ELIMINADO
// Trigger: HubSpot → contact.deletion
//
// ⚠️ DIFERENCIA CRÍTICA respecto a contact.creation / contact.propertyChange:
//   El payload de deletion NO incluye propiedades del objeto (id_oracle, etc.).
//   Solo entrega objectId. El job lee el objeto archivado (archived=true)
//   para recuperar el id_oracle antes de operar en Oracle.
//
// Acción en Oracle:
//   DELETE /crm/v1/profiles/{id_oracle}  → anonimiza el perfil Guest
//   (Oracle no elimina perfiles permanentemente — cumplimiento de auditoría)
// ============================================================================
app.post("/webhook/hubspot/contact/delete", (req: Request, res: Response) => {
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
//
// Acción en Oracle:
//   DELETE /crm/v1/profiles/{id_oracle}  → anonimiza el perfil Company/Agent
//   (No existe DELETE /companies/{id} en la API oficial de Oracle)
// ============================================================================
app.post("/webhook/hubspot/company/delete", (req: Request, res: Response) => {
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
//
// Acción en Oracle:
//   POST /hotels/{hotelId}/reservations/{id_oracle}/cancellations
//   → cancela la reserva (Oracle no permite eliminar reservas confirmadas)
//   → devuelve número de cancelación registrado en logs
// ============================================================================
app.post("/webhook/hubspot/deal/delete", (req: Request, res: Response) => {
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