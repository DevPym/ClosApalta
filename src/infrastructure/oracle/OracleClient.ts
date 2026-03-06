import axios from "axios";
import { config } from "../../config/index.js";

export class OracleClient {
  private accessToken: string | null = null;

  // 🔑 AUTENTICACIÓN (OAuth2)
  async authenticate(): Promise<void> {
    const auth = Buffer.from(
      `${config.oracle.clientId}:${config.oracle.clientSecret}`,
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
            EnterpriseId: "CLOSAP",
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      this.accessToken = response.data.access_token;
      console.log("✅ Token obtenido con éxito usando el scope de Clos Apalta.");
    } catch (error: any) {
      console.error("❌ Error de Autenticación:", error.response?.data || error.message);
      throw error;
    }
  }

  // 🔍 READ: Obtener perfil por ID
  async getGuestProfile(profileId: string) {
    if (!this.accessToken) await this.authenticate();
    const response = await axios.get(
      `${config.oracle.baseUrl}/crm/v1/profiles/${profileId}?fetchInstructions=Profile`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "x-app-key": config.oracle.appKey,
          "x-hotelid": config.oracle.hotelId,
          EnterpriseId: "CLOSAP",
        },
      },
    );
    return response.data;
  }

  // 📤 CREATE: Crear un nuevo perfil en Oracle
  async createGuestProfile(profileData: any) {
    if (!this.accessToken) await this.authenticate();
    try {
      const response = await axios.post(
        `${config.oracle.baseUrl}/crm/v1/profiles`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "x-app-key": config.oracle.appKey,
            EnterpriseId: "CLOSAP",
            "x-hotelid": config.oracle.hotelId,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("✅ Perfil creado en Oracle con éxito.");
      return response.data;
    } catch (error: any) {
      console.error("❌ Error al crear perfil en Oracle:", JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  // 🔄 UPDATE: Actualizar perfil existente en Oracle
  async updateGuestProfile(profileId: string, profileData: any) {
    if (!this.accessToken) await this.authenticate();
    try {
      // En OHIP, la actualización suele ser PUT a la URL del perfil específico
      const response = await axios.put(
        `${config.oracle.baseUrl}/crm/v1/profiles/${profileId}`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "x-app-key": config.oracle.appKey,
            EnterpriseId: "CLOSAP",
            "x-hotelid": config.oracle.hotelId,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`✅ Perfil ${profileId} actualizado en Oracle.`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al actualizar perfil ${profileId}:`, JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  // 🗑️ DELETE: Borrar perfil en Oracle
  async deleteGuestProfile(profileId: string) {
    if (!this.accessToken) await this.authenticate();
    try {
      const response = await axios.delete(
        `${config.oracle.baseUrl}/crm/v1/profiles/${profileId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "x-app-key": config.oracle.appKey,
            EnterpriseId: "CLOSAP",
            "x-hotelid": config.oracle.hotelId,
          },
        },
      );
      console.log(`🗑️ Perfil ${profileId} eliminado de Oracle.`);
      return response.status === 204 || response.status === 200;
    } catch (error: any) {
      console.error(`❌ Error al eliminar perfil ${profileId}:`, error.message);
      return false;
    }
  }

  // --- MÉTODOS DE RESERVAS ---

  async findRecentReservations() {
    if (!this.accessToken) await this.authenticate();
    const start = "2015-01-01";
    const end = "2026-12-31";

    try {
      const response = await axios.get(
        `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations?arrivalStartDate=${start}&arrivalEndDate=${end}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "x-app-key": config.oracle.appKey,
            EnterpriseId: "CLOSAP",
            "x-hotelid": config.oracle.hotelId,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ Oracle RSV Error Detallado:", JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  async getLatestReservation(profileId: string) {
    try {
      const response = await axios.get(
        `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations?profileId=${profileId}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "x-app-key": config.oracle.appKey,
            EnterpriseId: "CLOSAP",
          },
        },
      );
      return response.data.reservations?.reservation?.[0] || null;
    } catch (error) {
      return null;
    }
  }
}