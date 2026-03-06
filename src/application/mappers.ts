import type { UnifiedContact } from "../domain/types.js";

// src/application/mappers.ts

// src/application/mappers.ts

export class ContactMapper {
  static fromOracleToUnified(profileRaw: any, resRaw: any): UnifiedContact {
    const profile = profileRaw.profileDetails || profileRaw;
    const profileId = profileRaw.profileIdList?.[0]?.id || "0";

    // 1. Intentamos buscar email real
    const emailFromRes =
      resRaw?.reservationGuest?.[0]?.emails?.emailInfo?.[0]?.email
        ?.emailAddress;
    const emailFromProfile =
      profile.emails?.emailInfo?.[0]?.email?.emailAddress;

    let finalEmail = emailFromRes || emailFromProfile || "";

    // 💡 LA SOLUCIÓN: Si el email sigue vacío, generamos uno sintético para la prueba
    if (!finalEmail || finalEmail === "") {
      finalEmail = `usuario.oracle.${profileId}@closapalta.cl`;
      console.log(`⚠️ Generando email sintético: ${finalEmail}`);
    }

    // En src/application/mappers.ts
    // Asegúrate de que el retorno sea un objeto limpio:
    return {
      firstName: String(
        profile.customer?.personName?.[0]?.givenName || "Pedro",
      ),
      lastName: String(profile.customer?.personName?.[0]?.surname || "Caldas"),
      email: String(finalEmail),
      phone: String(
        resRaw?.reservationGuest?.[0]?.phones?.phoneInfo?.[0]?.phone
          ?.phoneNumber || "",
      ),
      nationality: String(profile.customer?.citizenCountry?.code || "CL"),
      vipStatus: "Standard",
      breadPreference: "Pendiente",
      milkPreference: "Pendiente",
      oracleProfileId: String(profileId),
    };
  }
}
