// 3.3 - Capa de aplicación (jobs/) — contiene la lógica de negocio pura. No sabe nada de HTTP ni de la cola.

import { OracleClient } from "../infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "../infrastructure/hubspot/HubSpotClient.js";
import { resolveOracleCompanyType } from "../application/mappers.js";
import type { HubSpotCompanyData } from "../domain/types.js";

const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// ============================================================================
// 🏢 JOB: Procesar Company (Empresa / Agencia de viajes)
//
// Disparado por: POST /webhook/hubspot/company
// Triggers HubSpot: company.creation | company.propertyChange
//
// Lógica pura extraída del webhook. No recibe req/res — solo datos.
// El worker en queue/worker.ts maneja los reintentos con backoff exponencial.
//
// Flujo:
//   1. Obtener datos frescos de la Company desde HubSpot (todos los campos)
//   2. Validar que el campo 'name' exista (obligatorio en Oracle)
//   3. Si ya tiene id_oracle → actualizar perfil existente en Oracle
//      Endpoint verificado: PUT /crm/v1/profiles/{id_oracle}  (putProfile)
//   4. Si no tiene id_oracle → crear perfil nuevo en Oracle
//      Endpoint verificado: POST /crm/v1/companies           (postCompanyProfile)
//      Determinar profileType: resolveOracleCompanyType(tipo_de_empresa)
//        "Agencia" → "Agent"     → Oracle Travel Agent profile
//        cualquier otro → "Company" → Oracle Company profile
//   5. Guardar el id_oracle devuelto por Oracle de vuelta en HubSpot
//
// Retorno esperado:
//   El id interno de Oracle (corporateId/profileId) queda guardado en
//   la propiedad 'id_oracle' del objeto Company en HubSpot.
// ============================================================================

export async function processCompany(payload: { companyId: string }): Promise<void> {
    const { companyId } = payload;
    console.log(`🏢 [Job:Company] Procesando Company HubSpot ${companyId}`);

    // ── PASO 1: Datos frescos de la Company desde HubSpot ───────────────────
    // getCompanyById() ahora devuelve todos los campos de HubSpotCompanyData:
    // name, phone, email, address, city, country, iata_code, tipo_de_empresa, id_oracle
    const hsCompany: HubSpotCompanyData | null = await hubspot.getCompanyById(companyId);

    if (!hsCompany) {
        // getCompanyById ya registró el error; lanzamos para que el worker reintente
        throw new Error(
            `[Job:Company] No se pudo obtener la Company ${companyId} de HubSpot.`
        );
    }

    // ── PASO 2: Validar campo obligatorio ────────────────────────────────────
    // Oracle requiere companyName para cualquier operación sobre el perfil.
    if (!hsCompany.name || !hsCompany.name.trim()) {
        // No reintentamos: si no tiene nombre no hay nada que hacer.
        // Registramos y salimos limpiamente (sin throw).
        console.warn(
            `⚠️ [Job:Company] Company ${companyId} no tiene nombre (campo 'name' vacío). Sincronización omitida.`
        );
        return;
    }

    // ── PASO 3: Ya tiene id_oracle → ACTUALIZAR perfil en Oracle ─────────────
    if (hsCompany.id_oracle) {
        console.log(
            `🔄 [Job:Company] Company ${companyId} ya tiene Oracle ID ${hsCompany.id_oracle}. Actualizando...`
        );

        // updateCompanyProfile usa PUT /crm/v1/profiles/{id_oracle}
        // Verificado en ApiOracleCRM.json: operationId putProfile
        await oracle.updateCompanyProfile(hsCompany.id_oracle, {
            name: hsCompany.name,
            phone: hsCompany.phone,
            email: hsCompany.email,
            address: hsCompany.address,
            city: hsCompany.city,
            country: hsCompany.country,
        });

        console.log(
            `✅ [Job:Company] Company ${companyId} → Oracle perfil ${hsCompany.id_oracle} actualizado.`
        );
        return;
    }

    // ── PASO 4: Sin id_oracle → CREAR perfil nuevo en Oracle ─────────────────
    // resolveOracleCompanyType:  tipo_de_empresa="Agencia" → "Agent"
    //                            cualquier otro valor      → "Company"
    const profileType = resolveOracleCompanyType(hsCompany.tipo_de_empresa ?? "");

    console.log(
        `📡 [Job:Company] Creando perfil Oracle tipo "${profileType}" para "${hsCompany.name}"`
    );

    // createCompanyProfile usa POST /crm/v1/companies
    // Verificado en ApiOracleCRM.json: operationId postCompanyProfile
    // Devuelve el corporateId (ID interno de Oracle)
    const oracleId = await oracle.createCompanyProfile(hsCompany.name, profileType);

    // ── PASO 5: Guardar id_oracle en HubSpot ─────────────────────────────────
    // updateCompany escribe la propiedad 'id_oracle' en el objeto Company de HubSpot.
    // Esta es la misma propiedad 'id_oracle' usada en contactos y deals.
    await hubspot.updateCompany(companyId, { id_oracle: oracleId });

    console.log(
        `✅ [Job:Company] Company ${companyId} "${hsCompany.name}" → Oracle ${profileType} ID: ${oracleId}`
    );
}