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

  // Si no viene firma, rechazar para asegurar que el request viene de HubSpot
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
  if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_TIMESTAMP_AGE_MS) {
    console.warn(
      `⚠️ [Signature] Timestamp expirado o inválido: ${timestamp}. ` +
      `Path: ${req.path}`
    );
    res.status(401).json({ error: "Timestamp expirado o inválido" });
    return;
  }

  /**
   * RECONSTRUCCIÓN DE LA FIRMA (Cambios críticos):
   * * 1. Usar el body sin procesar (un-parsed body) según la documentación.
   * Requiere que en index.ts hayas configurado express.json({ verify: ... }).
   */
  const bodyString = (req as any).rawBody?.toString() || "";

  /**
   * 2. Corregir Protocolo y URL para Railway:
   * En Railway, el protocolo interno suele ser http, pero HubSpot firma con https.
   */
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const fullUrl = `${protocol}://${req.get("host")}${req.originalUrl}`;

  const payload = `POST${fullUrl}${bodyString}${timestamp}`;

  const expectedSignature = createHmac("sha256", config.hubspot.clientSecret)
    .update(payload)
    .digest("base64");

  // Comparación segura (evita timing attacks)
  try {
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

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
  } catch (error) {
    res.status(401).json({ error: "Error al verificar firma" });
    return;
  }

  next();
}