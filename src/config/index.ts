import dotenv from 'dotenv';
dotenv.config();

export const config = {
  oracle: {
    clientId: process.env.ORACLE_CLIENT_ID || '',
    clientSecret: process.env.ORACLE_CLIENT_SECRET || '',
    appKey: process.env.ORACLE_APP_KEY || '',
    hotelId: process.env.ORACLE_HOTEL_ID || '',
    baseUrl: process.env.ORACLE_BASE_URL || '',

    username: process.env.ORACLE_USERNAME || '',
    password: process.env.ORACLE_PASSWORD || '',
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || '',
  },
  server: {
    port: process.env.PORT || 3000,
    webhookSecret: process.env.WEBHOOK_SECRET || '',
  }
};

// 🛡️ Validación: Si falta uno de estos, el puente no arranca
const requiredConfigs = [
  { val: config.oracle.appKey, name: 'ORACLE_APP_KEY' },
  { val: config.oracle.username, name: 'ORACLE_USERNAME' },
  { val: config.oracle.password, name: 'ORACLE_PASSWORD' },
  { val: config.hubspot.accessToken, name: 'HUBSPOT_ACCESS_TOKEN' }
];

requiredConfigs.forEach(item => {
  if (!item.val) {
    throw new Error(`❌ ERROR CRÍTICO: Falta ${item.name} en el archivo .env`);
  }
});

console.log("✅ Configuración cargada y validada correctamente.");