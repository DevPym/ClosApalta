import type { UnifiedContact, UnifiedReservation } from "../domain/types.js";

/**
 * 🛠️ UTILS: Formateo de fechas para HubSpot
 * Oracle: "2026-03-09 10:00:00" -> HubSpot: "2026-03-09"
 */
const formatToHubSpotDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  return dateString.split(' ')[0] || dateString;
};

/**
 * 👤 MAPPER: Oracle Profile -> UnifiedContact (HubSpot)
 * Traduce la estructura compleja de OPERA Cloud al formato plano de CRM.
 */
export function mapOracleToUnified(oracleData: any): UnifiedContact {
  const profileDetails = oracleData.profileDetails || {};
  const customer = profileDetails.customer || {};

  // Extraer nombres del primer elemento del array (Estructura validada en GET)
  const personName = customer.personName?.[0] || {};
  const givenName = personName.givenName || "";
  const surname = personName.surname || "";

  // Email con fallback inteligente
  const id = oracleData.profileIdList?.[0]?.id || oracleData.id || "UNKNOWN";
  const realEmail = profileDetails.emails?.emailInfo?.[0]?.email?.emailAddress;
  const email = realEmail ? realEmail : `usuario.oracle.${id}@closapalta.cl`;

  // Direcciones y Teléfonos
  const addressInfo = profileDetails.addresses?.addressInfo?.[0]?.address || {};
  const countryCode = customer.citizenCountry?.code || "";
  const phone = profileDetails.phones?.phoneInfo?.[0]?.phone?.phoneNumber || "";

  // Diccionario de Idiomas
  const languageMap: Record<string, string> = {
    "ES": "Español", "EN": "Inglés", "PT": "Portugués", "DE": "Alemán", "FR": "Francés"
  };
  const language = languageMap[(customer.language || "").toUpperCase()] || "Español";

  // Identificaciones (Pasaporte)
  const identifications = profileDetails.identifications?.identificationInfo || [];
  const passportObj = identifications.find((id: any) => id.identification?.idType === "PASSPORT");
  const passportNumber = passportObj?.identification?.idNumber || "";

  // Membresía Relais & Chateaux
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

/**
 * 🛏️ MAPPER: Oracle Reservation -> UnifiedReservation (HubSpot)
 * Traduce códigos de habitación y estados técnicos a nombres de Clos Apalta.
 */
export function mapOracleReservation(oracleRes: any): UnifiedReservation {
  // Manejo de envoltura de Oracle (reservations.reservationInfo[0])
  const resContainer = oracleRes.reservations?.reservationInfo?.[0]?.reservation || oracleRes;
  const profileId = resContainer.reservationGuests?.[0]?.profileInfo?.profileIdList?.[0]?.id || "";
  const roomStay = resContainer.roomStay || {};
  const roomRates = roomStay.roomRates?.[0] || {};
  const roomDetails = roomStay.currentRoomInfo || {};

  // 📖 DICCIONARIOS DE TRADUCCIÓN (Basado en códigos Clos Apalta)
  const statusMap: Record<string, string> = {
    "RESERVED": "Confirmada", "CHECKED IN": "Hospedado", "CHECKED OUT": "Salida", "CANCELED": "Cancelada"
  };
  const sourceMap: Record<string, string> = {
    "WEB": "Venta Directa", "AGENCY": "Agencia", "WALKIN": "Walk-in", "GDS": "GDS"
  };
  const roomMap: Record<string, string> = {
    "10": "Sauvignon Blanc (10)", "7": "Cinsault (7)", "9": "Viognier (9)", "8": "Grenache (8)",
    "5": "Mourvedre (5)", "4": "Cabernet Sauvignon (4)", "3": "Merlot (3)", "6": "Syrah (6)",
    "2": "Petit Verdot (2)", "1": "Cabernet Franc (1)"
  };

  // Logística de Transporte
  const transportData = resContainer.transportation || {};
  let transportType = transportData.type || "";
  if (Array.isArray(transportType)) transportType = transportType.join("; ");

  return {
    id_oracle: profileId.toString(),
    numero_de_reserva: resContainer.reservationIdList?.[0]?.id || "",
    numero_de_huespedes: (roomStay.guestCounts?.adults || 1).toString(),
    arrival: formatToHubSpotDate(roomStay.arrivalDate),
    departure: formatToHubSpotDate(roomStay.departureDate),
    estado_de_reserva: statusMap[resContainer.reservationStatus] || resContainer.reservationStatus,
    fuente_de_reserva: sourceMap[roomRates.sourceCode] || roomRates.sourceCode || "Directo",
    tipo_de_tarifa: roomRates.ratePlanCode || "",
    habitacion: roomMap[roomDetails.roomId] || roomDetails.roomId || "Por definir",

    // Logística
    numero_de_vuelo: transportData.flightNumber || "",
    destino_anterior: transportData.previousDestination || "",
    transporte: transportType,
    nombre_chofer_clos_apalta: transportData.driverName || "",
    numero_de_noches_de_estancia: (roomStay.numberOfNights || 0).toString()
  };
}

/**
 * 🔄 MAPPER INVERSO: HubSpot -> Oracle Profile JSON
 * Prepara el objeto para ser enviado mediante POST/PUT a OPERA Cloud.
 */
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

  // Añadir Pasaporte si existe
  if (unified.pasaporte) {
    body.profileDetails.identifications = {
      identificationInfo: [{
        identification: { idType: "PASSPORT", idNumber: unified.pasaporte }
      }]
    };
  }

  // Añadir Relais & Chateaux si existe
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