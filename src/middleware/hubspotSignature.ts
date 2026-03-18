// Middleware de verificación de firma para webhooks de HubSpot.
//
// HubSpot firma cada request con X-HubSpot-Signature-v3 usando el Client Secret
// de la app privada. Sin esta validación, cualquiera con acceso a la URL puede
// enviar payloads maliciosos.
//
// Documentación oficial:
// https://developers.hubspot.com/docs/api/webhooks/webhooks-overview#security
//
// Algoritmo:
//   HMAC-SHA256( clientSecret, "POST" + url + bodyString + timestamp )
//   → comparar con X-HubSpot-Signature-v3 (base64)
//
// ⚠️ Requiere que Express.json() ya haya parseado el body ANTES de este middleware,
//    y que el request guarde el raw body. La comparación se hace sobre el JSON
//    serializado (req.body).
//
// Uso en index.ts:
//   app.use('/webhook/hubspot', verifyHubSpotSignature);

import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";

// HubSpot recomienda rechazar requests con timestamp mayor a 5 minutos
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export function verifyHubSpotSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers["x-hubspot-signature-v3"] as string | undefined;
  const timestamp = req.headers["x-hubspot-request-timestamp"] as string | undefined;

  // Si no viene firma, rechazar
  if (!signature || !timestamp) {
    console.warn(
      `⚠️ [Signature] Request sin firma HubSpot rechazado. ` +
      `Path: ${req.path} | IP: ${req.ip}`
    );
    res.status(401).json({ error: "Firma HubSpot requerida" });
    return;
  }

  // Validar que el timestamp no sea muy antiguo (protección anti-replay)
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > MAX_TIMESTAMP_AGE_MS) {
    console.warn(
      `⚠️ [Signature] Timestamp expirado o inválido: ${timestamp}. ` +
      `Path: ${req.path}`
    );
    res.status(401).json({ error: "Timestamp expirado o inválido" });
    return;
  }

  // Reconstruir la firma esperada
  // HubSpot firma: método + URL completa + body (JSON serializado) + timestamp
  const bodyString = JSON.stringify(req.body);
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const payload = `POST${fullUrl}${bodyString}${timestamp}`;

  const expectedSignature = createHmac("sha256", config.hubspot.clientSecret)
    .update(payload)
    .digest("base64");

  // Comparación segura (evita timing attacks)
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      console.warn(
        `⚠️ [Signature] Firma inválida. Path: ${req.path} | IP: ${req.ip}`
      );
      res.status(401).json({ error: "Firma inválida" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Error al verificar firma" });
    return;
  }

  next();
}
