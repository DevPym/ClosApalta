import { config } from "../../config/index.js";
import type { UnifiedContact } from "../../domain/types.js";

export class HubSpotClient {
  private baseUrl = "https://api.hubapi.com/crm/v3/objects/contacts";
  private token = config.hubspot.accessToken;

  async syncContact(contact: UnifiedContact) {
    try {
      // 1. Intentamos CREAR al contacto directamente
      console.log(`📤 Intentando crear a ${contact.email}...`);

      const payload = {
        properties: {
          email: contact.email,
          firstname: contact.firstName,
          lastname: contact.lastName
        }
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      // 2. Si se crea con éxito (201), terminamos
      if (response.status === 201) {
        console.log("✅ Contacto creado exitosamente.");
        return data;
      }

      // 3. SI YA EXISTE (Error 409), vamos a ACTUALIZARLO
      if (response.status === 409) {
        console.log("ℹ️ El contacto ya existe. Iniciando fase de actualización (Update)...");
        return await this.updateContact(contact);
      }

      throw new Error(`Error inesperado en HubSpot: ${JSON.stringify(data)}`);

    } catch (error: any) {
      console.error("❌ Error en HubSpot Client:", error.message);
      throw error;
    }
  }

  private async updateContact(contact: UnifiedContact) {
    const searchUrl = `${this.baseUrl}/search`;
    const searchBody = {
      filterGroups: [{
        filters: [{ propertyName: 'email', operator: 'EQ', value: contact.email }]
      }]
    };

    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchBody)
    });

    // 💡 Definimos la estructura mínima que esperamos de HubSpot
    interface HubSpotSearchResponse {
      results: Array<{ id: string }>;
    }

    // 🎯 Casteamos la respuesta para que TypeScript deje de quejarse
    const searchData = (await searchRes.json()) as HubSpotSearchResponse;

    // Ahora 'results' ya es reconocido
    const contactId = searchData.results?.[0]?.id;

    if (!contactId) {
      throw new Error(`No se pudo encontrar el ID para el email: ${contact.email}`);
    }

    console.log(`🔄 Actualizando contacto ID: ${contactId}...`);

    const updateResponse = await fetch(`${this.baseUrl}/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          firstname: contact.firstName,
          lastname: contact.lastName
        }
      })
    });

    return await updateResponse.json();
  }


}