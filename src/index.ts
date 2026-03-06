import express from "express";
import { config } from "./config/index.js";
import { OracleClient } from "./infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "./infrastructure/hubspot/HubSpotClient.js";
import { mapOracleReservation, mapOracleToUnified } from "./application/mappers.js";

const app = express();
app.use(express.json());

// Instanciamos los clientes una sola vez
const oracle = new OracleClient();
const hubspot = new HubSpotClient();

// 🧪 1. RUTA DE PRUEBA MANUAL (Para buscar en Oracle y enviar a HubSpot)
app.get("/test-sync/:id", async (req, res) => {
  try {
    const profileId = req.params.id;
    console.log(`🔍 Iniciando sincronización manual para: ${profileId}`);

    // Solo traemos el perfil (El MVP es de contactos, no necesitamos la reserva aquí)
    const profileData = await oracle.getGuestProfile(profileId);

    // Usamos nuestra nueva función unificada
    const unified = mapOracleToUnified(profileData);

    const result = await hubspot.syncContact(unified);
    console.log("✅ ÉXITO TOTAL EN HUBSPOT");

    res.json({
      success: true,
      hubspotId: (result as any)?.id || "Actualizado",
      email: unified.email,
    });
  } catch (error: any) {
    console.error("❌ ERROR EN EL FLUJO:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔔 2. NUEVA RUTA WEBHOOK (Para que Oracle nos avise automáticamente)
app.post('/webhook/oracle', async (req, res) => {
  console.log('\n🔔 [WEBHOOK] ¡Alerta recibida desde Oracle!');

  try {
    const oraclePayload = req.body;

    // 1. Traducir el idioma de Oracle a nuestro idioma unificado
    const unifiedContact = mapOracleToUnified(oraclePayload);
    console.log(`👤 Procesando contacto Webhook: ${unifiedContact.firstName} ${unifiedContact.lastName}`);

    // 2. Enviar a HubSpot (Nuestro método Upsert inteligente)
    await hubspot.syncContact(unifiedContact);

    // 3. Responder con un 200 OK rápido (A Oracle no le gusta esperar)
    res.status(200).json({ success: true, message: "Contacto sincronizado con HubSpot vía Webhook" });

  } catch (error: any) {
    console.error('❌ [WEBHOOK] Error procesando el evento:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🛎️ NUEVA RUTA WEBHOOK: Escucha cuando se crea o modifica una RESERVA
app.post('/webhook/oracle/reservation', async (req, res) => {
  console.log('\n🛎️ [WEBHOOK RESERVAS] ¡Oracle reporta movimiento en una reserva!');
  
  try {
    const oracleResPayload = req.body;
    
    // 1. Mapear datos de la reserva
    const unifiedRes = mapOracleReservation(oracleResPayload);
    console.log(`🛏️ Procesando Reserva: ${unifiedRes.numero_de_reserva} para Oracle ID: ${unifiedRes.id_oracle}`);

    // 2. Enviar a HubSpot
    await hubspot.syncReservationToContact(unifiedRes);

    res.status(200).json({ success: true, message: "Reserva adjuntada al contacto en HubSpot" });

  } catch (error: any) {
    console.error('❌ [WEBHOOK RESERVAS] Error procesando la reserva:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 INICIAR EL SERVIDOR
app.listen(config.server.port, () => {
  console.log(`🚀 Puente Clos Apalta Online en puerto ${config.server.port}`);
});