import { config } from "./config/index.js";
import express from "express";
import { OracleClient } from "./infrastructure/oracle/OracleClient.js";
import { HubSpotClient } from "./infrastructure/hubspot/HubSpotClient.js";
import { ContactMapper } from "./application/mappers.js";

const app = express();
app.use(express.json());

const oracle = new OracleClient();
const hubspot = new HubSpotClient();

app.get("/test-sync/:id", async (req, res) => {
  try {
    const profileId = req.params.id;
    console.log(`🔍 Iniciando sincronización para: ${profileId}`);

    const profileData = await oracle.getGuestProfile(profileId);
    const reservationData = await oracle.getLatestReservation(profileId);

    const unified = ContactMapper.fromOracleToUnified(
      profileData,
      reservationData,
    );

    // Forzamos email si no existe
    if (!unified.email) {
      unified.email = `test.oracle.${profileId}@closapalta.cl`;
      console.log(`🪄 Email forzado: ${unified.email}`);
    }

    const result = await hubspot.syncContact(unified);
    console.log("✅ ÉXITO TOTAL EN HUBSPOT");

    res.json({
      success: true,
      hubspotId: result.id,
      email: unified.email,
    });
  } catch (error: any) {
    console.error("❌ ERROR EN EL FLUJO:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(config.server.port, () => {
  console.log(`🚀 Puente Clos Apalta Online en puerto ${config.server.port}`);
});
