// 3.1 - Capa de aplicación (jobs/) — contiene la lógica de negocio pura. No sabe nada de HTTP ni de la cola.

import { OracleClient } from "../infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "../infrastructure/hubspot/HubSpotClient.js";
import { mapHubSpotContactToGuestProfile } from "../application/mappers.js";

// Instancias compartidas con index.ts — se importan del mismo módulo
// para no crear conexiones duplicadas.
const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// ============================================================================
// 👤 JOB: Procesar Contacto
//
// Lógica pura extraída del webhook POST /webhook/hubspot/contact.
// No recibe req/res — solo datos y lanza excepciones si algo falla.
// El worker en queue/worker.ts maneja los reintentos.
//
// Flujo:
//   1. Obtener datos frescos del contacto desde HubSpot
//   2. Si ya tiene id_oracle → actualizar perfil Guest en Oracle
//   3. Si no tiene id_oracle → crear perfil Guest en Oracle y guardar el ID
// ============================================================================

export async function processContact(payload: { contactId: string }): Promise<void> {
    const { contactId } = payload;
    console.log(`👤 [Job:Contact] Procesando contacto HubSpot ${contactId}`);

    // 1. Obtener datos frescos desde HubSpot
    const hsContact = await hubspot.getContactById(contactId);

    // 2. Si ya tiene id_oracle → actualizar perfil existente en Oracle
    if (hsContact.id_oracle) {
        console.log(
            `🔄 [Job:Contact] Contacto ${contactId} ya tiene Oracle ID ${hsContact.id_oracle}. Actualizando...`
        );
        await oracle.updateGuestProfile(hsContact.id_oracle, {
            firstname: hsContact.firstName,
            lastname: hsContact.lastName,
            email: hsContact.email,
        });
        console.log(
            `✅ [Job:Contact] Perfil Oracle ${hsContact.id_oracle} actualizado.`
        );
        return;
    }

    // 3. Sin id_oracle → crear perfil Guest nuevo en Oracle
    const profileData = mapHubSpotContactToGuestProfile(hsContact);
    const oracleId = await oracle.createGuestProfile(profileData);

    // 4. Guardar el id_oracle en el Contacto de HubSpot
    await hubspot.updateOracleId(contactId, oracleId);

    console.log(
        `✅ [Job:Contact] Contacto ${contactId} → Oracle Guest ${oracleId}`
    );
}