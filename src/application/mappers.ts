import type { UnifiedContact, UnifiedReservation, GuestProfile } from "../domain/types.js";

// ============================================================================
// 🛠️ UTILIDADES DE CONVERSIÓN
//  Lógica de transformación de datos (mappers).
// ============================================================================

/**
 * Convierte cualquier formato de fecha (Timestamp, String u Objeto) a YYYY-MM-DD.
 * Retorna "" si el valor es inválido o ausente.
 */
function formatDate(dateVal: unknown): string {
  if (!dateVal) return "";
  const rawValue = typeof dateVal === 'object' && dateVal !== null
    ? (dateVal as Record<string, unknown>)['value']
    : dateVal;

  if (!rawValue || rawValue === "0" || rawValue === 0) return "";

  try {
    const timestamp = isNaN(Number(rawValue)) ? String(rawValue) : Number(rawValue);
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split('T')[0] ?? "";
  } catch {
    return "";
  }
}

/** Traduce una clave usando un diccionario; si no existe devuelve la clave o el fallback. */
const translate = (map: Record<string, string>, key: string, fallback: string): string =>
  map[key] ?? key ?? fallback;

// ============================================================================
// 📖 DICCIONARIOS
// ============================================================================

const Maps = {
  Status: {
    ToHS: {
      "RESERVED": "Confirmada",
      "CHECKED IN": "Hospedado",
      "CHECKED OUT": "Salida",
      "CANCELED": "Cancelada",
    } as Record<string, string>,
  },
  Room: {
    ToHS: {
      "1": "Cabernet Franc (1)", "2": "Petit Verdot (2)",
      "3": "Merlot (3)", "4": "Cabernet Sauvignon (4)",
      "5": "Mourvedre (5)", "6": "Syrah (6)",
      "7": "Cinsault (7)", "8": "Grenache (8)",
      "9": "Viognier (9)", "10": "Sauvignon Blanc (10)",
      "CASITA": "Casita", "PLCASITA": "Pool Casita",
      "VILLA": "Villa",
    } as Record<string, string>,
    ToOracle: {
      "Casita": "CASITA", "Pool Casita": "PLCASITA",
      "Villa": "VILLA", "OWNERC": "OWNERC",
    } as Record<string, string>,
  },
  Rates: {
    ToOracle: {
      "Overnight": "BAROV",
      "Half Board": "BARHB",
      "Full board": "BARFB",
    } as Record<string, string>,
    ToHS: {
      "BAROV": "Overnight", "BARHB": "Half Board",
      "BARFB": "Full board", "BARRO": "Overnight",
    } as Record<string, string>,
  },
  Source: {
    ToHS: {
      "WLK": "Walk-in (WLK)",
      "GDS": "Global Distribution System (GDS)",
      "OTA": "Online Travel Agency (OTA)",
      "WSBE": "Web Site Booking Engine (WSBE)",
      "HS": "Hubspot (HS)",
    } as Record<string, string>,
  },
  Payment: {
    ToHS: {
      "CASH": "CASH (Efectivo)", "DP": "DP (Depósito Previo)",
      "CO": "Cuenta por Cobrar", "NON": "NON (None)",
      "MC": "MasterCard", "VI": "Visa",
    } as Record<string, string>,
  },
  Language: {
    ToHS: {
      "ES": "Español", "EN": "Inglés", "PT": "Portugués",
      "DE": "Alemán", "FR": "Francés",
    } as Record<string, string>,
    ToOracle: {
      "Español": "ES", "Inglés": "EN", "Portugués": "PT",
      "Alemán": "DE", "Francés": "FR",
    } as Record<string, string>,
  },
};

// ============================================================================
// 👤 PERFILES (Oracle → Unificado → Oracle)
// ============================================================================

export function mapOracleToUnified(oracleData: any): UnifiedContact {
  const details = oracleData.profileDetails ?? {};
  const customer = details.customer ?? {};
  const id = String(oracleData.profileIdList?.[0]?.id ?? oracleData.id ?? "UNKNOWN");

  const person = customer.personName?.[0] ?? {};
  const email = details.emails?.emailInfo?.[0]?.email?.emailAddress
    ?? `usuario.oracle.${id}@closapalta.cl`;
  const address = details.addresses?.addressInfo?.[0]?.address ?? {};

  const ids = details.identifications?.identificationInfo ?? [];
  const passport = (ids as any[]).find(
    (i) => i.identification?.idType === "PASSPORT"
  )?.identification?.idNumber ?? "";

  const memberships = details.memberships?.membershipInfo ?? [];
  const rcNumber = (memberships as any[]).find(
    (m) => m.membership?.membershipType === "RC"
  )?.membership?.membershipNumber ?? "";

  return {
    id_oracle: id,
    email,
    firstName: String(person.givenName ?? ""),
    lastName: String(person.surname ?? ""),
    address: String(address.addressLine?.[0] ?? address.streetAddress ?? ""),
    city: String(address.cityName ?? ""),
    state: String(address.state ?? ""),
    country: String(customer.citizenCountry?.code ?? ""),
    nacionalidad: String(customer.citizenCountry?.code ?? ""),
    phone: String(details.phones?.phoneInfo?.[0]?.phone?.phoneNumber ?? ""),
    zip: String(address.postalCode ?? address.zipCode ?? ""),
    idioma_preferido: translate(Maps.Language.ToHS, String(customer.language ?? "").toUpperCase(), "Español"),
    fecha_de_nacimiento: formatDate(customer.birthDate),
    sexo__genero_huesped_principal: String(customer.gender ?? ""),
    pasaporte: passport,
    huesped_vip: customer.vipStatus ? "Sí" : "No",
    numero_de_fidelidad__relais__chateaux: rcNumber,
  };
}

export function mapHubSpotToOracle(unified: UnifiedContact): any {
  const body: any = {
    profileDetails: {
      customer: {
        personName: [{
          givenName: unified.firstName,
          surname: unified.lastName,
          nameType: "Primary",
        }],
        language: translate(Maps.Language.ToOracle, unified.idioma_preferido ?? "", "ES"),
        birthDate: unified.fecha_de_nacimiento || undefined,
        gender: unified.sexo__genero_huesped_principal || undefined,
        citizenCountry: { code: unified.country || unified.nacionalidad || "CL" },
      },
      emails: {
        emailInfo: [{ email: { emailAddress: unified.email }, primaryInd: true, type: "EMAIL" }],
      },
      phones: {
        phoneInfo: [{ phone: { phoneNumber: unified.phone }, primaryInd: true, type: "MOBILE" }],
      },
      addresses: {
        addressInfo: [{
          address: {
            addressLine: [unified.address],
            cityName: unified.city,
            state: unified.state,
            country: { code: unified.country || "CL" },
            postalCode: unified.zip,
          },
          primaryInd: true,
          type: "HOME",
        }],
      },
    },
  };

  if (unified.pasaporte) {
    body.profileDetails.identifications = {
      identificationInfo: [{
        identification: { idType: "PASSPORT", idNumber: unified.pasaporte },
      }],
    };
  }
  if (unified.numero_de_fidelidad__relais__chateaux) {
    body.profileDetails.memberships = {
      membershipInfo: [{
        membership: {
          membershipType: "RC",
          membershipNumber: unified.numero_de_fidelidad__relais__chateaux,
        },
      }],
    };
  }

  return body;
}

// ============================================================================
// 🏨 RESERVAS (Oracle → Unificado → Oracle)
// ============================================================================

export function mapOracleReservation(oracleRes: any): UnifiedReservation {
  const res = oracleRes.reservation ?? oracleRes;
  const roomStay = res.roomStay ?? {};
  const transport = res.transportation ?? {};

  const agency = ((res.attachedProfiles ?? []) as any[])
    .find((p) => p.reservationProfileType === "TravelAgent")?.name ?? "";
  const synxisId = ((res.externalReferences ?? []) as any[])
    .find((ref) => ["SYNXIS", "SYNXIS2"].includes(ref.idContext))?.id ?? "";

  // ✅ FIX #14: Eliminado el cast "as unknown as UnifiedReservation".
  //    Cada campo ahora se convierte explícitamente al tipo correcto.
  const result: UnifiedReservation = {
    id_oracle: String(res.reservationGuest?.id ?? ""),
    numero_de_reserva: String(
      ((res.reservationIdList ?? []) as any[]).find((id) => id.type === "Reservation")?.id ?? ""
    ),
    id_synxis: synxisId,
    numero_de_huespedes: String(roomStay.adultCount ?? 1),
    arrival: formatDate(roomStay.arrivalDate),
    departure: formatDate(roomStay.departureDate),
    estado_de_reserva: translate(Maps.Status.ToHS, String(res.reservationStatus ?? ""), String(res.reservationStatus ?? "")),
    habitacion: translate(Maps.Room.ToHS, String(roomStay.roomId ?? ""), "Por definir"),
    es_pseudo_room: Boolean(roomStay.pseudoRoom),
    agencia_de_viajes: agency,
    fuente_de_reserva: translate(Maps.Source.ToHS, String(roomStay.sourceCode ?? ""), "Web Site Booking Engine (WSBE)"),
    tipo_de_tarifa: translate(Maps.Rates.ToHS, String(roomStay.ratePlanCode ?? ""), "Overnight"),
    tipo_de_pago: translate(Maps.Payment.ToHS, String(res.reservationPaymentMethod?.paymentMethod ?? ""), "NON (None)"),
    cantidad_de_habitaciones: String(roomStay.numberOfRooms ?? 1),
    numero_de_vuelo: String(transport.flightNumber ?? ""),
    destino_anterior: String(transport.previousDestination ?? ""),
    transporte: Array.isArray(transport.type)
      ? (transport.type as string[]).join("; ")
      : String(transport.type ?? ""),
    nombre_chofer_clos_apalta: String(transport.driverName ?? ""),
    numero_de_noches_de_estancia: String(roomStay.numberOfNights ?? 0),
    room_type: translate(Maps.Room.ToHS, String(roomStay.roomType ?? ""), String(roomStay.roomType ?? "")),
    amount: String(roomStay.rateAmount?.amount ?? 0),
  };

  return result;
}

/**
 * Construye el payload de Oracle para CREAR una reserva (POST).
 * Body: { reservations: { reservation: [...] } }  ← confirmado en ApiOracleReservations.json
 *
 * @param hubspotDeal  Propiedades del Negocio de HubSpot (ya "destripadas" de .properties)
 * @param guestProfiles Lista de perfiles con su ID de Oracle y flag isPrimary
 */
export function mapHubSpotReservationToOracle(
  hubspotDeal: any,
  guestProfiles: GuestProfile[]
): any {
  const props = hubspotDeal?.properties ?? hubspotDeal ?? {};

  const checkIn = formatDate(props.check_in);
  const checkOut = formatDate(props.check_out);

  // ✅ FIX #7: Si faltan fechas, lanzamos un error explícito en vez de usar
  //    fechas hardcodeadas que crearían reservas ficticias en Oracle.
  if (!checkIn || !checkOut) {
    throw new Error(
      `[mappers] Fechas inválidas en el Negocio de HubSpot. ` +
      `check_in="${String(props.check_in)}", check_out="${String(props.check_out)}". ` +
      `Verifica que los campos estén definidos y en formato correcto.`
    );
  }

  const roomType = props.room_type?.value ?? props.room_type;
  const finalRoomType = (!roomType || roomType === "Type 1") ? "OWNERC" : String(roomType);

  return {
    reservations: {
      reservation: [{
        hotelId: "CAR",
        reservationGuests: guestProfiles.map((profile) => ({
          profileInfo: {
            profileIdList: [{ type: "Profile", id: profile.id }],
          },
          // ✅ FIX #6: Usamos profile.isPrimary en vez de index === 0.
          //    Respeta la etiqueta "huésped principal" calculada en index.ts.
          primary: profile.isPrimary,
        })),
        roomStay: {
          roomRates: [{
            numberOfUnits: parseInt(String(props.cantidad_de_habitaciones ?? 1), 10) || 1,
            roomType: finalRoomType,
            ratePlanCode: translate(
              Maps.Rates.ToOracle,
              String(props.tipo_de_tarifa?.value ?? props.tipo_de_tarifa ?? ""),
              "BAROV"
            ),
            sourceCode: String(props.fuente_de_reserva ?? "HS"),
            marketCode: "BAR",
            start: checkIn,
            end: checkOut,
          }],
          guestCounts: {
            adults: guestProfiles.length || 1,
            children: 0,
          },
          arrivalDate: checkIn,
          departureDate: checkOut,
        },
        reservationPaymentMethods: [{
          paymentMethod: String(props.tipo_de_pago ?? "CASH"),
        }],
      }],
    },
  };
}