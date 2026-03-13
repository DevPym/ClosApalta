// ============================================================================
// Modelo Unificado de Contacto (capa de dominio)
// ============================================================================
export interface UnifiedContact {
  id_oracle: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  nacionalidad: string;
  phone: string;
  zip: string;
  idioma_preferido: string;
  fecha_de_nacimiento: string;
  sexo__genero_huesped_principal: string;
  pasaporte: string;
  huesped_vip: string;
  numero_de_fidelidad__relais__chateaux: string;
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