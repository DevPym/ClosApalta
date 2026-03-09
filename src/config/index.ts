import dotenv from 'dotenv';
dotenv.config();

// src/config/index.ts (o donde tengas tu config)

export const config = {
  server: {
    port: process.env.PORT || 3000,
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || "",
    // ✅ AÑADE ESTA LÍNEA:
    appId: process.env.HUBSPOT_APP_ID || "32858611",
  },
  oracle: {
    baseUrl: process.env.ORACLE_BASE_URL || "",
    clientId: process.env.ORACLE_CLIENT_ID || "",
    clientSecret: process.env.ORACLE_CLIENT_SECRET || "",
    appKey: process.env.ORACLE_APP_KEY || "",
    hotelId: process.env.ORACLE_HOTEL_ID || "CAR",
    username: process.env.ORACLE_USERNAME || '',
    password: process.env.ORACLE_PASSWORD || ''
  },
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