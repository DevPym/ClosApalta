import hubspot from "@hubspot/api-client";
import { config } from "../../config/index.js";

// ============================================================================
// Tipos derivados del SDK (sin depender de rutas internas del paquete)
// ============================================================================

// Extrae el tipo Filter directamente de la firma del método doSearch().
// Esto garantiza que 'operator' siempre coincida con FilterOperatorEnum,
// independientemente de la versión del SDK instalada.
type ContactSearchFilter = NonNullable<
  NonNullable<
    Parameters<
      InstanceType<typeof hubspot.Client>["crm"]["contacts"]["searchApi"]["doSearch"]
    >[0]["filterGroups"]
  >[number]["filters"]
>[number];

// ============================================================================
// Interfaces internas
// ============================================================================

interface AssociationResult {
  contactId: string;
  labels: string[];
}

// ============================================================================

export class HubSpotClient {
  // ✅ FIX #13: Cambiado de "public client: any" a private readonly con tipo correcto.
  //    El cliente no debe exponerse al exterior; los métodos de esta clase son la API pública.
  private readonly client: InstanceType<typeof hubspot.Client>;

  constructor() {
    this.client = new hubspot.Client({
      accessToken: config.hubspot.accessToken,
    });
  }

  // ============================================================================
  // 🔍 CONTACTOS
  // ============================================================================

  async findContactByOracleId(oracleId: string) {
    try {
      // Tipamos el filtro explícitamente con el tipo derivado del SDK.
      // Esto resuelve: Type '"EQ"' is not assignable to type 'FilterOperatorEnum'
      const filter: ContactSearchFilter = {
        propertyName: "id_oracle",
        operator: "EQ" as ContactSearchFilter["operator"],
        value: oracleId,
      };
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [{ filters: [filter] }],
      });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error: any) {
      console.error(`❌ [HubSpot] Error buscando por id_oracle "${oracleId}":`, error.message);
      throw error;
    }
  }

  async getContactById(contactId: string) {
    const properties = ["firstname", "lastname", "email", "id_oracle"];
    const response = await this.client.crm.contacts.basicApi.getById(contactId, properties);
    return {
      id: response.id,
      firstName: response.properties['firstname'],
      lastName: response.properties['lastname'],
      email: response.properties['email'],
      id_oracle: response.properties['id_oracle'],
    };
  }

  async updateContact(contactId: string, properties: Record<string, string | undefined>): Promise<void> {
    // SimplePublicObjectInput.properties exige { [key: string]: string } (sin undefined).
    // Filtramos los campos undefined antes de llamar al SDK.
    const cleanProperties: Record<string, string> = Object.fromEntries(
      Object.entries(properties).filter(
        (entry): entry is [string, string] => entry[1] !== undefined
      )
    );
    try {
      await this.client.crm.contacts.basicApi.update(contactId, { properties: cleanProperties });
    } catch (error: any) {
      console.error(`❌ [HubSpot] Error al actualizar contacto ${contactId}:`, error.message);
      throw error;
    }
  }

  async updateOracleId(contactId: string, oracleId: string): Promise<void> {
    await this.updateContact(contactId, { id_oracle: oracleId });
    console.log(`✅ [HubSpot] Vínculo guardado: Contacto ${contactId} → Oracle ${oracleId}`);
  }

  async getOracleIdFromContact(contactId: string): Promise<string | null> {
    try {
      const contact = await this.getContactById(contactId);
      return contact.id_oracle ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Crea o actualiza un contacto en HubSpot (upsert).
   * Si el email ya existe (HTTP 409), actualiza en vez de crear.
   */
  async syncContact(unifiedContact: any): Promise<any> {
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
      // ✅ FIX #1: El SDK de HubSpot expone el status HTTP en error.response.status,
      //    no en error.code (que es para errores de red de Node.js como ECONNREFUSED).
      const httpStatus = error.response?.status ?? error.statusCode;
      if (httpStatus === 409) {
        // ✅ FIX #2: idProperty es el 3.er argumento de update(), no una propiedad del body.
        //    Firma del SDK v13: update(id, simplePublicObjectInput, idProperty?)
        return await this.client.crm.contacts.basicApi.update(
          email,
          { properties },
          "email"          // ← 3.er argumento, no dentro del objeto
        );
      }
      throw error;
    }
  }

  // ============================================================================
  // 💼 NEGOCIOS (DEALS)
  // ============================================================================

  async getDealById(dealId: string) {
    return this.client.crm.deals.basicApi.getById(dealId, [
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
  }

  async updateDeal(dealId: string, properties: {
    id_oracle?: string;
    numero_de_reserva?: string;
    id_synxis?: string;
    estado_de_reserva?: string;
  }): Promise<void> {
    try {
      // Limpiamos valores nulos/vacíos para no sobrescribir campos existentes en HubSpot
      const cleanProps = Object.fromEntries(
        Object.entries(properties).filter(([, v]) => v != null && v !== "")
      );
      await this.client.crm.deals.basicApi.update(dealId, { properties: cleanProps });
      console.log(`✅ [HubSpot] Negocio ${dealId} actualizado.`);
    } catch (error: any) {
      console.error(`❌ [HubSpot] Error actualizando Negocio ${dealId}:`, error.message);
      if (error.response?.data) {
        console.error("[HubSpot] Detalle:", JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  // ============================================================================
  // 🔗 ASOCIACIONES
  // ============================================================================

  /**
   * Devuelve todos los contactos asociados a un Negocio, con sus etiquetas (labels).
   * Usa la API de Asociaciones v4 que es la que soporta etiquetas personalizadas.
   */
  async getAssociatedContacts(dealId: string): Promise<AssociationResult[]> {
    try {
      const response = await this.client.crm.associations.v4.basicApi.getPage(
        "deals",
        dealId,
        "contacts"
      );

      return response.results.map((assoc: any) => ({
        contactId: String(assoc.toObjectId),
        labels: (assoc.associationTypes as any[])
          .map((t) => t.label as string | undefined)
          .filter((l): l is string => !!l),
      }));
    } catch (error: any) {
      console.error(`❌ [HubSpot] Error al obtener contactos asociados al Negocio ${dealId}:`, error.message);
      return [];
    }
  }

  /** @deprecated Usar getAssociatedContacts() para obtener etiquetas. */
  async getContactIdFromDeal(dealId: string): Promise<string | null> {
    try {
      const response = await this.client.crm.associations.v4.basicApi.getPage(
        'deals',
        dealId,
        'contacts'
      );
      const contactId = response.results[0]?.toObjectId?.toString();
      if (contactId) {
        console.log(`🔗 [HubSpot] Asociación: Negocio ${dealId} → Contacto ${contactId}`);
      }
      return contactId ?? null;
    } catch (error: any) {
      console.error(`❌ [HubSpot] Error buscando asociación para Negocio ${dealId}:`, error.message);
      return null;
    }
  }
}