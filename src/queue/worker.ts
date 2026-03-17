import { queue } from "./queue.js";
import type { Job } from "./queue.js";
import { processContact } from "../jobs/processContact.js";
import { processDeal } from "../jobs/processDeal.js";

// ============================================================================
// ⚙️ WORKER — Procesador de jobs en segundo plano
//
// Corre dentro del mismo proceso Node.js que Express.
// Node.js es single-thread: el worker y Express comparten el mismo hilo,
// coordinados por el event loop. setImmediate() cede el control al event loop
// después de cada job, permitiendo que Express siga recibiendo webhooks
// sin bloquearse.
//
// Reintentos con backoff exponencial:
//   Intento 1 falla → espera 5s  → intento 2
//   Intento 2 falla → espera 30s → intento 3
//   Intento 3 falla → job muerto, registrado en log de errores
// ============================================================================

const MAX_ATTEMPTS = 3;

// Tiempos de espera entre reintentos (en milisegundos)
const RETRY_DELAYS_MS: Record<number, number> = {
    1: 5_000,   // primer fallo  → esperar 5 segundos
    2: 30_000,  // segundo fallo → esperar 30 segundos
};

/**
 * Procesa el siguiente job disponible en la cola.
 * Se llama a sí misma recursivamente mediante setImmediate o setTimeout,
 * nunca bloquea el event loop de Node.js.
 */
async function processNextJob(): Promise<void> {
    const job = queue.shift();

    if (!job) {
        // Cola vacía — revisar de nuevo en 500ms
        setTimeout(processNextJob, 500);
        return;
    }

    job.attempts++;
    console.log(
        `⚙️ [Worker] Procesando job ${job.id} | tipo: ${job.type} | intento: ${job.attempts}/${MAX_ATTEMPTS}`
    );

    try {
        await dispatch(job);
        console.log(`✅ [Worker] Job ${job.id} completado con éxito.`);
    } catch (error: any) {
        console.error(
            `❌ [Worker] Job ${job.id} falló en intento ${job.attempts}: ${error.message}`
        );

        if (job.attempts < MAX_ATTEMPTS) {
            const delayMs = RETRY_DELAYS_MS[job.attempts] ?? 5_000;
            console.log(
                `🔄 [Worker] Reintentando job ${job.id} en ${delayMs / 1000}s...`
            );
            // Devolver el job a la cola después del delay con el mismo objeto
            // (conserva job.attempts para el conteo correcto)
            setTimeout(() => queue.push(job.type, job.payload), delayMs);
        } else {
            // Job agotó todos los reintentos — registrar para revisión manual
            logDeadJob(job, error);
        }
    }

    // Ceder el control al event loop antes del siguiente job
    setImmediate(processNextJob);
}

/**
 * Despacha el job al handler correcto según su tipo.
 */
async function dispatch(job: Job): Promise<void> {
    switch (job.type) {
        case "contact":
            await processContact(job.payload as { contactId: string });
            break;
        case "deal":
            await processDeal(job.payload as { dealId: string });
            break;
        default:
            // TypeScript garantiza que job.type es "contact" | "deal",
            // pero si llegara un valor inesperado lo registramos y lo descartamos.
            console.error(`❌ [Worker] Tipo de job desconocido: ${(job as any).type}`);
    }
}

/**
 * Registra un job muerto (agotó reintentos) en los logs.
 * En el futuro se puede extender para enviar una alerta por email o Slack.
 */
function logDeadJob(job: Job, error: any): void {
    console.error("💀 [Worker] ================================");
    console.error(`💀 [Worker] Job ${job.id} agotó ${MAX_ATTEMPTS} intentos.`);
    console.error(`💀 [Worker] Tipo:    ${job.type}`);
    console.error(`💀 [Worker] Payload: ${JSON.stringify(job.payload)}`);
    console.error(`💀 [Worker] Error:   ${error.message}`);
    console.error(`💀 [Worker] Creado:  ${job.createdAt.toISOString()}`);
    console.error("💀 [Worker] Acción requerida: revisar logs y usar");
    console.error(`💀 [Worker]   GET /sync-to-oracle/:id para resinc manual.`);
    console.error("💀 [Worker] ================================");
}

/**
 * Inicia el worker. Debe llamarse una sola vez al arrancar el servidor.
 * Ver src/index.ts → app.listen() callback.
 */
export function startWorker(): void {
    console.log("⚙️ [Worker] Iniciado. Escuchando la cola en segundo plano.");
    processNextJob();
}