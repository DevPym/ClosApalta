import axios from "axios";
import { config } from "../../config/index.js";
import { profile } from "node:console";

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
      console.log(`📡 [Oracle] Creación final (estructura validada por OpenAPI) para: ${profileData.firstName} ${profileData.lastName}`);

      body = {
        profileDetails: {
          profileType: "Guest", // ✅ OBLIGATORIO: Define que es un huésped
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
                type: "EMAIL", // 🎯 CORRECCIÓN CLAVE: Ahora está DENTRO del objeto email
                emailAddress: profileData.email.trim(),
                primaryInd: true
              }
              // Ya no hay "type" ni "id" aquí afuera, lo que elimina el error de Value ID
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

      console.log(`✅ ¡ÉXITO TOTAL! Perfil creado en Oracle. ID: ${oracleId}`);
      return oracleId;
    } catch (error: any) {
      console.error("❌ Error en createGuestProfile:");
      if (error.response?.data) {
        console.error("📋 Respuesta de Oracle:", JSON.stringify(error.response.data, null, 2));
      }
      console.error("📦 Payload enviado:", JSON.stringify(body, null, 2));
      throw error;
    }
  }

  // ------------------------------------------------------------------------
  // ✏️ UPDATE: Actualizar Huésped en Oracle
  // ------------------------------------------------------------------------
  async updateGuestProfile(oracleId: string, properties: Record<string, any>) {
    if (!this.accessToken) await this.authenticate();

    // Oracle siempre requiere el apellido para un Guest
    if (!properties.lastname) {
      console.log("⚠️ Update cancelado: Falta el apellido obligatorio.");
      return;
    }

    try {
      const body: any = {
        profileDetails: {
          profileType: "Guest", // ✅ LLAVE MAESTRA OBLIGATORIA
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

      // Si el webhook detectó cambio de email, lo agregamos con la estructura estricta
      if (properties.email) {
        body.profileDetails.emails = {
          emailInfo: [{
            email: {
              type: "EMAIL", // ✅ Adentro del objeto email
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
      console.error("❌ Error en updateGuestProfile:");
      console.error("📋 Respuesta:", JSON.stringify(error.response?.data || error.message, null, 2));
    }
  }

  // ------------------------------------------------------------------------
  // 🗑️ DELETE: Inactivar Huésped en Oracle (Desde HubSpot a Oracle)
  // ------------------------------------------------------------------------
  async inactivateGuestProfile(oracleId: string) {
    if (!this.accessToken) await this.authenticate();
    try {
      console.log(`🗑️ [Oracle] Solicitud para inactivar perfil ${oracleId} recibida.`);

      /* // 🚨 CÓDIGO COMENTADO HASTA DEFINIR REGLAS DE NEGOCIO 🚨
      // Para inactivar en OPERA, usualmente se envía el estado "active: false" 
      // o se actualiza el campo de estado del perfil.
      
      const body = {
        profileDetails: {
          profileType: "Guest",
          markAsInactive: true, // Esto depende de la versión exacta de la API
          statusCode: "INACTIVE"
        }
      };

      await axios.put(
        `${config.oracle.baseUrl}/crm/v1/profiles/${oracleId}`, 
        body, 
        { headers: this.getHeaders() }
      );
      console.log(`✅ [Oracle] Perfil ${oracleId} marcado como inactivo.`);
      */

      console.log(`ℹ️ [Oracle] Acción de inactivación ignorada por el momento (Código comentado).`);
    } catch (error: any) {
      console.error(`❌ [Oracle] Error al inactivar perfil ${oracleId}:`, error.message);
    }
  }

  async getGuestProfile(profileId: string): Promise<any> {
    if (!this.accessToken) await this.authenticate();
    try {
      const response = await axios.get(
        `${config.oracle.baseUrl}/crm/v1/profiles/${profileId}`,
        { headers: this.getHeaders() }
      );
      console.log(`✅ [Oracle] Perfil ${profileId} consultado con éxito.`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [Oracle] Error al consultar perfil ${profileId}:`, error.message);
      throw error;
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
}