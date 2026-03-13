/**
 * src/webhooks/server.ts
 *
 * 🔔 Servidor auxiliar para webhooks entrantes de Oracle → HubSpot.
 * Este archivo existe como punto de extensión futuro y actualmente NO se
 * inicia por sí solo. Su función startWebhookServer() debe integrarse en
 * src/index.ts cuando se active la dirección Oracle → HubSpot.
 *
 * ⚠️ NO llamar a startWebhookServer() mientras src/index.ts ya esté
 *    escuchando en el mismo puerto: causaría un conflicto EADDRINUSE.
 *
 * TODO: Cuando se active, mover las rutas de Oracle aquí y registrarlas
 *       en src/index.ts como un Router de Express.
 */

// ================================================================================
// Importaciones y configuración - Router auxiliar para eventos entrantes de Oracle
// ================================================================================

import express from 'express';
import type { Request, Response } from 'express';
import { mapOracleToUnified } from '../application/mappers.js';
import { HubSpotClient } from '../infrastructure/hubspot/HubSpotClient.js';

const hubspotClient = new HubSpotClient();

// Usar como Router en lugar de una app independiente evita el conflicto de puerto.
// Ejemplo de integración en src/index.ts:
//   import { oracleWebhookRouter } from './webhooks/server.js';
//   app.use('/webhooks', oracleWebhookRouter);
export const oracleWebhookRouter = express.Router();

// ============================================================================
// 🔔 Oracle → HubSpot: Perfil creado o actualizado
// ============================================================================
oracleWebhookRouter.post('/oracle', async (req: Request, res: Response) => {
  const event = req.body;
  console.log('🔔 [Webhook] Evento recibido de Oracle:', event.eventType);

  if (event.eventType === 'ProfileCreated' || event.eventType === 'ProfileUpdated') {
    try {
      const unifiedContact = mapOracleToUnified(event);
      console.log(`👤 [Webhook] Procesando contacto: ${unifiedContact.firstName} ${unifiedContact.lastName}`);
      await hubspotClient.syncContact(unifiedContact);
      res.status(200).json({ success: true, message: "Contacto sincronizado con HubSpot" });
    } catch (error: any) {
      console.error('❌ [Webhook] Error procesando evento de Oracle:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
    return;
  }

  // Evento no manejado: respondemos 200 para que Oracle no reintente indefinidamente
  res.status(200).send('Event Received');
});