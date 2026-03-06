/**
 * Modelo Unificado de Contacto (El "Puente")
 * Estas son las 10 propiedades core para nuestra prueba inicial.
 */
export interface UnifiedContact {
  // Datos Básicos
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Datos de Identidad / Origen
  nationality: string;       // ISO Code
  oracleProfileId: string;   // ID del perfil en Opera
  
  // Preferencias (Extraídas de Dietary Preferences)
  breadPreference: string;   
  milkPreference: string;
  
  // Estatus y Estancia
  vipStatus: string;
  lastArrivalDate?: string;  // Fecha de la última reserva
}