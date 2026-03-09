import WebSocket from "ws";
import crypto from "crypto";
import { config } from "../../config/index.js";
import { OracleClient } from "./OracleClient.js";

export class OracleStreamer {
    private ws: WebSocket | null = null;
    private oracleClient: OracleClient;
    private pingInterval: NodeJS.Timeout | null = null;
    private onMessageCallback: (event: any) => void;

    constructor(oracleClient: OracleClient, onMessageCallback: (event: any) => void) {
        this.oracleClient = oracleClient;
        this.onMessageCallback = onMessageCallback;
    }

    // 🔐 Regla de Oracle: El AppKey debe enviarse como un Hash SHA256 en la URL
    private getHashedAppKey(): string {
        const hash = crypto.createHash("sha256");
        hash.update(config.oracle.appKey);
        return hash.digest("hex").toLowerCase();
    }

    async connect() {
        console.log("🔌 [OracleStreamer] Iniciando conexión WebSocket...");

        try {
            // 1. Aseguramos tener un Token OAuth válido
            await this.oracleClient.authenticate();
            const token = (this.oracleClient as any).accessToken; // Acceso interno al token

            // 2. Construimos la URL de Streaming (Suele ser wss:// en lugar de https://)
            const wssBaseUrl = config.oracle.baseUrl.replace("https://", "wss://");
            // La ruta exacta de streaming según OHIP
            const streamUrl = `${wssBaseUrl}/streaming/v1?appKey=${this.getHashedAppKey()}`;

            // 3. Abrimos la conexión con el subprotocolo requerido por Oracle
            this.ws = new WebSocket(streamUrl, "graphql-transport-ws", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            this.ws.on("open", () => {
                console.log("✅ [OracleStreamer] Conexión abierta. Iniciando Handshake GraphQL...");
                // Protocolo GraphQL-WS: Enviar connection_init
                this.ws?.send(JSON.stringify({ type: "connection_init" }));
            });

            this.ws.on("message", (data: string) => {
                const message = JSON.stringify(data.toString());
                this.handleMessage(JSON.parse(data.toString()));
            });

            this.ws.on("close", (code, reason) => {
                console.log(`⚠️ [OracleStreamer] Conexión cerrada. Código: ${code}. Razón: ${reason}`);
                this.stopPing();
                // Lógica de reconexión automática en el futuro
            });

            this.ws.on("error", (error) => {
                console.error("❌ [OracleStreamer] Error en WebSocket:", error.message);
            });

        } catch (error: any) {
            console.error("❌ [OracleStreamer] Fallo al iniciar conexión:", error.message);
        }
    }

    private handleMessage(msg: any) {
        switch (msg.type) {
            case "connection_ack":
                console.log("✅ [OracleStreamer] Servidor aceptó la conexión. Iniciando latidos (Pings).");
                this.startPing();
                this.subscribeToEvents();
                break;

            case "pong":
                // El servidor respondió nuestro ping, la conexión está sana
                break;

            case "next":
                // ¡AQUÍ LLEGAN LOS EVENTOS DE OPERA! (Perfiles, Reservas)
                console.log("🔔 [WEBHOOK ORACLE STREAM] ¡Evento recibido en tiempo real!");
                if (msg.payload && msg.payload.data) {
                    this.onMessageCallback(msg.payload.data);
                }
                break;

            case "error":
                console.error("❌ [OracleStreamer] Error desde el servidor:", msg.payload);
                break;

            case "complete":
                console.log("ℹ️ [OracleStreamer] El servidor finalizó el stream.");
                break;

            default:
                console.log("ℹ️ [OracleStreamer] Mensaje desconocido:", msg.type);
        }
    }

    private subscribeToEvents() {
        // Aquí enviamos la query GraphQL para suscribirnos a los eventos de la cadena
        const subscribeQuery = {
            id: "closapalta-sub-1",
            type: "subscribe",
            payload: {
                query: `subscription { 
          businessEvents(chainCode: "CAR") { 
            profileDetails { customer { personName { givenName surname nameType } } emails { emailInfo { email { emailAddress primaryInd } type } } }
            profileIdList { type id }
          } 
        }`
            }
        };
        console.log("📡 [OracleStreamer] Suscribiéndose a eventos de la cadena CAR...");
        this.ws?.send(JSON.stringify(subscribeQuery));
    }

    // 🫀 Mantiene la conexión viva enviando un ping cada 15 segundos
    private startPing() {
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 15000); // 15 segundos
    }

    private stopPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
    }
}