import axios from "axios";
import { config } from "../../config/index.js";

export class OracleClient {
  private accessToken: string | null = null;

  // En src/infrastructure/oracle/OracleClient.ts
  // src/infrastructure/oracle/OracleClient.ts
  async authenticate(): Promise<void> {
    const auth = Buffer.from(
      `${config.oracle.clientId}:${config.oracle.clientSecret}`,
    ).toString("base64");

    // Usamos URLSearchParams para asegurar el formato x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("scope", "urn:opc:hgbu:ws:__myscopes__"); // VALOR EXACTO DEL JSON

    try {
      const response = await axios.post(
        `${config.oracle.baseUrl}/oauth/v1/tokens`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "x-app-key": config.oracle.appKey,
            EnterpriseId: "CLOSAP", // REQUERIDO SEGÚN POSTMAN
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      this.accessToken = response.data.access_token;
      console.log(
        "✅ Token obtenido con éxito usando el scope de Clos Apalta.",
      );
    } catch (error: any) {
      console.error(
        "❌ Error de Autenticación:",
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getGuestProfile(profileId: string) {
    if (!this.accessToken) await this.authenticate();

    // Cambiamos la URL:
    // 1. Usamos 'Profile' (en singular)
    // 2. Quitamos 'Communication' y 'Preference' que daban el error 400
    // 3. OHIP suele incluir los emails básicos dentro de 'Profile' si el hotel lo permite
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

  // src/infrastructure/oracle/OracleClient.ts

  async findRecentReservations() {
    if (!this.accessToken) await this.authenticate();

    // Usamos un rango de un año para asegurar que encontremos huéspedes con datos
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
      // 🔍 Esto nos imprimirá el motivo exacto del 400 en la terminal de Arch
      console.error(
        "❌ Oracle RSV Error Detallado:",
        JSON.stringify(error.response?.data, null, 2),
      );
      throw error;
    }
  }

  async getLatestReservation(profileId: string) {
    try {
      // Cambiamos 'res' por 'rsv'
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
