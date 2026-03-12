import type { UnifiedContact, UnifiedReservation } from "../domain/types.js";

// ============================================================================
// 🛠️ UTILIDADES DE CONVERSIÓN
// ============================================================================

/**
 * Convierte cualquier formato de fecha (Timestamp, String u Objeto) a YYYY-MM-DD
 */
function formatDate(dateVal: any): string {
  if (!dateVal) return "";
  const rawValue = typeof dateVal === 'object' ? dateVal.value : dateVal;
  if (!rawValue || rawValue === "0" || rawValue === 0) return "";
  try {
    const timestamp = isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split('T')[0] || ""; 
  } catch {
    return "";
  }
}


/**
 * Helper para obtener valores de diccionarios con fallback
 */
const translate = (map: Record<string, string>, key: string, fallback: string) => map[key] || key || fallback;

// ============================================================================
// 📖 DICCIONARIOS GLOBALIZADOS
// ============================================================================

const Maps = {
  Status: {
    ToHS: { "RESERVED": "Confirmada", "CHECKED IN": "Hospedado", "CHECKED OUT": "Salida", "CANCELED": "Cancelada" }
  },
  Room: {
    ToHS: {
      "1": "Cabernet Franc (1)", "2": "Petit Verdot (2)", "3": "Merlot (3)", "4": "Cabernet Sauvignon (4)",
      "5": "Mourvedre (5)", "6": "Syrah (6)", "7": "Cinsault (7)", "8": "Grenache (8)",
      "9": "Viognier (9)", "10": "Sauvignon Blanc (10)", "CASITA": "Casita", "PLCASITA": "Pool Casita", "VILLA": "Villa"
    },
    ToOracle: { "Casita": "CASITA", "Pool Casita": "PLCASITA", "Villa": "VILLA", "OWNERC": "OWNERC" }
  },
  Rates: {
    ToOracle: { "Overnight": "BAROV", "Half Board": "BARHB", "Full board": "BARFB" },
    ToHS: { "BAROV": "Overnight", "BARHB": "Half Board", "BARFB": "Full board", "BARRO": "Overnight" }
  },
  Source: {
    ToHS: { "WLK": "Walk-in (WLK)", "GDS": "Global Distribution System (GDS)", "OTA": "Online Travel Agency (OTA)", "WSBE": "Web Site Booking Engine (WSBE)", "HS": "Hubspot (HS)" }
  },
  Payment: {
    ToHS: { "CASH": "CASH (Efectivo)", "DP": "DP (Depósito Previo)", "CO": "Cuenta por Cobrar", "NON": "NON (None)", "MC": "MasterCard", "VI": "Visa" }
  },
  Language: {
    ToHS: { "ES": "Español", "EN": "Inglés", "PT": "Portugués", "DE": "Alemán", "FR": "Francés" },
    ToOracle: { "Español": "ES", "Inglés": "EN", "Portugués": "PT", "Alemán": "DE", "Francés": "FR" }
  }
};

// ============================================================================
// 👤 PERFILES (Oracle <-> HubSpot)
// ============================================================================

export function mapOracleToUnified(oracleData: any): UnifiedContact {
  const details = oracleData.profileDetails || {};
  const customer = details.customer || {};
  const id = oracleData.profileIdList?.[0]?.id || oracleData.id || "UNKNOWN";

  const person = customer.personName?.[0] || {};
  const email = details.emails?.emailInfo?.[0]?.email?.emailAddress || `usuario.oracle.${id}@closapalta.cl`;
  const address = details.addresses?.addressInfo?.[0]?.address || {};

  // Extraer documentos
  const ids = details.identifications?.identificationInfo || [];
  const passport = ids.find((i: any) => i.identification?.idType === "PASSPORT")?.identification?.idNumber || "";

  const memberships = details.memberships?.membershipInfo || [];
  const rcNumber = memberships.find((m: any) => m.membership?.membershipType === "RC")?.membership?.membershipNumber || "";

  return {
    id_oracle: id.toString(),
    email,
    firstName: person.givenName || "",
    lastName: person.surname || "",
    address: address.addressLine?.[0] || address.streetAddress || "",
    city: address.cityName || "",
    state: address.state || "",
    country: customer.citizenCountry?.code || "",
    nacionalidad: customer.citizenCountry?.code || "",
    phone: details.phones?.phoneInfo?.[0]?.phone?.phoneNumber || "",
    zip: address.postalCode || address.zipCode || "",
    idioma_preferido: translate(Maps.Language.ToHS, (customer.language || "").toUpperCase(), "Español"),
    fecha_de_nacimiento: formatDate(customer.birthDate),
    sexo__genero_huesped_principal: customer.gender || "",
    pasaporte: passport,
    huesped_vip: customer.vipStatus ? "Sí" : "No",
    numero_de_fidelidad__relais__chateaux: rcNumber
  };
}

export function mapHubSpotToOracle(unified: UnifiedContact): any {
  const body: any = {
    profileDetails: {
      customer: {
        personName: [{ givenName: unified.firstName, surname: unified.lastName, nameType: "Primary" }],
        language: translate(Maps.Language.ToOracle, unified.idioma_preferido || "", "ES"),
        birthDate: unified.fecha_de_nacimiento || undefined,
        gender: unified.sexo__genero_huesped_principal || undefined,
        citizenCountry: { code: unified.country || unified.nacionalidad || "CL" }
      },
      emails: { emailInfo: [{ email: { emailAddress: unified.email }, primaryInd: true, type: "EMAIL" }] },
      phones: { phoneInfo: [{ phone: { phoneNumber: unified.phone }, primaryInd: true, type: "MOBILE" }] },
      addresses: {
        addressInfo: [{
          address: { addressLine: [unified.address], cityName: unified.city, state: unified.state, country: { code: unified.country || "CL" }, postalCode: unified.zip },
          primaryInd: true, type: "HOME"
        }]
      }
    }
  };

  if (unified.pasaporte) {
    body.profileDetails.identifications = { identificationInfo: [{ identification: { idType: "PASSPORT", idNumber: unified.pasaporte } }] };
  }
  if (unified.numero_de_fidelidad__relais__chateaux) {
    body.profileDetails.memberships = { membershipInfo: [{ membership: { membershipType: "RC", membershipNumber: unified.numero_de_fidelidad__relais__chateaux } }] };
  }
  return body;
}

// ============================================================================
// 🏨 RESERVAS (Oracle <-> HubSpot)
// ============================================================================

export function mapOracleReservation(oracleRes: any): UnifiedReservation {
  const res = oracleRes.reservation || oracleRes;
  const roomStay = res.roomStay || {};
  const transport = res.transportation || {};

  // Búsquedas seguras en arrays
  const agency = (res.attachedProfiles || []).find((p: any) => p.reservationProfileType === "TravelAgent")?.name || "";
  const synxisId = (res.externalReferences || []).find((ref: any) => ["SYNXIS", "SYNXIS2"].includes(ref.idContext))?.id || "";

  return {
    id_oracle: (res.reservationGuest?.id || "").toString(),
    numero_de_reserva: res.reservationIdList?.find((id: any) => id.type === "Reservation")?.id || "",
    id_synxis: synxisId,
    numero_de_huespedes: (roomStay.adultCount || 1).toString(),
    arrival: formatDate(roomStay.arrivalDate),
    departure: formatDate(roomStay.departureDate),
    estado_de_reserva: translate(Maps.Status.ToHS, res.reservationStatus, res.reservationStatus),
    habitacion: translate(Maps.Room.ToHS, roomStay.roomId, "Por definir"),
    es_pseudo_room: roomStay.pseudoRoom || false,
    agencia_de_viajes: agency,
    fuente_de_reserva: translate(Maps.Source.ToHS, roomStay.sourceCode, "Web Site Booking Engine (WSBE)"),
    tipo_de_tarifa: translate(Maps.Rates.ToHS, roomStay.ratePlanCode, "Overnight"),
    tipo_de_pago: translate(Maps.Payment.ToHS, res.reservationPaymentMethod?.paymentMethod, "NON (None)"),
    cantidad_de_habitaciones: (roomStay.numberOfRooms || 1).toString(),
    numero_de_vuelo: transport.flightNumber || "",
    destino_anterior: transport.previousDestination || "",
    transporte: Array.isArray(transport.type) ? transport.type.join("; ") : (transport.type || ""),
    nombre_chofer_clos_apalta: transport.driverName || "",
    numero_de_noches_de_estancia: (roomStay.numberOfNights || 0).toString(),
    room_type: translate(Maps.Room.ToHS, roomStay.roomType, roomStay.roomType || ""),
    amount: (roomStay.rateAmount?.amount || 0).toString()
  } as unknown as UnifiedReservation;
}

export function mapHubSpotReservationToOracle(hubspotDeal: any, guestProfiles: any[]): any {
  const props = hubspotDeal?.properties || hubspotDeal || {};

  // 🛡️ Seguridad de fechas: Evita el error 1970
  const checkIn = formatDate(props.check_in) || "2027-06-01";
  const checkOut = formatDate(props.check_out) || "2027-06-05";

  // 🛡️ Seguridad de tipos de habitación
  const roomType = props.room_type?.value || props.room_type;
  const finalRoomType = (roomType === "Type 1" || !roomType) ? "OWNERC" : roomType;

  return {
    reservations: {
      reservation: [{
        hotelId: "CAR",
        reservationGuests: guestProfiles.map((profile, index) => ({
          profileInfo: { profileIdList: [{ type: "Profile", id: profile.id }] },
          primary: index === 0 // Solo el primero es principal
        })),
        roomStay: {
          roomRates: [{
            numberOfUnits: parseInt(props.cantidad_de_habitaciones) || 1,
            roomType: finalRoomType,
            ratePlanCode: translate(Maps.Rates.ToOracle, props.tipo_de_tarifa?.value || props.tipo_de_tarifa, "BAROV"),
            sourceCode: props.fuente_de_reserva || "HS",
            marketCode: "BAR",
            start: checkIn,
            end: checkOut
          }],
          guestCounts: { adults: guestProfiles.length || 2, children: 0 },
          arrivalDate: checkIn,
          departureDate: checkOut
        },
        reservationPaymentMethods: [{ paymentMethod: props.tipo_de_pago || "CASH" }]
      }]
    }
  };
}