import dotenv from 'dotenv';
dotenv.config();

export const config = {
  oracle: {
    clientId: process.env.ORACLE_CLIENT_ID || '',
    clientSecret: process.env.ORACLE_CLIENT_SECRET || '',
    appKey: process.env.ORACLE_APP_KEY || '',
    hotelId: process.env.ORACLE_HOTEL_ID || '',
    baseUrl: process.env.ORACLE_BASE_URL || '',
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || '',
  },
  server: {
    port: process.env.PORT || 3000,
    webhookSecret: process.env.WEBHOOK_SECRET || '',
  }
};

// Validación simple
if (!config.oracle.appKey || !config.hubspot.accessToken) {
  throw new Error("❌ Faltan configuraciones críticas en el archivo .env");
}