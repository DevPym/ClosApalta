// 4.1 - Capa de infraestructura (infrastructure/) — contiene adaptadores específicos para HubSpot, Oracle, etc. No tiene lógica de negocio, solo llamadas a APIs externas.



import hubspot from "@hubspot/api-client";
import { config } from "../../config/index.js";

export class HubSpotClient {
  public client: any;

  constructor() {
    this.client = new hubspot.Client({
      accessToken: config.hubspot.accessToken,
    });
  }

  // =========================================================================
  // 👤 CONTACTOS
  // =========================================================================

  async getContactById(contactId: string) {
    const properties = [
      "firstname", "lastname", "email", "id_oracle",
    ];
    const response = await this.client.crm.contacts.basicApi.getById(
      contactId,
      properties
    );
    return {
      id: response.id,
      firstName: response.properties.firstname || "",
      lastName: response.properties.lastname || "",
      email: response.properties.email || "",
      id_oracle: response.properties.id_oracle || null,
    };
  }

  async findContactByOracleId(oracleId: string) {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              { propertyName: "id_oracle", operator: "EQ", value: oracleId },
            ],
          },
        ],
      });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error: any) {
      console.error(
        `❌ [HubSpot] findContactByOracleId ${oracleId}:`,
        error.message
      );
      throw error;
    }
  }

  async updateContact(contactId: string, properties: Record<string, any>) {
    try {
      await this.client.crm.contacts.basicApi.update(contactId, {
        properties,
      });
      console.log(`✅ [HubSpot] Contacto ${contactId} actualizado.`);
    } catch (error: any) {
      console.error(
        `❌ [HubSpot] updateContact ${contactId}:`,
        error.message
      );
      throw error;
    }
  }

  async updateOracleId(contactId: string, oracleId: string) {
    await this.updateContact(contactId, { id_oracle: oracleId });
    console.log(
      `✅ [HubSpot] Vínculo guardado: Contacto ${contactId} → Oracle ${oracleId}`
    );
  }

  /**
   * Crea o actualiza un contacto en HubSpot.
   * Fix: el SDK de HubSpot expone el status 409 en error.response?.status,
   * no en error.code. El 4to argumento de basicApi.update() es idProperty.
   */
  async syncContact(unifiedContact: any) {
    const { email, firstName, lastName, id_oracle } = unifiedContact;
    const properties = {
      email,
      firstname: firstName,
      lastname: lastName,
      id_oracle,
    };

    try {
      return await this.client.crm.contacts.basicApi.create({ properties });
    } catch (error: any) {
      // Fix: verificar status correcto del SDK de HubSpot
      const status = error.response?.status || error.statusCode;
      if (status === 409) {
        // Fix: idProperty es el 4to argumento, no va dentro del cuerpo
        return await this.client.crm.contacts.basicApi.update(
          email,
          { properties },
          undefined,
          "email"
        );
      }
      throw error;
    }
  }

  // =========================================================================
  // 🏢 EMPRESAS (Companies / Agencias de viaje)
  // =========================================================================

  /**
   * Obtiene la Company de HubSpot asociada a un Deal.
   * Retorna null si el Deal no tiene empresa asociada.
   */
  async getCompanyByDealId(dealId: string): Promise<any | null> {
    try {
      const response =
        await this.client.crm.associations.v4.basicApi.getPage(
          "deals",
          dealId,
          "companies"
        );

      if (!response.results || response.results.length === 0) {
        return null;
      }

      // Tomamos la primera empresa asociada
      const companyId = String(response.results[0].toObjectId);
      return await this.getCompanyById(companyId);
    } catch (error: any) {
      console.error(
        `❌ [HubSpot] getCompanyByDealId ${dealId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Obtiene datos de una Company de HubSpot por su ID.
   * Incluye nombre, tipo_de_empresa e id_oracle.
   */
  async getCompanyById(companyId: string): Promise<any | null> {
    try {
      const response = await this.client.crm.companies.basicApi.getById(
        companyId,
        ["name", "tipo_de_empresa", "id_oracle"]
      );
      return {
        id: response.id,
        name: response.properties.name || "",
        tipo_de_empresa: response.properties.tipo_de_empresa || "",
        id_oracle: response.properties.id_oracle || null,
      };
    } catch (error: any) {
      console.error(
        `❌ [HubSpot] getCompanyById ${companyId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Actualiza propiedades de una Company en HubSpot.
   * Se usa principalmente para guardar el id_oracle devuelto por Oracle.
   */
  async updateCompany(
    companyId: string,
    properties: Record<string, any>
  ) {
    try {
      await this.client.crm.companies.basicApi.update(companyId, {
        properties,
      });
      console.log(`✅ [HubSpot] Company ${companyId} actualizada.`);
    } catch (error: any) {
      console.error(
        `❌ [HubSpot] updateCompany ${companyId}:`,
        error.message
      );
      throw error;
    }
  }

  // =========================================================================
  // 💼 NEGOCIOS (Deals)
  // =========================================================================

  async getDealById(dealId: string) {
    const response = await this.client.crm.deals.basicApi.getById(dealId, [
      "check_in",
      "check_out",
      "room_type",
      "fuente_de_reserva",
      "tipo_de_tarifa",
      "tipo_de_pago",
      "cantidad_de_habitaciones",
      "numero_de_huespedes",
      "id_oracle",
      "numero_de_reserva",
    ]);
    return response;
  }

  /**
   * Actualiza propiedades de un Deal en HubSpot.
   * Fix: el typo "numero_de_reserva_" fue corregido a "numero_de_reserva".
   */
  async updateDeal(
    dealId: string,
    properties: {
      id_oracle?: string;
      numero_de_reserva?: string;  // Fix: sin underscore al final
      id_synxis?: string;
      estado_de_reserva?: string;
    }
  ) {
    try {
      // Limpiar valores nulos o vacíos
      const cleanProps = Object.fromEntries(
        Object.entries(properties).filter(
          ([_, v]) => v != null && v !== ""
        )
      );

      await this.client.crm.deals.basicApi.update(dealId, {
        properties: cleanProps,
      });
      console.log(`✅ [HubSpot] Deal ${dealId} actualizado.`);
    } catch (error: any) {
      console.error(
        `❌ [HubSpot] updateDeal ${dealId}:`,
        error.message
      );
      if (error.response?.data) {
        console.error(
          "Detalle:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
      throw error;
    }
  }

  // =========================================================================
  // 🗑️ LECTURA DE OBJETOS ARCHIVADOS (para webhooks de deletion)
  //
  // Cuando HubSpot dispara contact.deletion / company.deletion / deal.deletion,
  // el payload solo contiene objectId — NO incluye propiedades como id_oracle.
  //
  // SOLUCIÓN: el SDK de HubSpot permite leer objetos archivados pasando
  // archived=true como 5to parámetro de getById(). HubSpot mantiene el
  // objeto archivado ~90 días antes de su purga definitiva.
  //
  // Firma del SDK:
  //   basicApi.getById(id, properties?, propertiesWithHistory?, associations?, archived?)
  //
  // Estos métodos devuelven SOLO el id_oracle (lo único que necesitamos
  // para operar en Oracle). Si el objeto ya fue purgado, devuelven null.
  // =========================================================================

  /**
   * Lee un Contact archivado (eliminado) de HubSpot.
   * Devuelve { id, id_oracle } o null si ya fue purgado.
   */
  async getArchivedContactById(
    contactId: string
  ): Promise<{ id: string; id_oracle: string | null } | null> {
    try {
      const response = await this.client.crm.contacts.basicApi.getById(
        contactId,
        ["id_oracle"],   // properties
        [],              // propertiesWithHistory
        [],              // associations
        true             // archived = true ← clave para leer eliminados
      );
      return {
        id: response.id,
        id_oracle: response.properties.id_oracle || null,
      };
    } catch (error: any) {
      // 404 = ya purgado definitivamente por HubSpot
      if (error.response?.status === 404 || error.statusCode === 404) {
        console.warn(
          `⚠️ [HubSpot] Contact archivado ${contactId} no encontrado (ya purgado).`
        );
        return null;
      }
      console.error(
        `❌ [HubSpot] getArchivedContactById ${contactId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Lee una Company archivada (eliminada) de HubSpot.
   * Devuelve { id, id_oracle } o null si ya fue purgada.
   */
  async getArchivedCompanyById(
    companyId: string
  ): Promise<{ id: string; id_oracle: string | null } | null> {
    try {
      const response = await this.client.crm.companies.basicApi.getById(
        companyId,
        ["id_oracle"],
        [],
        [],
        true             // archived = true
      );
      return {
        id: response.id,
        id_oracle: response.properties.id_oracle || null,
      };
    } catch (error: any) {
      if (error.response?.status === 404 || error.statusCode === 404) {
        console.warn(
          `⚠️ [HubSpot] Company archivada ${companyId} no encontrada (ya purgada).`
        );
        return null;
      }
      console.error(
        `❌ [HubSpot] getArchivedCompanyById ${companyId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Lee un Deal archivado (eliminado) de HubSpot.
   * Devuelve { id, id_oracle } o null si ya fue purgado.
   */
  async getArchivedDealById(
    dealId: string
  ): Promise<{ id: string; id_oracle: string | null } | null> {
    try {
      const response = await this.client.crm.deals.basicApi.getById(
        dealId,
        ["id_oracle"],
        [],
        [],
        true             // archived = true
      );
      return {
        id: response.id,
        id_oracle: response.properties.id_oracle || null,
      };
    } catch (error: any) {
      if (error.response?.status === 404 || error.statusCode === 404) {
        console.warn(
          `⚠️ [HubSpot] Deal archivado ${dealId} no encontrado (ya purgado).`
        );
        return null;
      }
      console.error(
        `❌ [HubSpot] getArchivedDealById ${dealId}:`,
        error.message
      );
      return null;
    }
  }

  // =========================================================================
  // 🔗 ASOCIACIONES
  // =========================================================================

  /**
   * Devuelve todos los contactos asociados a un Deal con sus etiquetas.
   * Usa la API v4 que soporta etiquetas (labels) de asociación.
   */
  async getAssociatedContacts(dealId: string) {
    try {
      const response =
        await this.client.crm.associations.v4.basicApi.getPage(
          "deals",
          dealId,
          "contacts"
        );

      return response.results.map((assoc: any) => ({
        contactId: String(assoc.toObjectId),
        labels: assoc.associationTypes
          .map((t: any) => t.label)
          .filter((l: any): l is string => !!l),
      }));
    } catch (error: any) {
      console.error(
        `❌ [HubSpot] getAssociatedContacts ${dealId}:`,
        error.message
      );
      return [];
    }
  }
}