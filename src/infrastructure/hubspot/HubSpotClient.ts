import hubspot from "@hubspot/api-client";
import { config } from "../../config/index.js";

export class HubSpotClient {
  private hubspotClient: any;

  constructor() {
    this.hubspotClient = new hubspot.Client({
      accessToken: config.hubspot.accessToken,
    });
  }

  /**
   * 🔍 READ: Obtener un contacto completo por su ID de HubSpot
   */
  async getContactById(contactId: string) {
    try {
      const properties = ["firstname", "lastname", "email", "id_oracle"];
      const response = await this.hubspotClient.crm.contacts.basicApi.getById(
        contactId,
        properties
      );

      return {
        id: response.id,
        firstName: response.properties.firstname,
        lastName: response.properties.lastname,
        email: response.properties.email,
        id_oracle: response.properties.id_oracle,
      };
    } catch (error: any) {
      console.error(`❌ Error al obtener contacto ${contactId}:`, error.message);
      throw error;
    }
  }

  /**
   * 🆔 READ: Obtener solo el ID de Oracle guardado
   */
  async getOracleIdFromContact(contactId: string): Promise<string | null> {
    try {
      const contact = await this.getContactById(contactId);
      return contact.id_oracle || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 🔎 SEARCH: Buscar un contacto por una propiedad específica
   */
  async findContactByProperty(propertyName: string, value: string): Promise<string | null> {
    try {
      const searchRequest = {
        filterGroups: [
          {
            filters: [{ propertyName, operator: "EQ", value }],
          },
        ],
      };
      const response = await this.hubspotClient.crm.contacts.searchApi.doSearch(searchRequest);
      return response.results.length > 0 ? response.results[0].id : null;
    } catch (error: any) {
      console.error(`❌ Error buscando por ${propertyName}:`, error.message);
      return null;
    }
  }

  /**
   * 🖋️ UPDATE: Guardar el ID de Oracle en HubSpot (Handshake)
   */
  async updateOracleId(contactId: string, oracleId: string) {
    try {
      await this.hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: { id_oracle: oracleId },
      });
      console.log(`✅ Vínculo guardado: HS ${contactId} -> Oracle ${oracleId}`);
    } catch (error: any) {
      console.error("❌ Error al actualizar id_oracle:", error.message);
      throw error;
    }
  }

  /**
   * 🔄 UPSERT: Crea o actualiza contacto por Email (Oracle -> HubSpot)
   */
  async syncContact(unifiedContact: any) {
    const { email, firstName, lastName, id_oracle } = unifiedContact;
    const properties = {
      email,
      firstname: firstName,
      lastname: lastName,
      id_oracle: id_oracle,
    };

    try {
      return await this.hubspotClient.crm.contacts.basicApi.create({ properties });
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`ℹ️ Contacto ${email} ya existe, actualizando...`);
        return await this.hubspotClient.crm.contacts.basicApi.update(email, {
          properties,
          idProperty: "email",
        });
      }
      throw error;
    }
  }

  /**
   * 🛏️ RESERVATION: Sincroniza datos de estadía al contacto
   */
  async syncReservationToContact(resData: any) {
    console.log(`\n🛎️ Sincronizando reserva para Oracle ID: ${resData.id_oracle}`);

    const contactId = await this.findContactByProperty('id_oracle', resData.id_oracle);

    if (!contactId) {
      console.log(`⚠️ No se halló contacto con Oracle ID ${resData.id_oracle}.`);
      return;
    }

    const properties = {
      numero_de_reserva: resData.numero_de_reserva,
      arrival: resData.arrival,
      departure: resData.departure,
      estado_de_reserva: resData.estado_de_reserva,
      habitacion: resData.habitacion,
      transporte: resData.transporte,
      nombre_chofer_clos_apalta: resData.nombre_chofer_clos_apalta
    };

    try {
      const cleanProps = Object.fromEntries(
        Object.entries(properties).filter(([_, v]) => v !== null && v !== undefined && v !== "")
      );
      await this.hubspotClient.crm.contacts.basicApi.update(contactId, { properties: cleanProps });
      console.log(`✅ Reserva ${resData.numero_de_reserva} vinculada.`);
    } catch (error: any) {
      console.error("❌ Error en actualización de reserva:", error.message);
    }
  }

  // ------------------------------------------------------------------------
  // 🗑️ DELETE: Archivar contacto en HubSpot (Desde Oracle a HubSpot)
  // ------------------------------------------------------------------------
  async archiveContact(hubspotId: string) {
    try {
      console.log(`🗑️ [HubSpot] Solicitud para archivar contacto ${hubspotId} recibida.`);

      /*
      // 🚨 CÓDIGO COMENTADO HASTA DEFINIR REGLAS DE NEGOCIO 🚨
      // Utiliza el endpoint DELETE de la API de HubSpot para archivar el contacto.
      // Quedará en la papelera de HubSpot por 90 días.

      await this.hubspotClient.crm.contacts.basicApi.archive(hubspotId);
      console.log(`✅ [HubSpot] Contacto ${hubspotId} archivado con éxito.`);
      */

      console.log(`ℹ️ [HubSpot] Acción de archivar ignorada por el momento (Código comentado).`);
    } catch (error: any) {
      console.error(`❌ [HubSpot] Error al archivar contacto ${hubspotId}:`, error.message);
    }
  }
}