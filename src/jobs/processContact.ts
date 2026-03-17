// 3.1 - Capa de aplicación (jobs/) — contiene la lógica de negocio pura. No sabe nada de HTTP ni de la cola.

import { OracleClient } from "../infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "../infrastructure/hubspot/HubSpotClient.js";
import { mapHubSpotContactToGuestProfile } from "../application/mappers.js";

const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// ============================================================================
// 👤 CREAR / ACTUALIZAR Contact
//
// Disparado por: POST /webhook/hubspot/contact
// Triggers HubSpot: contact.creation | contact.propertyChange
//
// Flujo:
//   1. Obtener datos frescos del contacto desde HubSpot
//   2. Si ya tiene id_oracle → actualizar perfil Guest en Oracle
//   3. Si no tiene id_oracle → crear perfil Guest en Oracle y guardar el ID
// ============================================================================

export async function processContact(payload: { contactId: string }): Promise<void> {
    const { contactId } = payload;
    console.log(`👤 [Job:Contact] Procesando contacto HubSpot ${contactId}`);

    const hsContact = await hubspot.getContactById(contactId);

    if (hsContact.id_oracle) {
        console.log(
            `🔄 [Job:Contact] Contacto ${contactId} ya tiene Oracle ID ${hsContact.id_oracle}. Actualizando...`
        );
        await oracle.updateGuestProfile(hsContact.id_oracle, {
            firstname: hsContact.firstName,
            lastname: hsContact.lastName,
            email: hsContact.email,
        });
        console.log(`✅ [Job:Contact] Perfil Oracle ${hsContact.id_oracle} actualizado.`);
        return;
    }

    const profileData = mapHubSpotContactToGuestProfile(hsContact);
    const oracleId = await oracle.createGuestProfile(profileData);
    await hubspot.updateOracleId(contactId, oracleId);

    console.log(`✅ [Job:Contact] Contacto ${contactId} → Oracle Guest ${oracleId}`);
}

// ============================================================================
// 🗑️ ELIMINAR Contact
//
// Disparado por: POST /webhook/hubspot/contact/delete
// Trigger HubSpot: contact.deletion
//
// ⚠️ El payload de contact.deletion NO incluye propiedades del objeto.
//    Solo entrega objectId. Se lee el objeto archivado (archived=true)
//    para recuperar id_oracle antes de operar en Oracle.
//
// Acción en Oracle:
//   DELETE /crm/v1/profiles/{id_oracle}   operationId: deleteProfile
//   Oracle ANONIMIZA el perfil (borra datos personales, conserva el registro
//   por cumplimiento de auditoría). No es eliminación permanente.
// ============================================================================

export async function deleteContact(payload: { contactId: string }): Promise<void> {
    const { contactId } = payload;
    console.log(`🗑️ [Job:DeleteContact] Eliminando Contact HubSpot ${contactId}`);

    // Leer el objeto archivado para obtener id_oracle.
    // HubSpot mantiene el objeto ~90 días después de la eliminación.
    const archived = await hubspot.getArchivedContactById(contactId);

    if (!archived) {
        // Ya fue purgado definitivamente — no hay nada que hacer en Oracle.
        console.warn(
            `⚠️ [Job:DeleteContact] Contact ${contactId} ya no existe en HubSpot ` +
            `(ni archivado). No se puede obtener id_oracle. Operación omitida.`
        );
        return;
    }

    if (!archived.id_oracle) {
        console.log(
            `ℹ️ [Job:DeleteContact] Contact ${contactId} no tenía id_oracle. ` +
            `No hay acción en Oracle.`
        );
        return;
    }

    // DELETE /crm/v1/profiles/{profileId} → anonimiza el perfil Guest
    await oracle.anonymizeProfile(archived.id_oracle);

    console.log(
        `✅ [Job:DeleteContact] Contact ${contactId} → Oracle perfil ${archived.id_oracle} anonimizado.`
    );
}