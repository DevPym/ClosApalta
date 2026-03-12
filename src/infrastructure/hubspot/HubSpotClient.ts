import hubspot from "@hubspot/api-client";
import { config } from "../../config/index.js";



/* Interfaces */

interface HubSpotAssociation {
  id: string;
  types: { label?: string; typeId: number; category: string }[];
}


export class HubSpotClient {
  // 🔥 Cambiado a público y nombre estándar para que index.ts lo vea
  public client: any;

  constructor() {
    this.client = new hubspot.Client({
      accessToken: config.hubspot.accessToken,
    });
  }

  /**
   * 🔍 SEARCH: Busca un contacto por ID de Oracle y devuelve el objeto completo
   */
  async findContactByOracleId(oracleId: string) {
    try {
      const searchRequest = {
        filterGroups: [
          {
            filters: [{ propertyName: "id_oracle", operator: "EQ", value: oracleId }],
          },
        ],
      };
      const response = await this.client.crm.contacts.searchApi.doSearch(searchRequest);
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error: any) {
      console.error(`❌ Error buscando por id_oracle ${oracleId}:`, error.message);
      throw error;
    }
  }

  /**
   * 🖋️ UPDATE: Actualizar propiedades de un contacto
   */
  async updateContact(contactId: string, properties: any) {
    try {
      await this.client.crm.contacts.basicApi.update(contactId, { properties });
    } catch (error: any) {
      console.error(`❌ Error al actualizar contacto ${contactId}:`, error.message);
      throw error;
    }
  }

  /**
   * 💼 UPDATE: Actualizar propiedades de un Negocio (Deal)
   */
  // infrastructure/hubspot/HubSpotClient.ts

  async updateDeal(dealId: string, properties: {
    id_oracle?: string,
    numero_de_reserva?: string,
    id_synxis?: string,
    estado_de_reserva?: string
  }) {
    try {
      // Limpiamos valores nulos para no enviar basura a HubSpot
      const cleanProps = Object.fromEntries(
        Object.entries(properties).filter(([_, v]) => v != null && v !== "")
      );

      await this.client.crm.deals.basicApi.update(dealId, { properties: cleanProps });
      console.log(`✅ [HubSpot] Negocio ${dealId} actualizado con éxito.`);
    } catch (error: any) {
      console.error(`❌ [HubSpot] Error actualizando Negocio ${dealId}:`, error.message);
      if (error.response?.data) {
        console.error("Detalle:", JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  // --- Mantenemos tus métodos anteriores por compatibilidad ---

  async getContactById(contactId: string) {
    const properties = ["firstname", "lastname", "email", "id_oracle"];
    const response = await this.client.crm.contacts.basicApi.getById(contactId, properties);
    return {
      id: response.id,
      firstName: response.properties.firstname,
      lastName: response.properties.lastname,
      email: response.properties.email,
      id_oracle: response.properties.id_oracle,
    };
  }

  async updateOracleId(contactId: string, oracleId: string) {
    await this.updateContact(contactId, { id_oracle: oracleId });
    console.log(`✅ Vínculo guardado: HS ${contactId} -> Oracle ${oracleId}`);
  }

  async getOracleIdFromContact(contactId: string): Promise<string | null> {
    try {
      const contact = await this.getContactById(contactId);
      return contact.id_oracle || null;
    } catch (error) { return null; }
  }

  async syncContact(unifiedContact: any) {
    const { email, firstName, lastName, id_oracle } = unifiedContact;
    const properties = { email, firstname: firstName, lastname: lastName, id_oracle };
    try {
      return await this.client.crm.contacts.basicApi.create({ properties });
    } catch (error: any) {
      if (error.code === 409) {
        return await this.client.crm.contacts.basicApi.update(email, { properties, idProperty: "email" });
      }
      throw error;
    }
  }
  // infrastructure/hubspot/HubSpotClient.ts

  // infrastructure/hubspot/HubSpotClient.ts

  async getContactIdFromDeal(dealId: string): Promise<string | null> {
    try {
      // Usamos la API de asociaciones v4 (es la más estable actualmente)
      const response = await this.client.crm.associations.v4.basicApi.getPage(
        'deals',    // Del objeto Negocio
        dealId,     // Con este ID
        'contacts'  // Buscamos Contactos
      );

      // En v4, el ID viene en 'toObjectId'
      const contactId = response.results[0]?.toObjectId?.toString();

      if (contactId) {
        console.log(`🔗 Asociación encontrada: Deal ${dealId} -> Contacto ${contactId}`);
      }

      return contactId || null;
    } catch (error: any) {
      console.error(`❌ Error buscando asociación para Negocio ${dealId}:`, error.message);
      return null;
    }
  }

  // infrastructure/hubspot/HubSpotClient.ts


  // Dentro de la clase HubSpotClient
  async getAssociatedContacts(dealId: string) {
    try {
      const response = await this.client.crm.deals.associationsApi.getAll(dealId, 'contacts');
      const results = response.results as HubSpotAssociation[]; // Cast de tipo

      return results.map((assoc: HubSpotAssociation) => ({
        contactId: assoc.id,
        labels: assoc.types
          .map((t) => t.label)
          .filter((l): l is string => !!l) // Filtro para asegurar que 'l' es string y no undefined
      }));
    } catch (error: any) {
      console.error("❌ Error al obtener contactos asociados:", error.message);
      return [];
    }
  }
}