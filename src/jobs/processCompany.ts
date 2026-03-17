// 3.3 - Capa de aplicación (jobs/) — contiene la lógica de negocio pura. No sabe nada de HTTP ni de la cola.

import { OracleClient } from "../infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "../infrastructure/hubspot/HubSpotClient.js";
import { resolveOracleCompanyType } from "../application/mappers.js";
import type { HubSpotCompanyData } from "../domain/types.js";

const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// ============================================================================
// 🏢 CREAR / ACTUALIZAR Company
//
// Disparado por: POST /webhook/hubspot/company
// Triggers HubSpot: company.creation | company.propertyChange
//
// Flujo:
//   1. Obtener datos frescos de la Company desde HubSpot (todos los campos)
//   2. Validar que el campo 'name' exista (obligatorio en Oracle)
//   3. Si ya tiene id_oracle → actualizar perfil existente en Oracle
//      PUT /crm/v1/profiles/{id_oracle}   operationId: putProfile
//   4. Si no tiene id_oracle → crear perfil nuevo en Oracle
//      POST /crm/v1/companies             operationId: postCompanyProfile
//      tipo_de_empresa = "Agencia" → profileType "Agent"
//      cualquier otro valor        → profileType "Company"
//   5. Guardar el id_oracle devuelto por Oracle de vuelta en HubSpot
// ============================================================================

export async function processCompany(payload: { companyId: string }): Promise<void> {
    const { companyId } = payload;
    console.log(`🏢 [Job:Company] Procesando Company HubSpot ${companyId}`);

    const hsCompany: HubSpotCompanyData | null = await hubspot.getCompanyById(companyId);

    if (!hsCompany) {
        throw new Error(
            `[Job:Company] No se pudo obtener la Company ${companyId} de HubSpot.`
        );
    }

    if (!hsCompany.name || !hsCompany.name.trim()) {
        console.warn(
            `⚠️ [Job:Company] Company ${companyId} no tiene nombre. Sincronización omitida.`
        );
        return;
    }

    if (hsCompany.id_oracle) {
        console.log(
            `🔄 [Job:Company] Company ${companyId} ya tiene Oracle ID ${hsCompany.id_oracle}. Actualizando...`
        );
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

    const profileType = resolveOracleCompanyType(hsCompany.tipo_de_empresa ?? "");
    console.log(
        `📡 [Job:Company] Creando perfil Oracle tipo "${profileType}" para "${hsCompany.name}"`
    );

    const oracleId = await oracle.createCompanyProfile(hsCompany.name, profileType);
    await hubspot.updateCompany(companyId, { id_oracle: oracleId });

    console.log(
        `✅ [Job:Company] Company ${companyId} "${hsCompany.name}" → Oracle ${profileType} ID: ${oracleId}`
    );
}

// ============================================================================
// 🗑️ ELIMINAR Company
//
// Disparado por: POST /webhook/hubspot/company/delete
// Trigger HubSpot: company.deletion
//
// ⚠️ No existe DELETE /crm/v1/companies/{id} en la API oficial de Oracle.
//    La anonimización de empresas usa el mismo endpoint que perfiles Guest:
//    DELETE /crm/v1/profiles/{profileId}   operationId: deleteProfile
//    Aplica tanto a profileType "Company" como "Agent".
// ============================================================================

export async function deleteCompany(payload: { companyId: string }): Promise<void> {
    const { companyId } = payload;
    console.log(`🗑️ [Job:DeleteCompany] Eliminando Company HubSpot ${companyId}`);

    const archived = await hubspot.getArchivedCompanyById(companyId);

    if (!archived) {
        console.warn(
            `⚠️ [Job:DeleteCompany] Company ${companyId} ya no existe en HubSpot ` +
            `(ni archivada). No se puede obtener id_oracle. Operación omitida.`
        );
        return;
    }

    if (!archived.id_oracle) {
        console.log(
            `ℹ️ [Job:DeleteCompany] Company ${companyId} no tenía id_oracle. ` +
            `No hay acción en Oracle.`
        );
        return;
    }

    // DELETE /crm/v1/profiles/{profileId} → anonimiza el perfil Company/Agent
    await oracle.anonymizeProfile(archived.id_oracle);

    console.log(
        `✅ [Job:DeleteCompany] Company ${companyId} → Oracle perfil ${archived.id_oracle} anonimizado.`
    );
}