import type { HubSpotContactData, GuestProfile } from "../domain/types.js";
import { config } from "../config/index.js";

// ============================================================================
// 🛠️ UTILIDADES
// ============================================================================

/**
 * Convierte timestamp (ms) o string de fecha a formato YYYY-MM-DD.
 * Devuelve "" si el valor no es una fecha válida.
 */
function formatDate(dateVal: any): string {
  if (!dateVal) return "";
  const raw = typeof dateVal === "object" ? dateVal.value : dateVal;
  if (!raw || raw === "0" || raw === 0) return "";
  try {
    const ts = isNaN(Number(raw)) ? raw : Number(raw);
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0] ?? "";
  } catch {
    return "";
  }
}

/**
 * Busca una clave en un diccionario.
 * Si no existe, devuelve la clave original o el fallback.
 */
const translate = (
  map: Record<string, string>,
  key: string,
  fallback: string
): string => map[key] || key || fallback;

// ============================================================================
// 📖 DICCIONARIOS DE TRADUCCIÓN
// ============================================================================

const Maps = {
  Status: {
    ToHS: {
      RESERVED: "Confirmada",
      "CHECKED IN": "Hospedado",
      "CHECKED OUT": "Salida",
      CANCELED: "Cancelada",
    },
  },
  Room: {
    ToOracle: {
      Casita: "CASITA",
      "Pool Casita": "PLCASITA",
      Villa: "VILLA",
      OWNERC: "OWNERC",
    },
  },
  Rates: {
    ToOracle: {
      Overnight: "BAROV",
      "Half Board": "BARHB",
      "Full board": "BARFB",
    },
    ToHS: {
      BAROV: "Overnight",
      BARHB: "Half Board",
      BARFB: "Full board",
      BARRO: "Overnight",
    },
  },
  Source: {
    ToHS: {
      WLK: "Walk-in (WLK)",
      GDS: "Global Distribution System (GDS)",
      OTA: "Online Travel Agency (OTA)",
      WSBE: "Web Site Booking Engine (WSBE)",
      HS: "Hubspot (HS)",
    },
  },
  Payment: {
    ToHS: {
      CASH: "CASH (Efectivo)",
      DP: "DP (Depósito Previo)",
      CO: "Cuenta por Cobrar",
      NON: "NON (None)",
      MC: "MasterCard",
      VI: "Visa",
    },
  },
  Language: {
    ToHS: {
      ES: "Español",
      EN: "Inglés",
      PT: "Portugués",
      DE: "Alemán",
      FR: "Francés",
    },
    ToOracle: {
      Español: "ES",
      Inglés: "EN",
      Portugués: "PT",
      Alemán: "DE",
      Francés: "FR",
    },
  },
  Gender: {
    ToOracle: {
      Masculino: "MALE",
      Femenino: "FEMALE",
      Otro: "UNKNOWN",
    },
  },
};

// ============================================================================
// 👤 PERFILES DE HUÉSPED
// ============================================================================

/**
 * Mapea el payload completo de un Contacto de HubSpot al formato
 * que necesita OracleClient.createGuestProfile() / updateGuestProfile().
 * Incluye todos los campos opcionales disponibles en HubSpot.
 */
export function mapHubSpotContactToGuestProfile(contact: HubSpotContactData): {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  language?: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  passportNo?: string;
  vipStatus?: string;
  loyaltyNumber?: string;
} {
  return {
    firstName: contact.firstName || "Huesped",
    lastName: contact.lastName || "Sin Apellido",
    email: contact.email || "",
    phone: contact.phone || undefined,
    address: contact.address || undefined,
    city: contact.city || undefined,
    country: contact.country || undefined,
    language: contact.idioma_preferido
      ? (Maps.Language.ToOracle[contact.idioma_preferido as keyof typeof Maps.Language.ToOracle] || undefined)
      : undefined,
    birthDate: contact.fecha_de_nacimiento || undefined,
    gender: contact.sexo__genero_huesped_principal
      ? (Maps.Gender.ToOracle[contact.sexo__genero_huesped_principal as keyof typeof Maps.Gender.ToOracle] || undefined)
      : undefined,
    nationality: contact.nacionalidad || undefined,
    passportNo: contact.pasaporte || undefined,
    vipStatus: contact.huesped_vip || undefined,
    loyaltyNumber: contact.numero_de_fidelidad__relais__chateaux || undefined,
  };
}

// ============================================================================
// 🏢 PERFILES DE EMPRESA
// ============================================================================

/**
 * Determina el profileType de Oracle según tipo_de_empresa de HubSpot.
 * - "Agencia" → "Agent" (Travel Agent en Oracle, se vincula a reserva)
 * - "Proveedor" | "CVR" | cualquier otro → "Company"
 */
export function resolveOracleCompanyType(
  tipo_de_empresa: string
): "Company" | "Agent" {
  return tipo_de_empresa === "Agencia" ? "Agent" : "Company";
}

/**
 * Construye el bloque reservationProfile para Oracle cuando la empresa
 * es una agencia de viajes (Travel Agent).
 * Según la doc oficial: resProfileTypeType enum incluye "TravelAgent".
 */
export function buildTravelAgentProfile(agencyOracleId: string): object {
  return {
    profileIdList: [{ type: "Profile", id: agencyOracleId }],
    reservationProfileType: "TravelAgent",
  };
}

// ============================================================================
// 🏨 RESERVAS (HubSpot Deal → Oracle)
// ============================================================================

/**
 * Mapea las propiedades planas de un Deal de HubSpot al payload
 * que necesita Oracle para crear o actualizar una reserva.
 *
 * @param dealProperties - El objeto .properties del Deal (ya desempaquetado)
 * @param guestProfiles  - Array de { id: oracleId, isPrimary: boolean }
 * @param travelAgentOracleId - ID Oracle de la agencia (solo si tipo_de_empresa === "Agencia")
 */
export function mapHubSpotReservationToOracle(
  dealProperties: Record<string, any>,
  guestProfiles: GuestProfile[],
  travelAgentOracleId?: string
): any {
  const props = dealProperties;

  // Seguridad de fechas: si HubSpot envía timestamp 0 o nulo, usar fallback
  const checkIn = formatDate(props.check_in) || "2027-06-01";
  const checkOut = formatDate(props.check_out) || "2027-06-05";

  // Tipo de habitación: si viene "Type 1" (valor por defecto de HubSpot) usar OWNERC
  const roomType = props.room_type?.value ?? props.room_type;
  const finalRoomType =
    !roomType || roomType === "Type 1"
      ? "OWNERC"
      : (Maps.Room.ToOracle[roomType as keyof typeof Maps.Room.ToOracle] ?? roomType);

  const reservationGuests = guestProfiles.map((profile) => ({
    profileInfo: {
      profileIdList: [{ type: "Profile", id: profile.id }],
    },
    primary: profile.isPrimary === true,
  }));

  // Bloque base de la reserva
  const reservation: any = {
    hotelId: config.oracle.hotelId,
    reservationGuests,
    roomStay: {
      roomRates: [
        {
          numberOfUnits: parseInt(props.cantidad_de_habitaciones) || 1,
          roomType: finalRoomType,
          ratePlanCode: translate(
            Maps.Rates.ToOracle,
            props.tipo_de_tarifa?.value ?? props.tipo_de_tarifa,
            "BAROV"
          ),
          sourceCode: props.fuente_de_reserva || "HS",
          marketCode: "BAR",
          start: checkIn,
          end: checkOut,
        },
      ],
      guestCounts: { adults: guestProfiles.length || 1, children: 0 },
      arrivalDate: checkIn,
      departureDate: checkOut,
    },
    reservationPaymentMethods: [
      { paymentMethod: props.tipo_de_pago || "CASH" },
    ],
  };

  // Si la empresa es una Agencia, adjuntarla como Travel Agent en la reserva
  if (travelAgentOracleId) {
    reservation.reservationProfiles = {
      reservationProfile: [buildTravelAgentProfile(travelAgentOracleId)],
    };
  }

  return {
    reservations: {
      reservation: [reservation],
    },
  };
}
