// 4.1 - Capa de infraestructura (infrastructure/) — adaptador para HubSpot. No tiene lógica de negocio.

import hubspot from "@hubspot/api-client";
import { config } from "../../config/index.js";
import type { HubSpotContactData, HubSpotCompanyData } from "../../domain/types.js";

export class HubSpotClient {
  private client: InstanceType<typeof hubspot.Client>;

  constructor() {
    this.client = new hubspot.Client({
      accessToken: config.hubspot.accessToken,
    });
  }

  // =========================================================================
  // 👤 CONTACTOS
  // =========================================================================

  async getContactById(contactId: string): Promise<HubSpotContactData> {
    const properties = [
      "firstname", "lastname", "email", "id_oracle",
      "phone", "address", "city", "country",
      "idioma_preferido", "nacionalidad",
      "fecha_de_nacimiento", "sexo__genero_huesped_principal",
      "pasaporte", "huesped_vip",
      "numero_de_fidelidad__relais__chateaux",
    ];
    const response = await this.client.crm.contacts.basicApi.getById(
      contactId,
      properties
    );
    const p = response.properties;
    return {
      id: response.id,
      id_oracle: p.id_oracle || undefined,
      firstName: p.firstname || undefined,
      lastName: p.lastname || undefined,
      email: p.email || undefined,
      phone: p.phone || undefined,
      address: p.address || undefined,
      city: p.city || undefined,
      country: p.country || undefined,
      idioma_preferido: p.idioma_preferido || undefined,
      nacionalidad: p.nacionalidad || undefined,
      fecha_de_nacimiento: p.fecha_de_nacimiento || undefined,
      sexo__genero_huesped_principal: p.sexo__genero_huesped_principal || undefined,
      pasaporte: p.pasaporte || undefined,
      huesped_vip: p.huesped_vip || undefined,
      numero_de_fidelidad__relais__chateaux: p.numero_de_fidelidad__relais__chateaux || undefined,
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
      const status = error.response?.status || error.statusCode;
      if (status === 409) {
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
  async getCompanyByDealId(dealId: string): Promise<HubSpotCompanyData | null> {
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

      const companyId = String(response.results[0]!.toObjectId);
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
   * Obtiene datos completos de una Company de HubSpot por su ID.
   */
  async getCompanyById(companyId: string): Promise<HubSpotCompanyData | null> {
    try {
      const response = await this.client.crm.companies.basicApi.getById(
        companyId,
        ["name", "tipo_de_empresa", "id_oracle", "phone", "email", "address", "city", "country", "iata_code"]
      );
      const p = response.properties;
      return {
        id: response.id,
        id_oracle: p.id_oracle || undefined,
        name: p.name || undefined,
        phone: p.phone || undefined,
        email: p.email || undefined,
        address: p.address || undefined,
        city: p.city || undefined,
        country: p.country || undefined,
        tipo_de_empresa: p.tipo_de_empresa || undefined,
        iata_code: p.iata_code || undefined,
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

  async updateDeal(
    dealId: string,
    properties: {
      id_oracle?: string;
      numero_de_reserva?: string;
      estado_de_reserva?: string;
    }
  ) {
    try {
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
  // El SDK permite leer objetos archivados pasando archived=true como
  // 5to parámetro de getById(). HubSpot mantiene el objeto ~90 días.
  // =========================================================================

  async getArchivedContactById(
    contactId: string
  ): Promise<{ id: string; id_oracle: string | null } | null> {
    try {
      const response = await this.client.crm.contacts.basicApi.getById(
        contactId,
        ["id_oracle"],
        [],
        [],
        true
      );
      return {
        id: response.id,
        id_oracle: response.properties.id_oracle || null,
      };
    } catch (error: any) {
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

  async getArchivedCompanyById(
    companyId: string
  ): Promise<{ id: string; id_oracle: string | null } | null> {
    try {
      const response = await this.client.crm.companies.basicApi.getById(
        companyId,
        ["id_oracle"],
        [],
        [],
        true
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

  async getArchivedDealById(
    dealId: string
  ): Promise<{ id: string; id_oracle: string | null } | null> {
    try {
      const response = await this.client.crm.deals.basicApi.getById(
        dealId,
        ["id_oracle"],
        [],
        [],
        true
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
