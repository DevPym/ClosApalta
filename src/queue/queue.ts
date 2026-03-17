// 2 - Capa de cola (queue/) — almacena jobs pendientes y los procesa en segundo plano con reintentos automáticos. No sabe nada de HubSpot ni Oracle.

import { randomUUID } from "crypto";

// ============================================================================
// 📬 COLA EN MEMORIA
// Almacena jobs pendientes en un array ordenado por llegada (FIFO).
// No requiere dependencias externas ni base de datos.
// Limitación conocida: los jobs pendientes se pierden si el proceso
// se reinicia. Para el volumen actual (10–50 eventos/día) es aceptable.
// Si el entorno de despliegue tiene reinicios frecuentes (Render free tier),
// considerar agregar persistencia con SQLite.
// ============================================================================

// ── Cambio: se agrega "company" al union type ────────────────────────────────
// Requiere actualizar dispatch() en worker.ts y agregar processCompany.ts
export type JobType = "contact" | "deal" | "company";

export interface Job {
    id: string;
    type: JobType;
    payload: Record<string, any>;
    attempts: number;         // cuántas veces se intentó procesar
    createdAt: Date;
}

export class Queue {
    private jobs: Job[] = [];

    /**
     * Agrega un nuevo job al final de la cola.
     * Retorna el ID del job para trazabilidad en los logs.
     */
    push(type: JobType, payload: Record<string, any>): string {
        const id = randomUUID();
        this.jobs.push({ id, type, payload, attempts: 0, createdAt: new Date() });
        console.log(
            `📬 [Cola] Job ${id} (${type}) encolado. Pendientes: ${this.jobs.length}`
        );
        return id;
    }

    /**
     * Extrae y retorna el primer job de la cola.
     * Retorna undefined si la cola está vacía.
     */
    shift(): Job | undefined {
        return this.jobs.shift();
    }

    /**
     * Devuelve el número de jobs pendientes.
     */
    get size(): number {
        return this.jobs.length;
    }
}

// Instancia única compartida entre index.ts y worker.ts
// Un solo objeto en memoria — no hay concurrencia porque Node.js es single-thread.
export const queue = new Queue();