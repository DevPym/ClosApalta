import axios from "axios";
import { config } from "../../config/index.js";

export class OracleClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "x-app-key": config.oracle.appKey,
      EnterpriseId: config.oracle.enterpriseId,
      "x-hotelid": config.oracle.hotelId,
      "Content-Type": "application/json",
    };
  }

  private async ensureToken(): Promise<void> {
    const margin = 60_000;
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - margin) {
      await this.authenticate();
    }
  }

  /**
   * Expone el token actual para módulos externos que lo necesiten.
   * OracleStreamer lo usa para el header Authorization del WebSocket.
   * Retorna null si aún no se ha autenticado.
   */
  getAccessToken(): string | null {
    return this.accessToken;
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
      const expiresIn: number = response.data.expires_in ?? 3600;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      console.log(
        `✅ [Oracle] Token obtenido. Expira en ${expiresIn}s.`
      );
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message;
      console.error(`❌ [Oracle] Error de autenticación [${error.response?.status}]:`, detail);
      throw new Error(`Error de Autenticación Oracle: ${detail}`);
    }
  }

  // =========================================================================
  // 👤 PERFILES DE HUÉSPED (Guest)
  // Endpoint: POST /crm/v1/profiles
  // =========================================================================

  async createGuestProfile(profileData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    language?: string;
    birthDate?: string;
    gender?: string;
    nationality?: string;
    passportNo?: string;
    vipStatus?: string;
    loyaltyNumber?: string;
  }): Promise<string> {
    await this.ensureToken();

    const customer: any = {
      personName: [
        {
          givenName: (profileData.firstName || "Huesped").trim(),
          surname: (profileData.lastName || "Sin Apellido").trim(),
          nameType: "Primary",
        },
      ],
      language: profileData.language || "E",
    };

    if (profileData.birthDate) customer.birthDate = profileData.birthDate;
    if (profileData.gender) customer.gender = profileData.gender;
    if (profileData.nationality) customer.nationality = profileData.nationality;
    if (profileData.passportNo) customer.passportNo = profileData.passportNo;
    if (profileData.vipStatus) customer.vipStatus = profileData.vipStatus;

    const profileDetails: any = {
      profileType: "Guest",
      customer,
      profileAccessType: {
        hotelId: config.oracle.hotelId,
        sharedLevel: "Property",
      },
    };

    if (profileData.email) {
      profileDetails.emails = {
        emailInfo: [
          {
            email: {
              type: "EMAIL",
              emailAddress: profileData.email.trim(),
              primaryInd: true,
            },
          },
        ],
      };
    }

    if (profileData.phone) {
      profileDetails.telephones = {
        telephoneInfo: [
          {
            telephone: {
              phoneTechType: "PHONE",
              phoneNumber: profileData.phone.trim(),
              primaryInd: true,
            },
          },
        ],
      };
    }

    const hasAddress = profileData.address || profileData.city || profileData.country;
    if (hasAddress) {
      const addressBlock: any = { type: "HOME", primaryInd: true };
      if (profileData.address) addressBlock.addressLine = [profileData.address.trim()];
      if (profileData.city) addressBlock.cityName = profileData.city.trim();
      if (profileData.country) addressBlock.country = { code: profileData.country.trim() };
      profileDetails.addresses = { addressInfo: [{ address: addressBlock }] };
    }

    if (profileData.loyaltyNumber) {
      profileDetails.loyalties = {
        loyaltyInfo: [
          {
            loyaltyNumber: profileData.loyaltyNumber.trim(),
            programCode: "RC", // Relais & Châteaux
            primaryInd: true,
          },
        ],
      };
    }

    try {
      console.log(
        `📡 [Oracle] Creando perfil Guest: ${profileData.firstName} ${profileData.lastName}`
      );
      const response = await axios.post(
        `${config.oracle.baseUrl}/crm/v1/profiles`,
        { profileDetails },
        { headers: this.getHeaders() }
      );

      const oracleId =
        response.data?.profileIdList?.[0]?.id ||
        response.headers.location?.split("/").pop();

      if (!oracleId) {
        throw new Error("Oracle no devolvió un ID de perfil Guest.");
      }

      console.log(`✅ [Oracle] Perfil Guest creado. ID: ${oracleId}`);
      return String(oracleId);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message;
      console.error(`❌ [Oracle] createGuestProfile [${error.response?.status}]:`, detail);
      throw error;
    }
  }

  async updateGuestProfile(
    oracleId: string,
    properties: {
      firstname?: string;
      lastname?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      language?: string;
      birthDate?: string;
      gender?: string;
      nationality?: string;
      passportNo?: string;
      vipStatus?: string;
      loyaltyNumber?: string;
    }
  ): Promise<void> {
    await this.ensureToken();

    if (!properties.lastname) {
      console.log("⚠️ [Oracle] Update Guest cancelado: falta apellido obligatorio.");
      return;
    }

    const customer: any = {
      personName: [
        {
          givenName: (properties.firstname || "").trim(),
          surname: properties.lastname.trim(),
          nameType: "Primary",
        },
      ],
    };

    if (properties.language) customer.language = properties.language;
    if (properties.birthDate) customer.birthDate = properties.birthDate;
    if (properties.gender) customer.gender = properties.gender;
    if (properties.nationality) customer.nationality = properties.nationality;
    if (properties.passportNo) customer.passportNo = properties.passportNo;
    if (properties.vipStatus) customer.vipStatus = properties.vipStatus;

    const body: any = {
      profileDetails: {
        profileType: "Guest",
        customer,
      },
    };

    if (properties.email) {
      body.profileDetails.emails = {
        emailInfo: [
          {
            email: {
              type: "EMAIL",
              emailAddress: properties.email.trim(),
              primaryInd: true,
            },
          },
        ],
      };
    }

    if (properties.phone) {
      body.profileDetails.telephones = {
        telephoneInfo: [
          {
            telephone: {
              phoneTechType: "PHONE",
              phoneNumber: properties.phone.trim(),
              primaryInd: true,
            },
          },
        ],
      };
    }

    const hasAddress = properties.address || properties.city || properties.country;
    if (hasAddress) {
      const addressBlock: any = { type: "HOME", primaryInd: true };
      if (properties.address) addressBlock.addressLine = [properties.address.trim()];
      if (properties.city) addressBlock.cityName = properties.city.trim();
      if (properties.country) addressBlock.country = { code: properties.country.trim() };
      body.profileDetails.addresses = { addressInfo: [{ address: addressBlock }] };
    }

    if (properties.loyaltyNumber) {
      body.profileDetails.loyalties = {
        loyaltyInfo: [
          {
            loyaltyNumber: properties.loyaltyNumber.trim(),
            programCode: "RC",
            primaryInd: true,
          },
        ],
      };
    }

    try {
      await axios.put(
        `${config.oracle.baseUrl}/crm/v1/profiles/${oracleId}`,
        body,
        { headers: this.getHeaders() }
      );
      console.log(`✅ [Oracle] Perfil Guest ${oracleId} actualizado.`);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message;
      console.error(
        `❌ [Oracle] updateGuestProfile ${oracleId} [${error.response?.status}]:`,
        detail
      );
      throw error;
    }
  }

  // =========================================================================
  // 🗑️ ANONIMIZAR PERFIL (Contact o Company)
  //
  // Endpoint verificado en ApiOracleCRM.json:
  //   DELETE /crm/v1/profiles/{profileId}   operationId: deleteProfile
  //
  // ⚠️ Oracle NO elimina el registro — lo ANONIMIZA.
  //   Borra nombre, email, teléfono y datos personales, pero conserva
  //   el ID y el historial de reservas por cumplimiento de auditoría.
  //   Este es el comportamiento estándar de OPERA Cloud.
  //
  // Aplica a profileType: Guest, Company, Agent (Travel Agent).
  // =========================================================================

  async anonymizeProfile(oracleId: string): Promise<void> {
    await this.ensureToken();

    try {
      console.log(`📡 [Oracle] Anonimizando perfil ${oracleId}...`);

      await axios.delete(
        `${config.oracle.baseUrl}/crm/v1/profiles/${oracleId}`,
        { headers: this.getHeaders() }
      );

      console.log(`✅ [Oracle] Perfil ${oracleId} anonimizado.`);
    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail || error.message;
      console.error(
        `❌ [Oracle] anonymizeProfile ${oracleId} [${status}]:`,
        detail
      );
      throw error;
    }
  }

  // =========================================================================
  // 🏨 CANCELAR RESERVA
  //
  // Endpoint verificado en ApiOracleReservations.json:
  //   POST /hotels/{hotelId}/reservations/{reservationId}/cancellations
  //   operationId: postCancelReservation
  //
  // ⚠️ Oracle NO permite eliminar reservas confirmadas permanentemente.
  //   La cancelación es el único mecanismo disponible para ellas.
  // =========================================================================

  async cancelReservation(
    oracleReservationId: string,
    reasonCode: string = config.oracle.cancellationReasonCode
  ): Promise<string | null> {
    await this.ensureToken();

    const body = {
      reason: {
        description: "Cancelled from HubSpot",
        code: reasonCode,
      },
      reservations: [
        {
          reservationIdList: [
            { id: String(oracleReservationId), type: "Reservation" },
          ],
          allowedActions: ["Cancel"],
          hotelId: config.oracle.hotelId,
          cxlInstr: {
            deleteResTraces: false,
          },
        },
      ],
      verificationOnly: false,
    };

    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations/${oracleReservationId}/cancellations`;

    try {
      console.log(
        `📡 [Oracle] Cancelando reserva ${oracleReservationId} con código "${reasonCode}"...`
      );

      const response = await axios.post(url, body, {
        headers: this.getHeaders(),
      });

      const cancellationNumber: string | null =
        response.data?.cxlActivityLog?.[0]?.cancellationIdList?.[0]?.id
        ?? null;

      console.log(
        `✅ [Oracle] Reserva ${oracleReservationId} cancelada. ` +
        `Número de cancelación: ${cancellationNumber ?? "no devuelto"}`
      );

      return cancellationNumber;
    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail || error.message;
      console.error(
        `❌ [Oracle] cancelReservation ${oracleReservationId} [${status}]:`,
        detail
      );
      throw error;
    }
  }

  // =========================================================================
  // 🏢 PERFILES DE EMPRESA (Company / Travel Agent)
  // Endpoint: POST /crm/v1/companies
  // =========================================================================

  async createCompanyProfile(
    companyName: string,
    profileType: "Company" | "Agent"
  ): Promise<string> {
    await this.ensureToken();

    const body = {
      companyDetails: {
        company: {
          companyName: companyName.trim(),
          language: "E",
        },
        profileType,
        profileAccessType: {
          hotelId: config.oracle.hotelId,
          sharedLevel: "Property",
        },
      },
    };

    try {
      console.log(
        `📡 [Oracle] Creando perfil ${profileType}: "${companyName}"`
      );
      const response = await axios.post(
        `${config.oracle.baseUrl}/crm/v1/companies`,
        body,
        { headers: this.getHeaders() }
      );

      const oracleId =
        response.data?.companyIdList?.[0]?.id ||
        response.headers.location?.split("/").pop();

      if (!oracleId) {
        throw new Error(
          `Oracle no devolvió un ID de empresa para "${companyName}".`
        );
      }

      console.log(
        `✅ [Oracle] Perfil ${profileType} "${companyName}" creado. ID: ${oracleId}`
      );
      return String(oracleId);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message;
      console.error(
        `❌ [Oracle] createCompanyProfile [${error.response?.status}]:`,
        detail
      );
      throw error;
    }
  }

  // =========================================================================
  // 🏢 ACTUALIZAR PERFIL DE EMPRESA
  //
  // Endpoint: PUT /crm/v1/profiles/{profileId}   operationId: putProfile
  // =========================================================================

  async updateCompanyProfile(
    oracleId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      country?: string;
    }
  ): Promise<void> {
    await this.ensureToken();

    if (!data.name || !data.name.trim()) {
      console.log(
        `⚠️ [Oracle] updateCompanyProfile ${oracleId}: falta companyName obligatorio. Operación cancelada.`
      );
      return;
    }

    const body: any = {
      profileDetails: {
        company: {
          companyName: data.name.trim(),
          language: "E",
        },
      },
    };

    if (data.email && data.email.trim()) {
      body.profileDetails.emails = {
        emailInfo: [
          {
            email: {
              type: "EMAIL",
              emailAddress: data.email.trim(),
              primaryInd: true,
            },
          },
        ],
      };
    }

    if (data.phone && data.phone.trim()) {
      body.profileDetails.telephones = {
        telephoneInfo: [
          {
            telephone: {
              phoneTechType: "PHONE",
              phoneNumber: data.phone.trim(),
              primaryInd: true,
            },
          },
        ],
      };
    }

    const hasAddress = data.address || data.city || data.country;
    if (hasAddress) {
      const addressBlock: any = {
        type: "BUSINESS",
        primaryInd: true,
        language: "E",
      };
      if (data.address) addressBlock.addressLine = [data.address.trim()];
      if (data.city) addressBlock.cityName = data.city.trim();
      if (data.country) addressBlock.country = { code: data.country.trim() };

      body.profileDetails.addresses = {
        addressInfo: [{ address: addressBlock }],
      };
    }

    try {
      console.log(
        `📡 [Oracle] Actualizando perfil empresa ${oracleId}: "${data.name}"`
      );
      await axios.put(
        `${config.oracle.baseUrl}/crm/v1/profiles/${oracleId}`,
        body,
        { headers: this.getHeaders() }
      );
      console.log(
        `✅ [Oracle] Perfil empresa ${oracleId} actualizado.`
      );
    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail || error.message;
      console.error(
        `❌ [Oracle] updateCompanyProfile ${oracleId} [${status}]:`,
        detail
      );
      throw error;
    }
  }

  // =========================================================================
  // 🛏️ RESERVAS
  // =========================================================================

  async createReservationInOracle(reservationPayload: any): Promise<any> {
    await this.ensureToken();

    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations`;

    try {
      console.log("📡 [Oracle] Creando reserva...");
      console.log(
        "📤 [Oracle] Payload:",
        JSON.stringify(reservationPayload, null, 2)
      );

      const response = await axios.post(url, reservationPayload, {
        headers: this.getHeaders(),
      });

      const resId =
        response.data?.reservationIdList?.[0]?.id ||
        response.headers.location?.split("/").pop() ||
        "Desconocido";

      console.log(`✅ [Oracle] Reserva creada. ID interno: ${resId}`);
      return { id: resId, raw: response.data };
    } catch (error: any) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message;
      console.error(
        `❌ [Oracle] createReservationInOracle [${error.response?.status}]:`,
        detail
      );
      throw new Error(`Fallo en Oracle al crear reserva: ${error.message}`);
    }
  }

  async updateReservation(
    reservationId: string,
    data: any
  ): Promise<any> {
    await this.ensureToken();

    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations/${reservationId}`;

    try {
      console.log(`📡 [Oracle] Actualizando reserva ${reservationId}...`);
      const response = await axios.put(url, data, {
        headers: this.getHeaders(),
      });
      console.log(`✅ [Oracle] Reserva ${reservationId} actualizada.`);
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message;
      console.error(
        `❌ [Oracle] updateReservation ${reservationId} [${error.response?.status}]:`,
        detail
      );
      throw new Error(`Fallo al actualizar reserva Oracle: ${detail}`);
    }
  }

  async getReservation(reservationId: string): Promise<any> {
    await this.ensureToken();

    const url = `${config.oracle.baseUrl}/rsv/v1/hotels/${config.oracle.hotelId}/reservations/${reservationId}`;

    try {
      const response = await axios.get(url, { headers: this.getHeaders() });
      return response.data;
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.message;
      console.error(
        `❌ [Oracle] getReservation ${reservationId} [${error.response?.status}]:`,
        detail
      );
      return null;
    }
  }
}
