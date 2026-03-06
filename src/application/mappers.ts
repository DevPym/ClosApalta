import type { UnifiedContact, UnifiedReservation } from "../domain/types.js";

// 👤 MAPPER DE PERFIL (CONTACTO)
export function mapOracleToUnified(oracleData: any): UnifiedContact {
  const profileDetails = oracleData.profileDetails || {};
  const customer = profileDetails.customer || {};

  const givenName = customer.personName?.[0]?.givenName || "";
  const surname = customer.personName?.[0]?.surname || "";

  const realEmail = profileDetails.emails?.emailInfo?.[0]?.email?.emailAddress;
  const id = oracleData.profileIdList?.[0]?.id || "UNKNOWN";
  const email = realEmail ? realEmail : `usuario.oracle.${id}@closapalta.cl`;

  const addressInfo = profileDetails.addresses?.addressInfo?.[0]?.address || {};
  const countryCode = customer.citizenCountry?.code || "";
  const phone = profileDetails.phones?.phoneInfo?.[0]?.phone?.phoneNumber || "";

  // Diccionario de Idiomas
  const languageMap: { [key: string]: string } = {
    "ES": "Español", "EN": "Inglés", "PT": "Portugués", "DE": "Alemán", "FR": "Frances"
  };
  const oracleLang = (customer.language || "").toUpperCase();
  const language = languageMap[oracleLang] || "";

  const birthDate = customer.birthDate || "";
  const gender = customer.gender || "";
  const isVip = customer.vipStatus ? "Sí" : "No";

  const identifications = profileDetails.identifications?.identificationInfo || [];
  const passportObj = identifications.find((id: any) => id.identification?.idType === "PASSPORT");
  const passportNumber = passportObj?.identification?.idNumber || "";

  // 🌟 Búsqueda de Membresía Relais & Chateaux (Suele venir como código RC)
  const memberships = profileDetails.memberships?.membershipInfo || [];
  const rcMembership = memberships.find((m: any) => m.membership?.membershipType === "RC");
  const rcNumber = rcMembership?.membership?.membershipNumber || "";

  return {
    id_oracle: id.toString(),
    email: email,
    firstName: givenName,
    lastName: surname,
    address: addressInfo.streetAddress || "",
    city: addressInfo.cityName || "",
    state: addressInfo.state || "",
    country: countryCode,
    nacionalidad: countryCode,
    phone: phone,
    zip: addressInfo.postalCode || addressInfo.zipCode || "",
    idioma_preferido: language,
    fecha_de_nacimiento: birthDate,
    sexo__genero_huesped_principal: gender,
    pasaporte: passportNumber,
    huesped_vip: isVip,
    numero_de_fidelidad__relais__chateaux: rcNumber // 👈 Solo el nombre oficial
  };
}

// 🛏️ MAPPER DE RESERVA (Con Diccionarios)
export function mapOracleReservation(oracleRes: any): UnifiedReservation {
  const resDetails = oracleRes.reservations?.reservationInfo?.[0]?.reservation || {};
  const profileId = resDetails.reservationGuests?.[0]?.profileInfo?.profileIdList?.[0]?.id || "";
  const roomStay = resDetails.roomStay?.roomRates?.[0] || {};
  const roomDetails = resDetails.roomStay?.currentRoomInfo || {};

  // 📖 DICCIONARIOS DE TRADUCCIÓN (Oracle ➔ HubSpot)
  const statusMap: { [key: string]: string } = {
    "RESERVED": "Confirmada", "PENDING": "Pendiente", "CANCELED": "Cancelada"
  };
  const sourceMap: { [key: string]: string } = {
    "WEB": "Venta Directa", "AGENCY": "Agencia", "WALKIN": "Walk-in"
  };
  const rateMap: { [key: string]: string } = {
    "RACK": "Overnight", "HB": "Half Board", "FB": "Full Board"
  };
  const roomMap: { [key: string]: string } = {
    "10": "Sauvignon Blanc (10)", "7": "Cinsault (7)", "9": "Viognier (9)", "8": "Grenache (8)",
    "5": "Mourvedre (5)", "4": "Cabernet Sauvignon (4)", "3": "Merlot (3)", "6": "Syrah (6)",
    "2": "Petit Verdot (2)", "1": "Cabernet Franc (1)"
  };

  const oracleStatus = resDetails.reservationStatus || "";
  const oracleSource = roomStay.sourceCode || "";
  const oracleRate = roomStay.ratePlanCode || "";
  const oracleRoom = roomDetails.roomId || "";

  // 🚐 EXTRACCIÓN DE LOGÍSTICA (Te faltaba este bloque)
  const transportData = resDetails.transportation || {};
  let rawTransport = transportData.type || "";
  if (Array.isArray(rawTransport)) {
    rawTransport = rawTransport.join(";");
  } else {
    rawTransport = rawTransport.replace(/,/g, ";");
  }

  return {
    id_oracle: profileId.toString(),
    numero_de_huespedes: (resDetails.roomStay?.guestCounts?.adults || 1).toString(),
    arrival: resDetails.roomStay?.arrivalDate || "",
    departure: resDetails.roomStay?.departureDate || "",
    estado_de_reserva: statusMap[oracleStatus] || oracleStatus,
    fuente_de_reserva: sourceMap[oracleSource] || oracleSource,
    tipo_de_tarifa: rateMap[oracleRate] || oracleRate,
    habitacion: roomMap[oracleRoom] || oracleRoom,

    // 🚐 ASIGNACIÓN DE RESERVA Y LOGÍSTICA CORRECTOS
    numero_de_reserva: resDetails.reservationIdList?.[0]?.id || "",
    numero_de_vuelo: transportData.flightNumber || "",
    destino_anterior: transportData.previousDestination || "",
    transporte: rawTransport,
    nombre_chofer_clos_apalta: transportData.driverName || "",
    numero_de_noches_de_estancia: (roomStay.numberOfNights || 0).toString(),
  };
}


// 🔄 MAPPER INVERSO: De HubSpot (UnifiedContact) a Oracle (JSON Estricto)
export function mapHubSpotToOracle(unified: UnifiedContact): any {

  // Diccionario Inverso de Idiomas (HubSpot -> Oracle)
  const languageReverseMap: { [key: string]: string } = {
    "Español": "ES", "Inglés": "EN", "Portugués": "PT", "Alemán": "DE", "Frances": "FR"
  };

  return {
    profileDetails: {
      customer: {
        personName: [
          {
            givenName: unified.firstName,
            surname: unified.lastName,
            nameType: "G" // 'G' es el estándar para nombres de personas en Oracle
          }
        ],
        language: languageReverseMap[unified.idioma_preferido] || unified.idioma_preferido,
        birthDate: unified.fecha_de_nacimiento,
        gender: unified.sexo__genero_huesped_principal,
        citizenCountry: {
          code: unified.country || unified.nacionalidad
        }
      },
      emails: {
        emailInfo: [
          {
            email: {
              emailAddress: unified.email
            },
            primaryInd: true
          }
        ]
      },
      phones: {
        phoneInfo: [
          {
            phone: {
              phoneNumber: unified.phone
            },
            primaryInd: true
          }
        ]
      },
      addresses: {
        addressInfo: [
          {
            address: {
              addressLine: [unified.address],
              cityName: unified.city,
              state: unified.state,
              country: {
                code: unified.country || unified.nacionalidad
              },
              postalCode: unified.zip
            },
            primaryInd: true
          }
        ]
      },
      identifications: unified.pasaporte ? {
        identificationInfo: [
          {
            identification: {
              idType: "PASSPORT",
              idNumber: unified.pasaporte
            }
          }
        ]
      } : undefined,
      memberships: unified.numero_de_fidelidad__relais__chateaux ? {
        membershipInfo: [
          {
            membership: {
              membershipType: "RC",
              membershipNumber: unified.numero_de_fidelidad__relais__chateaux
            }
          }
        ]
      } : undefined
    }
  };
}