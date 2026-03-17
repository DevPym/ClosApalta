/**
 * src/infrastructure/oracle/OracleStreamer.ts
 * 
 * 4.3 - Capa de infraestructura (infrastructure/) — contiene adaptadores específicos para Oracle Streaming API. No tiene lógica de negocio, solo conexión WebSocket y manejo de mensajes.
 *
 * ⚠️  MÓDULO INACTIVO — No instanciar ni importar desde index.ts.
 *
 * Propósito: Conexión WebSocket con Oracle OHIP Streaming API para recibir
 * eventos de perfiles y reservas en tiempo real (GraphQL-WS protocol).
 *
 * Estado: Pendiente de activación. Oracle Streaming API requiere un ticket
 * de habilitación separado en el portal OHIP. Una vez habilitado:
 *
 *   1. Agregar en src/index.ts:
 *        import { OracleStreamer } from "./infrastructure/oracle/OracleStreamer.js";
 *        import { processContact } from "./jobs/processContact.js";
 *
 *   2. Instanciar después de crear `oracle`:
 *        const streamer = new OracleStreamer(oracle, async (data) => {
 *          queue.push("contact", { contactId: data.profileIdList?.[0]?.id });
 *        });
 *
 *   3. Activar en app.listen():
 *        streamer.connect();
 *
 * TODO: Implementar reconexión automática con backoff exponencial en
 *       el handler ws.on("close").
 */

import WebSocket from "ws";
import crypto from "crypto";
import { config } from "../../config/index.js";
import { OracleClient } from "./OracleClient.js";

export class OracleStreamer {
    private ws: WebSocket | null = null;
    private readonly oracleClient: OracleClient;
    private pingInterval: NodeJS.Timeout | null = null;
    private readonly onMessageCallback: (event: any) => void;

    constructor(oracleClient: OracleClient, onMessageCallback: (event: any) => void) {
        this.oracleClient = oracleClient;
        this.onMessageCallback = onMessageCallback;
    }

    // 🔐 Según especificación OHIP: el AppKey se envía como hash SHA256 en la URL
    private getHashedAppKey(): string {
        return crypto.createHash("sha256")
            .update(config.oracle.appKey)
            .digest("hex")
            .toLowerCase();
    }

    async connect(): Promise<void> {
        console.log("🔌 [OracleStreamer] Iniciando conexión WebSocket...");

        try {
            await this.oracleClient.authenticate();
            const token = this.oracleClient.getAccessToken();

            if (!token) {
                throw new Error("[OracleStreamer] No se pudo obtener el token de acceso.");
            }

            const wssBaseUrl = config.oracle.baseUrl.replace("https://", "wss://");
            const streamUrl = `${wssBaseUrl}/streaming/v1?appKey=${this.getHashedAppKey()}`;

            this.ws = new WebSocket(streamUrl, "graphql-transport-ws", {
                headers: { Authorization: `Bearer ${token}` },
            });

            this.ws.on("open", () => {
                console.log("✅ [OracleStreamer] Conexión abierta. Iniciando handshake GraphQL...");
                this.ws?.send(JSON.stringify({ type: "connection_init" }));
            });

            this.ws.on("message", (data: WebSocket.RawData) => {
                try {
                    this.handleMessage(JSON.parse(data.toString()));
                } catch (parseError: any) {
                    console.error("❌ [OracleStreamer] Error al parsear mensaje:", parseError.message);
                }
            });

            this.ws.on("close", (code: number, reason: Buffer) => {
                console.warn(`⚠️ [OracleStreamer] Conexión cerrada. Código: ${code}. Razón: ${reason.toString()}`);
                this.stopPing();
                // TODO: Implementar reconexión automática con backoff exponencial
            });

            this.ws.on("error", (error: Error) => {
                console.error("❌ [OracleStreamer] Error en WebSocket:", error.message);
            });

        } catch (error: any) {
            console.error("❌ [OracleStreamer] Fallo al iniciar conexión:", error.message);
        }
    }

    private handleMessage(msg: any): void {
        switch (msg.type) {
            case "connection_ack":
                console.log("✅ [OracleStreamer] Servidor aceptó la conexión. Iniciando latidos (pings).");
                this.startPing();
                this.subscribeToEvents();
                break;

            case "pong":
                // El servidor respondió al ping: conexión activa
                break;

            case "next":
                console.log("🔔 [OracleStreamer] ¡Evento recibido en tiempo real!");
                if (msg.payload?.data) {
                    this.onMessageCallback(msg.payload.data);
                }
                break;

            case "error":
                console.error("❌ [OracleStreamer] Error desde el servidor:", JSON.stringify(msg.payload));
                break;

            case "complete":
                console.log("ℹ️ [OracleStreamer] El servidor finalizó el stream.");
                break;

            default:
                console.log(`ℹ️ [OracleStreamer] Mensaje desconocido recibido. Tipo: "${msg.type}"`);
        }
    }

    private subscribeToEvents(): void {
        const subscribeQuery = {
            id: "closapalta-sub-1",
            type: "subscribe",
            payload: {
                query: `subscription {
          businessEvents(chainCode: "CAR") {
            profileDetails {
              customer {
                personName { givenName surname nameType }
              }
              emails {
                emailInfo { email { emailAddress primaryInd } type }
              }
            }
            profileIdList { type id }
          }
        }`,
            },
        };
        console.log("📡 [OracleStreamer] Suscribiéndose a eventos de la cadena CAR...");
        this.ws?.send(JSON.stringify(subscribeQuery));
    }

    private startPing(): void {
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 15_000);
    }

    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}