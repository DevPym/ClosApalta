import express from 'express';
import { config } from '../config/index.js';

const app = express();
app.use(express.json());

/**
 * Endpoint para recibir Business Events de Oracle
 */
app.post('/webhooks/oracle', (req, res) => {
  const event = req.body;
  
  // Log didáctico para ver qué llega
  console.log('🔔 Evento recibido de Oracle:', event.eventType);

  if (event.eventType === 'ProfileCreated' || event.eventType === 'ProfileUpdated') {
    const profileId = event.resourceId;
    console.log(`🚀 Procesando perfil: ${profileId}`);
    // Aquí llamaremos al servicio de sincronización más adelante
  }

  res.status(200).send('Event Received');
});

export const startWebhookServer = () => {
  app.listen(config.server.port, () => {
    console.log(`🌐 Servidor de Webhooks corriendo en puerto ${config.server.port}`);
  });
};