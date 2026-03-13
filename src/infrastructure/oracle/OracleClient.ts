import axios from "axios";
import { config } from "../../config/index.js";

export class OracleClient {
  private accessToken: string | null = null;
  // ✅ FIX #3: Almacenamos el momento de expiración del token (timestamp en ms).
  //    Verificado en ApiOracleOAuth.json: la respuesta incluye "expires_in" (segundos).
  private tokenExpiresAt: number = 0;

  // ✅ FIX #11: Método público para exponer el token sin romper encapsulamiento con "as any"
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "x-app-key": config.oracle.appKey,
      // ✅ FIX #10: EnterpriseId proviene de config, no hardcodeado
      EnterpriseId: config.oracle.enterpriseId,
      "x-hotelid": config.oracle.hotelId,
      "Content-Type": "application/json",
    };
  }

  // ✅ FIX #3: Método centralizado de autenticación. Reemplaza el patrón
  //    "if (!this.accessToken)" que no detectaba tokens expirados.
  //    Se usa un buffer de 60s para renovar antes del vencimiento real.
  private async ensureAuthenticated(): Promise<void> {
    const BUFFER_MS = 60_000;
    const isExpired = !this.accessToken || Date.now() >= this.tokenExpiresAt - BUFFER_MS;
    if (isExpired) {
      await this.authenticate();
    }
  }

  async authenticate(): Promise<void> {
    const auth = Buffer.from(
      `${config.oracle.clientId}:${config.oracle.clientSecret}`
    ).toString("base64");

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("scope", "urn:opc:hgbu:ws:__myscopes__");

    try {
      const response = await axios.post(
        `${config.oracle.baseUrl}/oauth/v1/tokens`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "x-app-key": config.oracle.appKey,
            EnterpriseId: config.oracle.enterpriseId,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.accessToken = response.data.access_token;
      // ✅ FIX #3: Guardamos la expiración real del token desde la respuesta de Oracle
      const expiresIn: number = response.data.expires_in ?? 3600;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      console.log(`✅ [Oracle] Token obtenido. Expira en ${expiresIn}s.`);

    } catch (error: any) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      console.error(`❌ [Oracle] Error de autenticación | HTTP ${error.response?.status ?? 'N/A'}:`, detail);
      throw new Error(`Error de Autenticación: ${error.message}`);
    }
  }

  // ========================================================================
  // 👤 PERFILES
  // ========================================================================

  async createGuestProfile(profileData: any): Promise<string> {
    await this.ensureAuthenticated();

    try {
      console.log(`📡 [Oracle] Creando perfil para: ${profileData.firstName} ${profileData.lastName}`);

      const body = {
        profileDetails: {
          profileType: "Guest",
          customer: {
            personName: [{
              givenName: (profileData.firstName || "Huesped").trim(),
              surname: (profileData.lastName || "Sin Apellido").trim(),
              nameType: "Primary",
            }],
            language: "E",
          },
          emails: {
            emailInfo: [{
              email: {
                type: "EMAIL",
                emailAddress: profileData.email.trim(),
                primaryInd: true,
              },
            }],
          },
          profileAccessType: {
            hotelId: config.oracle.hotelId,
            sharedLevel: "Property",
          },
        },
      };

      const response = await axios.post(
        `${config.oracle.baseUrl}/crm/v1/profiles`,
        body,
        { headers: this.getHeaders() }
      );

      // La respuesta puede traer el ID en el body o en el header Location (HTTP 201)
      const oracleId: string =
        response.data?.profileIdList?.[0]?.id ??
        response.headers['location']?.split('/').pop() ??
        "";

      if (!oracleId) {
        throw new Error("[Oracle] Perfil creado pero la respuesta no incluyó un ID. Revisar header Location o body.profileIdList.");
      }

      console.log(`✅ [Oracle] Perfil creado. ID: ${oracleId}`);
      return oracleId;

    } catch (error: any) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message;
      console.error(`❌ [Oracle] Error en createGuestProfile | HTTP ${error.response?.status ?? 'N/A'}:`, detail);
      throw error;
    }
  }

  async updateGuestProfile(oracleId: string, properties: Record<string, any>): Promise<void> {
    await this.ensureAuthenticated();

    if (!properties['lastname']) {
      console.warn(`⚠️ [Oracle] updateGuestProfile cancelado para ${oracleId}: falta el apellido obligatorio.`);
      return;
    }

    try {
      const body: any = {
        profileDetails: {
          profileType: "Guest",
          customer: {
            personName: [{
              givenName: (properties['firstname'] || "").trim(),
              surname: properties['lastname'].trim(),
              nameType: "Primary",
            }],
            language: "E",
          },
        },
      };

      if (properties['email']) {
        body.profileDetails.emails = {
          emailInfo: [{
            email: {
              type: "EMAIL",
              emailAddress: properties['email'].trim(),
              primaryInd: true,
            },
          }],
        };
      }

      await axios.put(
        `${config.oracle.baseUrl}/crm/v1/profiles/${oracleId}`,
        body,
        { headers: this.getHeaders() }
      );
      console.log(`✅ [Oracle] Perfil ${oracleId} actualizado correctamente.`);

    } catch (error: any) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message;
      console.error(`❌ [Oracle] Error en updateGuestProfile ${oracleId} | HTTP ${error.response?.status ?? 'N/A'}:`, detail);
      // ✅ FIX #8: Re-lanzamos el error para que el caller sepa que la operación falló
      throw error;
    }
  }

  async deleteGuestProfile(profileId: string): Promise<boolean> {
    await this.ensureAuthenticated();
    try {
      const response = await axios.delete(
        `${config.oracle.baseUrl}/crm/v1/profiles/${profileId}`,
        { headers: this.getHeaders() }
      );
      console.log(`🗑️ [Oracle] Perfil ${profileId} eliminado.`);
      return response.status === 204 || response.status === 200;
    } catch (error: any) {
      console.error(`❌ [Oracle] Error al eliminar perfil ${profileId} | HTTP ${error.response?.status ?? 'N/A'}:`, error.message);
      return false;
    }
  }

  // ========================================================================
  // 🛏️ RESERVAS
  // ========================================================================

  // Documentación: POST /rsv/v1/hotels/{hotelId}/reservations
  // Body: { reservations: { reservation: [...] } }  ← objeto con array interno
  async createReservationInOracle(reservationPayload: any): Promise<{ id: string; raw: any }> {
    await this.ensureAuthenticated();
    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations`;

    try {
      console.log("📡 [Oracle] Creando reserva...");
      const response = await axios.post(url, reservationPayload, {
        headers: this.getHeaders(),
      });

      const resId: string =
        response.data?.reservationIdList?.[0]?.id ??
        response.headers['location']?.split('/').pop() ??
        "Desconocido";

      console.log(`✅ [Oracle] Reserva creada. ID: ${resId}`);
      return { id: resId, raw: response.data };

    } catch (error: any) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message;
      console.error(`❌ [Oracle] Error al crear reserva | HTTP ${error.response?.status ?? 'N/A'}:`, detail);
      throw new Error(`Fallo en Oracle al crear reserva: ${error.message}`);
    }
  }

  // Documentación: PUT /rsv/v1/hotels/{hotelId}/reservations/{reservationId}
  // Body: { reservations: [...] }  ← array directo (changeReservation en ApiOracleReservations.json)
  async updateReservation(reservationId: string, data: any): Promise<any> {
    await this.ensureAuthenticated();
    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations/${reservationId}`;

    try {
      console.log(`📡 [Oracle] Actualizando reserva ${reservationId}...`);
      const response = await axios.put(url, data, {
        headers: this.getHeaders(),
      });
      console.log(`✅ [Oracle] Reserva ${reservationId} actualizada.`);
      return response.data;

    } catch (error: any) {
      const detail = error.response?.data?.detail ?? error.message;
      console.error(`❌ [Oracle] Error en updateReservation ${reservationId} | HTTP ${error.response?.status ?? 'N/A'}:`, detail);
      throw new Error(`Fallo al actualizar reserva en Oracle: ${detail}`);
    }
  }

  async getReservation(reservationId: string): Promise<any> {
    await this.ensureAuthenticated();
    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations/${reservationId}`;
    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error: any) {
      console.error(`❌ [Oracle] Error al consultar reserva ${reservationId} | HTTP ${error.response?.status ?? 'N/A'}:`, error.message);
      return null;
    }
  }
}