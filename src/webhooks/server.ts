import express from 'express';
import { config } from '../config/index.js';
import { mapOracleToUnified } from '../application/mappers.js';
import { HubSpotClient } from '../infrastructure/hubspot/HubSpotClient.js';



const hubspotClient = new HubSpotClient();
const app = express();
app.use(express.json());



// 🔔 ENDPOINTS  ---------------------------------------------------------------------------------------

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

// 🔔 RUTAS DE WEBHOOKS ---------------------------------------------------------------------------------------

// 1. Webhook que escucha a Oracle (Oracle ➔ Puente ➔ HubSpot)
app.post('/webhook/oracle', async (req, res) => {
  console.log('🔔 [WEBHOOK] ¡Alerta recibida desde Oracle!');

  try {
    const oraclePayload = req.body;

    // 1. Traducir el idioma de Oracle a nuestro idioma unificado
    const unifiedContact = mapOracleToUnified(oraclePayload);
    console.log(`👤 Procesando contacto: ${unifiedContact.firstName} ${unifiedContact.lastName}`);

    // 2. Enviar a HubSpot (Nuestro método Upsert inteligente)
    await hubspotClient.syncContact(unifiedContact);

    // 3. Responder con un 200 OK rápido (A los webhooks no les gusta esperar)
    res.status(200).json({ success: true, message: "Contacto sincronizado con HubSpot" });

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Error procesando el evento de Oracle:', error.message);
    // Devolvemos 500 para que Oracle sepa que falló y pueda reintentar después
    res.status(500).json({ success: false, error: error.message });
  }
});