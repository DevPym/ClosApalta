import { config } from "../../config/index.js";
import type { UnifiedContact, UnifiedReservation } from "../../domain/types.js";

export class HubSpotClient {
  private baseUrl = "https://api.hubapi.com/crm/v3/objects/contacts";
  private token: string;

  constructor() {
    const rawToken = config.hubspot.accessToken;
    if (!rawToken) {
      console.error("❌ ERROR CRÍTICO: No se encontró HUBSPOT_ACCESS_TOKEN en el archivo .env");
      process.exit(1);
    }
    this.token = rawToken.trim();
  }

  // 🧹 FUNCIÓN AUXILIAR: Elimina los campos vacíos para no borrar datos en HubSpot
  private cleanProperties(properties: any) {
    return Object.fromEntries(
      Object.entries(properties).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
    );
  }

  // 🔍 FUNCIÓN AUXILIAR: Buscar contacto por cualquier propiedad (email, id_oracle, etc.)
  private async findContactByProperty(propertyName: string, value: string): Promise<string | null> {
    const searchRes = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName, operator: 'EQ', value }]
        }]
      })
    });

    const data: any = await searchRes.json();
    return data.results?.[0]?.id || null;
  }

  // ------------------------------------ 1. CREATE / UPDATE (Sincronización de Perfil) ------------------------------------

  async syncContact(contact: UnifiedContact) {
    try {
      console.log(`📤 Intentando sincronizar a ${contact.email}...`);

      const properties = {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        country: contact.country,
        phone: contact.phone,
        nacionalidad: contact.nacionalidad,
        id_oracle: contact.id_oracle,
        zip_code: contact.zip,
        idioma_preferido: contact.idioma_preferido,
        fecha_de_nacimiento: contact.fecha_de_nacimiento,
        sexo__genero_huesped_principal: contact.sexo__genero_huesped_principal,
        pasaporte: contact.pasaporte,
        huesped_vip: contact.huesped_vip,
        numero_de_fidelidad__relais__chateaux: contact.numero_de_fidelidad__relais__chateaux
      };

      const cleanProps = this.cleanProperties(properties);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: cleanProps })
      });

      const data = await response.json();

      if (response.status === 201) {
        console.log("✅ Contacto creado exitosamente.");
        return data;
      }

      if (response.status === 409) {
        console.log("ℹ️ El contacto ya existe. Iniciando fase de actualización...");
        return await this.updateContact(contact);
      }

      throw new Error(`Error inesperado en HubSpot: ${JSON.stringify(data)}`);
    } catch (error: any) {
      console.error("❌ Error en HubSpot Client (syncContact):", error.message);
      throw error;
    }
  }

  // ------------------------------------ 2. UPDATE (Privado, llamado por syncContact) ------------------------------------

  private async updateContact(contact: UnifiedContact) {
    const contactId = await this.findContactByProperty('email', contact.email);

    if (!contactId) throw new Error(`No se pudo encontrar el ID para el email: ${contact.email}`);

    console.log(`🔄 Actualizando contacto ID: ${contactId}...`);

    const properties = {
      firstname: contact.firstName,
      lastname: contact.lastName,
      address: contact.address,
      city: contact.city,
      state: contact.state,
      country: contact.country,
      phone: contact.phone,
      nacionalidad: contact.nacionalidad,
      id_oracle: contact.id_oracle,
      zip_code: contact.zip,
      idioma_preferido: contact.idioma_preferido,
      fecha_de_nacimiento: contact.fecha_de_nacimiento,
      sexo__genero_huesped_principal: contact.sexo__genero_huesped_principal,
      pasaporte: contact.pasaporte,
      huesped_vip: contact.huesped_vip,
      numero_de_fidelidad__relais__chateaux: contact.numero_de_fidelidad__relais__chateaux
    };

    const cleanProps = this.cleanProperties(properties);

    const updateResponse = await fetch(`${this.baseUrl}/${contactId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: cleanProps })
    });

    const updateData: any = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error("\n❌ HUBSPOT RECHAZÓ LA ACTUALIZACIÓN:", JSON.stringify(updateData, null, 2));
      throw new Error(`HubSpot rechazó la actualización: ${updateData.message}`);
    }

    console.log("✅ Contacto actualizado correctamente.");
    return updateData;
  }

  // ------------------------------------ 3. READ: Obtener un contacto por su ID de Oracle ------------------------------------

  async getContactByOracleId(oracleId: string) {
    console.log(`🔍 Buscando contacto con Oracle ID: ${oracleId}...`);

    const searchRes = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: 'id_oracle', operator: 'EQ', value: oracleId }]
        }],
        properties: [
          'firstname', 'lastname', 'email', 'phone', 'pasaporte',
          'id_oracle', 'numero_de_fidelidad__relais__chateaux'
        ]
      })
    });

    const data: any = await searchRes.json();
    return data.results?.[0] || null;
  }

  // ------------------------------------ 4. DELETE: Borrar contacto de HubSpot usando el ID de Oracle ------------------------------------

  async deleteContactByOracleId(oracleId: string) {
    const contactId = await this.findContactByProperty('id_oracle', oracleId);

    if (!contactId) {
      console.log(`⚠️ No se encontró contacto con Oracle ID ${oracleId} para borrar.`);
      return false;
    }

    console.log(`🗑️ Eliminando contacto ID: ${contactId} (Oracle: ${oracleId})...`);

    const response = await fetch(`${this.baseUrl}/${contactId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' }
    });

    if (response.status === 204) {
      console.log("✅ Contacto eliminado exitosamente de HubSpot.");
      return true;
    }

    console.error("❌ Falló la eliminación en HubSpot.");
    return false;
  }

  // ------------------------------------ 5. UPDATE RESERVATION (Logística) ------------------------------------
  async syncReservationToContact(resData: UnifiedReservation) {
    console.log(`🛎️ Sincronizando datos de reserva para Oracle ID: ${resData.id_oracle}`);

    const contactId = await this.findContactByProperty('id_oracle', resData.id_oracle);

    if (!contactId) {
      console.log(`⚠️ El contacto ${resData.id_oracle} aún no existe. Ignorando reserva.`);
      return;
    }

    const properties = {
      numero_de_huespedes: resData.numero_de_huespedes,
      arrival: resData.arrival,
      departure: resData.departure,
      numero_de_noches_de_estancia: resData.numero_de_noches_de_estancia,
      fuente_de_reserva: resData.fuente_de_reserva,
      estado_de_reserva: resData.estado_de_reserva,
      habitacion: resData.habitacion,
      tipo_de_tarifa: resData.tipo_de_tarifa,
      numero_de_reserva: resData.numero_de_reserva,
      numero_de_vuelo: resData.numero_de_vuelo,
      destino_anterior: resData.destino_anterior,
      transporte: resData.transporte,
      nombre_chofer_clos_apalta: resData.nombre_chofer_clos_apalta
    };

    const cleanProps = this.cleanProperties(properties);

    const updateRes = await fetch(`${this.baseUrl}/${contactId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: cleanProps })
    });

    if (!updateRes.ok) {
      const errorData: any = await updateRes.json();
      console.error("❌ HUBSPOT RECHAZÓ LA RESERVA:", JSON.stringify(errorData, null, 2));
      throw new Error("Fallo al actualizar reserva");
    }

    console.log(`✅ Propiedades de Reserva actualizadas en Contacto ID: ${contactId}`);
  }
}