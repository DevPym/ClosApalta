import axios from "axios";
import { config } from "../../config/index.js";

export class OracleClient {
  private accessToken: string | null = null;
  // Fix: guardar timestamp de expiración para renovar antes de que caduque
  private tokenExpiresAt: number = 0;

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "x-app-key": config.oracle.appKey,
      EnterpriseId: "CLOSAP",
      "x-hotelid": config.oracle.hotelId,
      "Content-Type": "application/json",
    };
  }

  // Fix: verificar expiración antes de cada llamada (margen de 60s)
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
            EnterpriseId: "CLOSAP",
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Fix: guardar cuándo expira el token (expires_in viene en segundos)
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

  async createGuestProfile(profileData: any): Promise<string> {
    await this.ensureToken();

    const body = {
      profileDetails: {
        profileType: "Guest",
        customer: {
          personName: [
            {
              givenName: (profileData.firstName || "Huesped").trim(),
              surname: (profileData.lastName || "Sin Apellido").trim(),
              nameType: "Primary",
            },
          ],
          language: "E",
        },
        emails: {
          emailInfo: [
            {
              email: {
                type: "EMAIL",
                emailAddress: profileData.email.trim(),
                primaryInd: true,
              },
            },
          ],
        },
        profileAccessType: {
          hotelId: config.oracle.hotelId,
          sharedLevel: "Property",
        },
      },
    };

    try {
      console.log(
        `📡 [Oracle] Creando perfil Guest: ${profileData.firstName} ${profileData.lastName}`
      );
      const response = await axios.post(
        `${config.oracle.baseUrl}/crm/v1/profiles`,
        body,
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
    properties: Record<string, any>
  ): Promise<void> {
    await this.ensureToken();

    if (!properties.lastname) {
      console.log("⚠️ [Oracle] Update Guest cancelado: falta apellido obligatorio.");
      return;
    }

    const body: any = {
      profileDetails: {
        profileType: "Guest",
        customer: {
          personName: [
            {
              givenName: (properties.firstname || "").trim(),
              surname: properties.lastname.trim(),
              nameType: "Primary",
            },
          ],
          language: "E",
        },
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
      // Fix: re-lanzar para que el caller sepa que falló
      throw error;
    }
  }

  // =========================================================================
  // 🏢 PERFILES DE EMPRESA (Company / Travel Agent)
  // Endpoint: POST /crm/v1/companies
  // Según la doc oficial de OHIP, tanto Company como TravelAgent
  // se crean en /crm/v1/companies con el profileType correspondiente.
  // =========================================================================

  /**
   * Crea un perfil de empresa en Oracle.
   * @param companyName - Nombre de la empresa (igual al de HubSpot)
   * @param profileType - "Company" | "Agent" según tipo_de_empresa de HubSpot
   * @returns El ID interno de Oracle (corporateId)
   */
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

      // La API devuelve el ID en companyIdList o en el header Location
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
  // Endpoint verificado en ApiOracleCRM.json:
  //   PUT /crm/v1/profiles/{profileId}   operationId: putProfile
  //
  // IMPORTANTE: No existe PUT /crm/v1/companies/{corporateID} en la API
  // oficial (solo GET). La actualización de empresas se hace mediante el
  // endpoint genérico de perfiles, igual que updateGuestProfile().
  //
  // Campos soportados por este método (todos opcionales salvo companyName):
  //   companyName  → profileDetails.company.companyName  (obligatorio en Oracle)
  //   email        → profileDetails.emails
  //   phone        → profileDetails.telephones
  //   address      → profileDetails.addresses (addressLine, cityName, country)
  // =========================================================================

  /**
   * Actualiza un perfil de empresa existente en Oracle.
   *
   * @param oracleId   - ID interno del perfil en Oracle (el corporateId guardado en HubSpot)
   * @param data       - Campos de empresa a actualizar (mínimo name es requerido)
   * @returns          - void; lanza excepción si falla
   */
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

    // companyName es el único campo obligatorio para Oracle.
    // Si no viene, no tiene sentido hacer el PUT.
    if (!data.name || !data.name.trim()) {
      console.log(
        `⚠️ [Oracle] updateCompanyProfile ${oracleId}: falta companyName obligatorio. Operación cancelada.`
      );
      return;
    }

    // ── Body base: nombre de empresa ────────────────────────────────────────
    // Según ApiOracleCRM.json > definitions > companyType:
    //   companyName: "Name of the company."
    const body: any = {
      profileDetails: {
        company: {
          companyName: data.name.trim(),
          language: "E",
        },
      },
    };

    // ── Email (opcional) ─────────────────────────────────────────────────────
    // Según ApiOracleCRM.json > definitions > companyProfileType > emails
    // Estructura idéntica a updateGuestProfile()
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

    // ── Teléfono (opcional) ──────────────────────────────────────────────────
    // Según ApiOracleCRM.json > definitions > telephoneType:
    //   phoneNumber, phoneTechType, primaryInd
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

    // ── Dirección (opcional) ─────────────────────────────────────────────────
    // Según ApiOracleCRM.json > definitions > addressType:
    //   addressLine (array), cityName, country { code, value }
    // Se incluye solo si hay al menos un campo de dirección
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
      // PUT /crm/v1/profiles/{profileId}
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
      // Re-lanzar para que el worker pueda reintentar
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