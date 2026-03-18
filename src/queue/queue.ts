// 2 - Capa de cola (queue/) — almacena jobs pendientes y los procesa en segundo plano con reintentos automáticos.

import { randomUUID } from "crypto";

export type JobType =
    | "contact"
    | "deal"
    | "company"
    | "delete-contact"
    | "delete-company"
    | "delete-deal";

export interface Job {
    id: string;
    type: JobType;
    payload: Record<string, any>;
    attempts: number;
    createdAt: Date;
}

export interface DeadJob {
    job: Job;
    error: string;
    failedAt: Date;
}

export class Queue {
    private jobs: Job[] = [];
    private deadJobs: DeadJob[] = [];

    /**
     * Crea y encola un job NUEVO (attempts=0).
     * Si ya existe un job pendiente del mismo tipo y payload, lo omite (deduplicación).
     * Usado por los webhooks al recibir un evento.
     */
    push(type: JobType, payload: Record<string, any>): string {
        // Deduplicación: evitar jobs redundantes para el mismo objeto
        const payloadKey = JSON.stringify(payload);
        const duplicate = this.jobs.find(
            (j) => j.type === type && JSON.stringify(j.payload) === payloadKey
        );
        if (duplicate) {
            console.log(
                `⚡ [Cola] Job duplicado omitido: tipo=${type} payload=${payloadKey}. ` +
                `Ya existe job ${duplicate.id} pendiente.`
            );
            return duplicate.id;
        }

        const id = randomUUID();
        this.jobs.push({ id, type, payload, attempts: 0, createdAt: new Date() });
        console.log(`📬 [Cola] Job ${id} (${type}) encolado. Pendientes: ${this.jobs.length}`);
        return id;
    }

    /**
     * Re-encola un job EXISTENTE conservando su id, attempts y createdAt.
     * Usado por el worker en reintentos — así MAX_ATTEMPTS se respeta.
     *
     * ⚠️ Sin este método, el worker creaba un job nuevo con attempts=0
     * en cada reintento, causando un loop infinito que nunca alcanzaba
     * MAX_ATTEMPTS. Corrección aplicada en v4.1.
     */
    retry(job: Job): void {
        this.jobs.push(job);
        console.log(
            `🔁 [Cola] Job ${job.id} (${job.type}) re-encolado. ` +
            `Intento ${job.attempts} completado. Pendientes: ${this.jobs.length}`
        );
    }

    shift(): Job | undefined {
        return this.jobs.shift();
    }

    /**
     * Registra un job fallido en el dead letter store.
     * Los dead jobs se pueden consultar en GET /dead-jobs.
     */
    addDeadJob(job: Job, error: Error): void {
        this.deadJobs.push({
            job,
            error: error.message,
            failedAt: new Date(),
        });
    }

    getDeadJobs(): DeadJob[] {
        return [...this.deadJobs];
    }

    clearDeadJobs(): void {
        this.deadJobs = [];
        console.log("🧹 [Cola] Dead jobs limpiados.");
    }

    get size(): number {
        return this.jobs.length;
    }

    get deadSize(): number {
        return this.deadJobs.length;
    }
}

export const queue = new Queue();
