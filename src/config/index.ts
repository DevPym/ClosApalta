import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3000,
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || "",
    appId: process.env.HUBSPOT_APP_ID || "32858611",
  },
  oracle: {
    baseUrl: process.env.ORACLE_BASE_URL || "",
    clientId: process.env.ORACLE_CLIENT_ID || "",
    clientSecret: process.env.ORACLE_CLIENT_SECRET || "",
    appKey: process.env.ORACLE_APP_KEY || "",
    hotelId: process.env.ORACLE_HOTEL_ID || "CAR",
    // ✅ FIX #10: EnterpriseId sacado del .env en vez de hardcodeado
    enterpriseId: process.env.ORACLE_ENTERPRISE_ID || "CLOSAP",
    username: process.env.ORACLE_USERNAME || "",
    password: process.env.ORACLE_PASSWORD || "",
  },
};

// 🛡️ Validación de arranque: si falta alguna variable crítica, el puente no inicia.
// ✅ FIX: Se agregaron ORACLE_BASE_URL, ORACLE_CLIENT_ID y ORACLE_CLIENT_SECRET
//        que son necesarias para la autenticación OAuth pero no estaban validadas.
const requiredConfigs: { val: string; name: string }[] = [
  { val: config.oracle.baseUrl, name: 'ORACLE_BASE_URL' },
  { val: config.oracle.clientId, name: 'ORACLE_CLIENT_ID' },
  { val: config.oracle.clientSecret, name: 'ORACLE_CLIENT_SECRET' },
  { val: config.oracle.appKey, name: 'ORACLE_APP_KEY' },
  { val: config.hubspot.accessToken, name: 'HUBSPOT_ACCESS_TOKEN' },
];

requiredConfigs.forEach(({ val, name }) => {
  if (!val) {
    throw new Error(`❌ ERROR CRÍTICO: Falta la variable de entorno ${name} en el archivo .env`);
  }
});

console.log("✅ Configuración cargada y validada correctamente.");