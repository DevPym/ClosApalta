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

// ⚠️ MÓDULO INACTIVO — No importar desde index.ts hasta activar Oracle → HubSpot.
// TODO: Implementar mapOracleToUnified() en src/application/mappers.ts y registrar
//       este router en index.ts:
//         import { oracleWebhookRouter } from './webhooks/server.js';
//         app.use('/webhooks', oracleWebhookRouter);

export const oracleWebhookRouter = express.Router();

// ============================================================================
// 🔔 Oracle → HubSpot: Perfil creado o actualizado (PENDIENTE)
// ============================================================================
oracleWebhookRouter.post('/oracle', (_req: Request, res: Response) => {
  console.warn('⚠️ [Webhook] Dirección Oracle → HubSpot pendiente de implementar.');
  res.status(501).json({ success: false, message: "No implementado aún" });
});