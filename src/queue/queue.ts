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

export class Queue {
    private jobs: Job[] = [];

    /**
     * Crea y encola un job NUEVO (attempts=0).
     * Usado por los webhooks al recibir un evento.
     */
    push(type: JobType, payload: Record<string, any>): string {
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

    get size(): number {
        return this.jobs.length;
    }
}

export const queue = new Queue();