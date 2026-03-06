import { config } from "../../config/index.js";
import type { UnifiedContact } from "../../domain/types.js";

export class HubSpotClient {
  private url = "https://api.hubapi.com/crm/v3/objects/contacts";
  // .trim() para eliminar cualquier espacio accidental del .env
  private token = config.hubspot.accessToken.trim();

  async syncContact(contact: UnifiedContact) {
    // 1. TEST DE CONEXIÓN: ¿El token es válido?
    try {
      console.log("🔍 Verificando conexión con HubSpot...");
      const testReq = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
        {
          headers: { Authorization: `Bearer ${this.token}` },
        },
      );
      if (!testReq.ok) {
        const errorText = await testReq.text();
        throw new Error(`Token inválido o expirado. Respuesta: ${errorText}`);
      }
      console.log("✅ Conexión con HubSpot validada.");
    } catch (e: any) {
      console.error("❌ ERROR CRÍTICO DE AUTENTICACIÓN:", e.message);
      throw e;
    }

    // 2. ENVÍO DEL CONTACTO
    const payload = {
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
      },
    };

    console.log(`📤 Enviando payload:`, JSON.stringify(payload));

    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.text();

    if (!response.ok) {
      console.error(
        `❌ Error 400 - Respuesta Cruda de HubSpot: ${responseData}`,
      );
      throw new Error(`HubSpot rechazó la petición: ${responseData}`);
    }

    return JSON.parse(responseData);
  }
}
