import { queue } from "./queue.js";
import type { Job } from "./queue.js";
import { processContact, deleteContact } from "../jobs/processContact.js";
import { processDeal, deleteDeal } from "../jobs/processDeal.js";
import { processCompany, deleteCompany } from "../jobs/processCompany.js";

// ============================================================================
// ⚙️ WORKER — Procesador de jobs en segundo plano
//
// Reintentos con backoff exponencial:
//   Intento 1 falla → espera 5s  → intento 2
//   Intento 2 falla → espera 30s → intento 3
//   Intento 3 falla → job muerto, registrado en logs
//
// ⚠️ FIX v4.1: se usa queue.retry(job) en lugar de queue.push(type, payload).
//   queue.push() creaba un job nuevo con attempts=0 en cada reintento,
//   causando un loop infinito. queue.retry() conserva el objeto original
//   con su contador de intentos intacto.
// ============================================================================

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS: Record<number, number> = {
    1: 5_000,
    2: 30_000,
};

async function processNextJob(): Promise<void> {
    const job = queue.shift();
    if (!job) { setTimeout(processNextJob, 500); return; }

    job.attempts++;
    console.log(
        `⚙️ [Worker] Job ${job.id} | tipo: ${job.type} | intento: ${job.attempts}/${MAX_ATTEMPTS}`
    );

    try {
        await dispatch(job);
        console.log(`✅ [Worker] Job ${job.id} completado.`);
    } catch (error: any) {
        console.error(`❌ [Worker] Job ${job.id} falló: ${error.message}`);

        if (job.attempts < MAX_ATTEMPTS) {
            const delayMs = RETRY_DELAYS_MS[job.attempts] ?? 5_000;
            console.log(`🔄 [Worker] Reintentando job ${job.id} en ${delayMs / 1000}s...`);
            // ✅ FIX: usar retry() para conservar attempts y no crear loop infinito
            setTimeout(() => queue.retry(job), delayMs);
        } else {
            markDeadJob(job, error);
        }
    }

    setImmediate(processNextJob);
}

async function dispatch(job: Job): Promise<void> {
    switch (job.type) {
        case "contact": await processContact(job.payload as { contactId: string }); break;
        case "deal": await processDeal(job.payload as { dealId: string }); break;
        case "company": await processCompany(job.payload as { companyId: string }); break;
        case "delete-contact": await deleteContact(job.payload as { contactId: string }); break;
        case "delete-company": await deleteCompany(job.payload as { companyId: string }); break;
        case "delete-deal": await deleteDeal(job.payload as { dealId: string }); break;
        default:
            console.error(`❌ [Worker] Tipo de job desconocido: ${(job as any).type}`);
    }
}

function markDeadJob(job: Job, error: any): void {
    console.error("💀 [Worker] ================================");
    console.error(`💀 [Worker] Job ${job.id} agotó ${MAX_ATTEMPTS} intentos.`);
    console.error(`💀 [Worker] Tipo:    ${job.type}`);
    console.error(`💀 [Worker] Payload: ${JSON.stringify(job.payload)}`);
    console.error(`💀 [Worker] Error:   ${error.message}`);
    console.error(`💀 [Worker] Creado:  ${job.createdAt.toISOString()}`);
    console.error("💀 [Worker] ================================");
    // Guardar en dead letter store para diagnóstico vía GET /dead-jobs
    queue.addDeadJob(job, error);
}

export function startWorker(): void {
    console.log("⚙️ [Worker] Iniciado. Escuchando la cola en segundo plano.");
    processNextJob();
}