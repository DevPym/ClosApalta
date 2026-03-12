import type { UnifiedContact, UnifiedReservation } from "../domain/types.js";






/**
 * 🛠️ UTILS: Formateo de fechas para HubSpot
 * Oracle: "2026-03-09 10:00:00" -> HubSpot: "2026-03-09"
 */
function formatToHubSpotDate(dateVal: any): string {
  if (!dateVal) return "";
  const dateStr = typeof dateVal === 'object' ? dateVal.value : dateVal;
  if (!dateStr) return "";
  // Si viene con timestamp, extraemos solo la fecha
  return dateStr.split("T")[0];
}

// ============================================================================
// 📖 DICCIONARIOS DE TRADUCCIÓN GLOBAL (HubSpot <-> Oracle Clos Apalta)
// ============================================================================

const statusMapToHubSpot: Record<string, string> = {
  "RESERVED": "Confirmada", "CHECKED IN": "Hospedado", "CHECKED OUT": "Salida", "CANCELED": "Cancelada"
};

const roomMapToHubSpot: Record<string, string> = {
  "10": "Sauvignon Blanc (10)", "7": "Cinsault (7)", "9": "Viognier (9)", "8": "Grenache (8)",
  "5": "Mourvedre (5)", "4": "Cabernet Sauvignon (4)", "3": "Merlot (3)", "6": "Syrah (6)",
  "2": "Petit Verdot (2)", "1": "Cabernet Franc (1)",
  "CASITA": "Casita", "PLCASITA": "Pool Casita", "VILLA": "Villa"
};

const roomMapToOracle: Record<string, string> = {
  "Casita": "CASITA", "Pool Casita": "PLCASITA", "Villa": "VILLA", "OWNERC": "OWNERC"
};

// 1. TIPO DE TARIFA
const rateMapToOracle: Record<string, string> = {
  "Overnight": "BAROV", "Half Board": "BARHB", "Full board": "BARFB"
};
const rateMapToHubSpot: Record<string, string> = {
  "BAROV": "Overnight", "BARHB": "Half Board", "BARFB": "Full board", "BARRO": "Overnight"
};

// 2. FUENTE DE RESERVA
const sourceMapToOracle: Record<string, string> = {
  "Walk-in (WLK)": "WLK", "Global Distribution System (GDS)": "GDS",
  "Online Travel Agency (OTA)": "OTA", "Web Site Booking Engine (WSBE)": "WSBE",
  "Hubspot (HS)": "HS"
};
const sourceMapToHubSpot: Record<string, string> = {
  "WLK": "Walk-in (WLK)", "GDS": "Global Distribution System (GDS)",
  "OTA": "Online Travel Agency (OTA)", "WSBE": "Web Site Booking Engine (WSBE)",
  "HS": "Hubspot (HS)"
};

// 3. TIPO DE PAGO
const paymentMapToOracle: Record<string, string> = {
  "CASH (Efectivo)": "CASH", "DP (Depósito Previo)": "DP",
  "CO (Cuenta por Cobrar)": "CO", "NON (None)": "NON",
  "MC (MasterCard)": "MC", "VI (Visa)": "VI"
};
const paymentMapToHubSpot: Record<string, string> = {
  "CASH": "CASH (Efectivo)", "DP": "DP (Depósito Previo)",
  "CO": "CO (Cuenta por Cobrar)", "NON": "NON (None)",
  "MC": "MC (MasterCard)", "VI": "VI (Visa)"
};


// ============================================================================
// 👤 MAPPER 1: Oracle Profile -> UnifiedContact (HubSpot)
// ============================================================================
export function mapOracleToUnified(oracleData: any): UnifiedContact {
  const profileDetails = oracleData.profileDetails || {};
  const customer = profileDetails.customer || {};

  const personName = customer.personName?.[0] || {};
  const givenName = personName.givenName || "";
  const surname = personName.surname || "";

  const id = oracleData.profileIdList?.[0]?.id || oracleData.id || "UNKNOWN";
  const realEmail = profileDetails.emails?.emailInfo?.[0]?.email?.emailAddress;
  const email = realEmail ? realEmail : `usuario.oracle.${id}@closapalta.cl`;

  const addressInfo = profileDetails.addresses?.addressInfo?.[0]?.address || {};
  const countryCode = customer.citizenCountry?.code || "";
  const phone = profileDetails.phones?.phoneInfo?.[0]?.phone?.phoneNumber || "";

  const languageMap: Record<string, string> = {
    "ES": "Español", "EN": "Inglés", "PT": "Portugués", "DE": "Alemán", "FR": "Francés"
  };
  const language = languageMap[(customer.language || "").toUpperCase()] || "Español";

  const identifications = profileDetails.identifications?.identificationInfo || [];
  const passportObj = identifications.find((id: any) => id.identification?.idType === "PASSPORT");
  const passportNumber = passportObj?.identification?.idNumber || "";

  const memberships = profileDetails.memberships?.membershipInfo || [];
  const rcMembership = memberships.find((m: any) => m.membership?.membershipType === "RC");
  const rcNumber = rcMembership?.membership?.membershipNumber || "";

  return {
    id_oracle: id.toString(),
    email: email,
    firstName: givenName,
    lastName: surname,
    address: addressInfo.addressLine?.[0] || addressInfo.streetAddress || "",
    city: addressInfo.cityName || "",
    state: addressInfo.state || "",
    country: countryCode,
    nacionalidad: countryCode,
    phone: phone,
    zip: addressInfo.postalCode || addressInfo.zipCode || "",
    idioma_preferido: language,
    fecha_de_nacimiento: formatToHubSpotDate(customer.birthDate),
    sexo__genero_huesped_principal: customer.gender || "",
    pasaporte: passportNumber,
    huesped_vip: customer.vipStatus ? "Sí" : "No",
    numero_de_fidelidad__relais__chateaux: rcNumber
  };
}


// ============================================================================
// 🔄 MAPPER 2: HubSpot Contact -> Oracle Profile JSON (CREACIÓN)
// ============================================================================
export function mapHubSpotToOracle(unified: UnifiedContact): any {
  const languageReverseMap: Record<string, string> = {
    "Español": "ES", "Inglés": "EN", "Portugués": "PT", "Alemán": "DE", "Francés": "FR"
  };

  const body: any = {
    profileDetails: {
      customer: {
        personName: [{
          givenName: unified.firstName,
          surname: unified.lastName,
          nameType: "Primary"
        }],
        language: languageReverseMap[unified.idioma_preferido || ""] || "ES",
        birthDate: unified.fecha_de_nacimiento || undefined,
        gender: unified.sexo__genero_huesped_principal || undefined,
        citizenCountry: { code: unified.country || unified.nacionalidad || "CL" }
      },
      emails: {
        emailInfo: [{
          email: { emailAddress: unified.email },
          primaryInd: true,
          type: "EMAIL"
        }]
      },
      phones: {
        phoneInfo: [{
          phone: { phoneNumber: unified.phone },
          primaryInd: true,
          type: "MOBILE"
        }]
      },
      addresses: {
        addressInfo: [{
          address: {
            addressLine: [unified.address],
            cityName: unified.city,
            state: unified.state,
            country: { code: unified.country || "CL" },
            postalCode: unified.zip
          },
          primaryInd: true,
          type: "HOME"
        }]
      }
    }
  };

  if (unified.pasaporte) {
    body.profileDetails.identifications = {
      identificationInfo: [{
        identification: { idType: "PASSPORT", idNumber: unified.pasaporte }
      }]
    };
  }

  if (unified.numero_de_fidelidad__relais__chateaux) {
    body.profileDetails.memberships = {
      membershipInfo: [{
        membership: {
          membershipType: "RC",
          membershipNumber: unified.numero_de_fidelidad__relais__chateaux
        }
      }]
    };
  }

  return body;
}


// ============================================================================
// 🛏️ MAPPER 3: Oracle Reservation -> UnifiedReservation (HubSpot Deal)
// ============================================================================
export function mapOracleReservation(oracleRes: any): UnifiedReservation {
  // Manejo de envoltura: En las listas suele venir dentro de un objeto de la lista
  const resContainer = oracleRes.reservation || oracleRes;
  const profileId = resContainer.reservationGuest?.id || "";
  const roomStay = resContainer.roomStay || {};


  // Extraer Agencia de Viaje si existe
  const attachedProfiles = resContainer.attachedProfiles || [];
  const travelAgent = attachedProfiles.find((p: any) => p.reservationProfileType === "TravelAgent");
  const agencyName = travelAgent ? travelAgent.name : "";

  // Extraer Referencia Synxis
  const extRefs = resContainer.externalReferences || [];
  const synxisRef = extRefs.find((ref: any) => ref.idContext === "SYNXIS2" || ref.idContext === "SYNXIS");
  const synxisId = synxisRef ? synxisRef.id : "";

  // Logística de Transporte (Tu lógica original restaurada)
  const transportData = resContainer.transportation || {};
  let transportType = transportData.type || "";
  if (Array.isArray(transportType)) transportType = transportType.join("; ");

  return {
    id_oracle: profileId.toString(),
    numero_de_reserva: resContainer.reservationIdList?.find((id: any) => id.type === "Reservation")?.id || "",
    id_synxis: synxisId,
    numero_de_huespedes: (roomStay.adultCount || 1).toString(),
    arrival: formatToHubSpotDate(roomStay.arrivalDate),
    departure: formatToHubSpotDate(roomStay.departureDate),
    estado_de_reserva: statusMapToHubSpot[resContainer.reservationStatus] || resContainer.reservationStatus,
    habitacion: roomMapToHubSpot[roomStay.roomId] || roomStay.roomId || "Por definir",

    // Nuevas Súper Propiedades
    es_pseudo_room: roomStay.pseudoRoom || false,
    agencia_de_viajes: agencyName,

    // Mapeo de diccionarios
    fuente_de_reserva: sourceMapToHubSpot[roomStay.sourceCode] || roomStay.sourceCode || "Web Site Booking Engine (WSBE)",
    tipo_de_tarifa: rateMapToHubSpot[roomStay.ratePlanCode] || roomStay.ratePlanCode || "Overnight",
    tipo_de_pago: paymentMapToHubSpot[resContainer.reservationPaymentMethod?.paymentMethod] || resContainer.reservationPaymentMethod?.paymentMethod || "NON (None)",
    cantidad_de_habitaciones: (roomStay.numberOfRooms || 1).toString(),

    // Campos de Logística Obligatorios (Restaurados)
    numero_de_vuelo: transportData.flightNumber || "",
    destino_anterior: transportData.previousDestination || "",
    transporte: transportType,
    nombre_chofer_clos_apalta: transportData.driverName || "",
    numero_de_noches_de_estancia: (roomStay.numberOfNights || 0).toString(),
    room_type: roomMapToHubSpot[roomStay.roomType] || roomStay.roomType || "",
    amount: roomStay.rateAmount?.amount ? roomStay.rateAmount.amount.toString() : "0",
  } as unknown as UnifiedReservation;
  // Nota: Usamos 'as unknown as' o simplemente asegúrate de agregar id_synxis, es_pseudo_room y agencia_de_viajes 
  // a tu archivo types.js en la interfaz UnifiedReservation para que sea 100% compatible.
}


// ============================================================================
// 🚀 MAPPER 4: HubSpot Deal -> Oracle Reservation JSON (CREACIÓN)
// ============================================================================
// Función auxiliar para limpiar las fechas de HubSpot
const formatHSDate = (hsValue: any) => {
  if (!hsValue) return null;
  // Si es el objeto complejo de HubSpot, extraemos .value
  const rawValue = typeof hsValue === 'object' ? hsValue.value : hsValue;
  if (!rawValue) return null;

  // Convertir timestamp de milisegundos a YYYY-MM-DD
  const date = new Date(parseInt(rawValue));
  return date.toISOString().split('T')[0];
};



// 1. Definimos la interfaz para los perfiles (buena práctica de TypeScript)
export interface GuestProfile {
  id: string;
  isPrimary: boolean;
}

/**
 * Mapea un Negocio de HubSpot y su lista de contactos a la estructura de reserva de Oracle
 */
export function mapHubSpotReservationToOracle(hubspotDeal: any, guestProfiles: GuestProfile[]): any {

  // Extraemos las propiedades (manejando si vienen envueltas en .properties o no)
  const props = hubspotDeal?.properties || hubspotDeal || {};

  // Formateo de fechas (asumiendo que tienes la función formatHSDate definida en el archivo)
  const checkIn = formatHSDate(props.check_in);
  const checkOut = formatHSDate(props.check_out);

  // Traducir códigos de HubSpot a Opera
  const sourceCode = props.fuente_de_reserva?.value || props.fuente_de_reserva || "HS";
  const roomTypeCode = props.room_type?.value || props.room_type || "OWNERC";
  const ratePlanCode = props.tipo_de_tarifa?.value || "BAROV";
  const paymentCode = props.tipo_de_pago?.value || "CASH";

  return {
    reservations: {
      reservation: [
        {
          // ------------------------------------------------------------------
          // 👥 SECCIÓN DE HUÉSPEDES (Múltiples perfiles)
          // ------------------------------------------------------------------
          reservationGuests: guestProfiles.map((profile: GuestProfile) => ({
            profileInfo: {
              profileIdList: [
                {
                  type: "Profile",
                  id: profile.id
                }
              ]
            },
            primary: profile.isPrimary // Se asigna segun el label "huésped principal"
          })),

          roomStay: {
            roomRates: [
              {
                numberOfUnits: parseInt(props.cantidad_de_habitaciones?.value || props.cantidad_de_habitaciones) || 1,
                roomType: roomTypeCode,
                ratePlanCode: ratePlanCode,
                sourceCode: sourceCode,
                marketCode: "BAR",
                start: checkIn,
                end: checkOut
              }
            ],
            guestCounts: {
              // 💡 Sincronizamos los adultos con el número de perfiles enviados
              adults: guestProfiles.length > 0 ? guestProfiles.length : (parseInt(props.numero_de_huespedes?.value || props.numero_de_huespedes) || 2),
              children: 0
            },
            arrivalDate: checkIn,
            departureDate: checkOut
          },

          reservationPaymentMethods: [
            {
              paymentMethod: paymentCode
            }
          ]
        }
      ]
    }
  };
}

