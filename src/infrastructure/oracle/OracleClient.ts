import axios from "axios";
import { config } from "../../config/index.js";

export class OracleClient {
  private accessToken: string | null = null;

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "x-app-key": config.oracle.appKey,
      EnterpriseId: "CLOSAP",
      "x-hotelid": config.oracle.hotelId,
      "Content-Type": "application/json",
    };
  }

  async authenticate(): Promise<void> {
    const auth = Buffer.from(`${config.oracle.clientId}:${config.oracle.clientSecret}`).toString("base64");
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("scope", "urn:opc:hgbu:ws:__myscopes__");

    try {
      const response = await axios.post(`${config.oracle.baseUrl}/oauth/v1/tokens`, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          "x-app-key": config.oracle.appKey,
          EnterpriseId: "CLOSAP",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      this.accessToken = response.data.access_token;
      console.log("✅ Token obtenido con éxito.");
    } catch (error: any) {
      throw new Error(`Error de Autenticación: ${error.message}`);
    }
  }

  async createGuestProfile(profileData: any): Promise<string> {
    if (!this.accessToken) await this.authenticate();
    let body: any;

    try {
      console.log(`📡 [Oracle] Creación final para: ${profileData.firstName} ${profileData.lastName}`);

      body = {
        profileDetails: {
          profileType: "Guest",
          customer: {
            personName: [{
              givenName: (profileData.firstName || "Huesped").trim(),
              surname: (profileData.lastName || "Sin Apellido").trim(),
              nameType: "Primary"
            }],
            language: "E"
          },
          emails: {
            emailInfo: [{
              email: {
                type: "EMAIL",
                emailAddress: profileData.email.trim(),
                primaryInd: true
              }
            }]
          },
          profileAccessType: {
            hotelId: config.oracle.hotelId,
            sharedLevel: "Property"
          }
        }
      };

      const response = await axios.post(
        `${config.oracle.baseUrl}/crm/v1/profiles`,
        body,
        { headers: this.getHeaders() }
      );

      const oracleId = response.data?.profileIdList?.[0]?.id ||
        response.headers.location?.split('/').pop();

      console.log(`✅ Perfil creado en Oracle. ID: ${oracleId}`);
      return oracleId;
    } catch (error: any) {
      console.error("❌ Error en createGuestProfile");
      throw error;
    }
  }

  async updateGuestProfile(oracleId: string, properties: Record<string, any>) {
    if (!this.accessToken) await this.authenticate();

    if (!properties.lastname) {
      console.log("⚠️ Update cancelado: Falta el apellido obligatorio.");
      return;
    }

    try {
      const body: any = {
        profileDetails: {
          profileType: "Guest",
          customer: {
            personName: [{
              givenName: (properties.firstname || "").trim(),
              surname: properties.lastname.trim(),
              nameType: "Primary"
            }],
            language: "E"
          }
        }
      };

      if (properties.email) {
        body.profileDetails.emails = {
          emailInfo: [{
            email: {
              type: "EMAIL",
              emailAddress: properties.email.trim(),
              primaryInd: true
            }
          }]
        };
      }

      await axios.put(
        `${config.oracle.baseUrl}/crm/v1/profiles/${oracleId}`,
        body,
        { headers: this.getHeaders() }
      );
      console.log(`✅ [Oracle] Perfil ${oracleId} actualizado correctamente.`);
    } catch (error: any) {
      console.error("❌ Error en updateGuestProfile");
    }
  }

  async deleteGuestProfile(profileId: string) {
    if (!this.accessToken) await this.authenticate();
    try {
      const response = await axios.delete(
        `${config.oracle.baseUrl}/crm/v1/profiles/${profileId}`,
        { headers: this.getHeaders() }
      );
      console.log(`🗑️ Perfil ${profileId} eliminado de Oracle.`);
      return response.status === 204 || response.status === 200;
    } catch (error: any) {
      console.error(`❌ Error al eliminar perfil ${profileId}:`, error.message);
      return false;
    }
  }

  // ========================================================================
  // 🛏️ RESERVAS (DEALS)
  // ========================================================================

  async createReservationInOracle(reservationPayload: any): Promise<any> {
    if (!this.accessToken) await this.authenticate();

    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations`;

    try {
      console.log("📡 [Oracle] Intentando inyectar reserva...");

      const response = await axios.post(url, reservationPayload, {
        headers: this.getHeaders(),
      });

      const resId = response.data?.reservationIdList?.[0]?.id || response.headers.location?.split('/').pop() || "Desconocido";
      console.log(`✅ [Oracle] Reserva creada con éxito. ID: ${resId}`);
      return { id: resId, raw: response.data };

    } catch (error: any) {
      console.error("❌ [Oracle] Fallo al crear la reserva");
      const detalles = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
      console.error("❌ [Oracle] Detalle exacto del rechazo:", detalles);
      throw new Error(`Fallo en Oracle al crear reserva: ${error.message}`);
    }
  }

  /**
   * 🔄 UPDATE RESERVATION: Actualiza fechas, pax o habitación en OPERA
   */
  async updateReservation(reservationId: string, data: any): Promise<any> {
    if (!this.accessToken) await this.authenticate();

    // Importante: Usamos /rsv/v1/ que es el endpoint que ya te funciona para POST
    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations/${reservationId}`;

    try {
      console.log(`📡 [Oracle] Actualizando reserva ${reservationId}...`);

      const response = await axios.put(url, data, {
        headers: this.getHeaders(),
      });

      console.log(`✅ [Oracle] Reserva ${reservationId} actualizada con éxito.`);
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message;
      console.error("❌ Error en updateReservation:", detail);
      throw new Error(`Fallo al actualizar reserva en Oracle: ${detail}`);
    }
  }
  // En OracleClient.ts
  async getReservation(reservationId: string): Promise<any> {
    if (!this.accessToken) await this.authenticate();
    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations/${reservationId}`;
    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al consultar reserva ${reservationId}:`, error.message);
      return null;
    }
  }
}