/**
 * Modelo Unificado de Contacto (El "Puente")
 * Estas son las 10 propiedades core para nuestra prueba inicial.
 */
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


export interface UnifiedReservation {
  id_oracle: string;
  numero_de_huespedes: string;
  arrival: string;
  departure: string;
  fuente_de_reserva: string;
  estado_de_reserva: string;
  numero_de_reserva: string;
  habitacion: string;
  tipo_de_tarifa: string;
  numero_de_vuelo: string;
  destino_anterior: string;
  transporte: string;
  nombre_chofer_clos_apalta: string;
  numero_de_noches_de_estancia: string;
}