// Instancias singleton de los clientes de infraestructura.
// Un único OracleClient = un único token OAuth compartido por todos los jobs.
// Un único HubSpotClient = una única conexión al SDK de HubSpot.
//
// Importar desde aquí en lugar de crear instancias en cada job file.

import { OracleClient } from "../infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "../infrastructure/hubspot/HubSpotClient.js";

export const oracle = new OracleClient();
export const hubspot = new HubSpotClient();
