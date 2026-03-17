// ============================================================================
// Datos de contacto provenientes de HubSpot (dirección HubSpot → Oracle)
// Representa exactamente lo que getContactById() devuelve.
// ============================================================================
export interface HubSpotContactData {
  // — Identificadores —
  id: string;            // response.id del SDK (≡ hs_object_id)
  hs_object_id: string;            // ID interno de HubSpot (mismo valor que id)
  id_oracle: string | undefined; // Propiedad custom: ID del perfil en Oracle

  // — Datos personales —
  firstName: string | undefined;
  lastName: string | undefined;
  email: string | undefined;

  // — Contacto —
  phone: string | undefined;

  // — Dirección —
  address: string | undefined;
  city: string | undefined;
  country: string | undefined;

  // — Preferencias —
  idioma_preferido: string | undefined;

  // — Vinculamiento HubSpot (IDs, no nombres) —
  associatedCompanyId: string | null;  // ID de la empresa vinculada al contacto
  associatedDealId: string | null;  // ID del negocio vinculado (primero encontrado)
}

// ============================================================================
// Modelo Unificado de Contacto (capa de dominio — dirección Oracle → HubSpot)
// ============================================================================
export interface UnifiedContact {
  id_oracle: string;
  email: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  nacionalidad?: string;
  phone?: string;
  zip?: string;
  idioma_preferido?: string;
  fecha_de_nacimiento?: string;
  sexo__genero_huesped_principal?: string;
  pasaporte?: string;
  huesped_vip?: string;
  numero_de_fidelidad__relais__chateaux?: string;
}

// ============================================================================
// Modelo Unificado de Reserva (capa de dominio)
// ============================================================================
export interface UnifiedReservation {
  id_oracle: string;
  numero_de_huespedes: string;
  arrival: string;
  departure: string;
  fuente_de_reserva: string;
  estado_de_reserva: string;
  numero_de_reserva: string;
  habitacion: string;
  room_type?: string;
  tipo_de_tarifa: string;
  tipo_de_pago?: string;
  cantidad_de_habitaciones?: string;
  amount?: string;
  numero_de_vuelo: string;
  destino_anterior: string;
  transporte: string;
  nombre_chofer_clos_apalta: string;
  numero_de_noches_de_estancia: string;
  es_pseudo_room?: boolean;
  agencia_de_viajes?: string;
  id_synxis?: string;
}

// ============================================================================
// ✅ Tipo compartido entre application (mappers) e infrastructure (index.ts)
// Representa un perfil de huésped con su ID en Oracle y su rol en la reserva.
// ============================================================================
export interface GuestProfile {
  id: string;
  isPrimary: boolean;
}

// ============================================================================
// Datos de empresa provenientes de HubSpot (dirección HubSpot → Oracle)
// Representa exactamente lo que getCompanyById() devuelve.
// ============================================================================
export interface HubSpotCompanyData {
  // — Identificadores —
  id: string;            // response.id del SDK (hs_object_id de la empresa)
  id_oracle: string | undefined; // Propiedad custom: ID del perfil en Oracle

  // — Datos de empresa —
  name: string | undefined;
  phone: string | undefined;
  email: string | undefined;
  address: string | undefined;
  city: string | undefined;
  country: string | undefined;
  tipo_de_empresa: string | undefined; // Ej: "Agencia", "Hotel", "Corporativo"

  // — Identificador de agencia de viajes —
  // Si tiene código IATA → Oracle profileType = "Agent" (TravelAgent en reserva)
  // Si no tiene código IATA → Oracle profileType = "Company"
  iata_code: string | undefined;
}

// ============================================================================
// Perfil de agencia/empresa vinculado a una reserva Oracle.
// reservationProfileType es el valor que espera el campo
// reservationProfile[].reservationProfileType en la API de Oracle Reservations.
// Valores posibles según resProfileTypeType enum: "TravelAgent" | "Company"
// ============================================================================
export interface AgencyProfile {
  oracleId: string;
  reservationProfileType: "TravelAgent" | "Company";
}