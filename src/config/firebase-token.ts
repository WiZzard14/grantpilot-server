import jwt, { type JwtHeader, type JwtPayload, type SigningKeyCallback } from "jsonwebtoken";
import { env } from "./env.js";
import { AppError } from "../utils/AppError.js";

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

interface FirebaseIdToken extends JwtPayload {
  sub: string;
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  auth_time: number;
  firebase?: {
    sign_in_provider?: string;
    identities?: Record<string, string[]>;
  };
}

let certificateCache = new Map<string, string>();
let certificateCacheExpiresAt = 0;
let certificateRequest: Promise<Map<string, string>> | null = null;

function cacheLifetimeMilliseconds(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/i);
  const seconds = match ? Number(match[1]) : 60 * 60;
  return Math.max(60, seconds) * 1000;
}

async function loadFirebaseCertificates(): Promise<Map<string, string>> {
  const now = Date.now();
  if (certificateCache.size && certificateCacheExpiresAt > now) {
    return certificateCache;
  }

  if (!certificateRequest) {
    certificateRequest = (async () => {
      let response: Response;
      try {
        response = await fetch(FIREBASE_CERTS_URL, {
          headers: { Accept: "application/json" }
        });
      } catch {
        throw new AppError(
          "Firebase public signing keys could not be reached. Check the server internet connection.",
          503
        );
      }

      if (!response.ok) {
        throw new AppError(
          `Firebase public signing keys returned HTTP ${response.status}`,
          503
        );
      }

      const payload = (await response.json()) as Record<string, string>;
      const entries = Object.entries(payload).filter(
        ([keyId, certificate]) => Boolean(keyId) && typeof certificate === "string"
      );

      if (!entries.length) {
        throw new AppError("Firebase public signing keys response was empty", 503);
      }

      certificateCache = new Map(entries);
      certificateCacheExpiresAt =
        Date.now() + cacheLifetimeMilliseconds(response.headers.get("cache-control"));

      return certificateCache;
    })().finally(() => {
      certificateRequest = null;
    });
  }

  return certificateRequest;
}

async function publicKeyForHeader(header: JwtHeader): Promise<string> {
  if (header.alg !== "RS256") {
    throw new AppError("Firebase ID token must use RS256", 401);
  }

  if (!header.kid) {
    throw new AppError("Firebase ID token is missing its key ID", 401);
  }

  const certificates = await loadFirebaseCertificates();
  const certificate = certificates.get(header.kid);

  if (!certificate) {
    // Force one refresh in case Google rotated keys between requests.
    certificateCacheExpiresAt = 0;
    const refreshed = await loadFirebaseCertificates();
    const refreshedCertificate = refreshed.get(header.kid);
    if (refreshedCertificate) return refreshedCertificate;

    throw new AppError("Firebase ID token uses an unknown signing key", 401);
  }

  return certificate;
}

function validateDecodedToken(decoded: string | JwtPayload): FirebaseIdToken {
  if (typeof decoded === "string") {
    throw new AppError("Firebase ID token payload is invalid", 401);
  }

  const subject = decoded.sub;
  const authTime = decoded.auth_time;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof subject !== "string" || subject.length === 0 || subject.length > 128) {
    throw new AppError("Firebase ID token subject is invalid", 401);
  }

  if (typeof authTime !== "number" || authTime > nowSeconds + 60) {
    throw new AppError("Firebase ID token authentication time is invalid", 401);
  }

  return decoded as FirebaseIdToken;
}

export function isFirebaseTokenVerificationConfigured(): boolean {
  return Boolean(env.FIREBASE_PROJECT_ID);
}

/**
 * Verifies a Firebase Authentication ID token with Google's public signing
 * certificates. This requires only FIREBASE_PROJECT_ID; no service-account
 * private key is needed for normal sign-in verification.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdToken> {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new AppError("FIREBASE_PROJECT_ID is missing on the server", 503);
  }

  return new Promise<FirebaseIdToken>((resolve, reject) => {
    const keyProvider = (
      header: JwtHeader,
      callback: SigningKeyCallback
    ): void => {
      publicKeyForHeader(header)
        .then((certificate) => callback(null, certificate))
        .catch((error) => callback(error as Error));
    };

    jwt.verify(
      idToken,
      keyProvider,
      {
        algorithms: ["RS256"],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
        clockTolerance: 60
      },
      (error, decoded) => {
        if (error) {
          if (error instanceof AppError) return reject(error);
          return reject(new AppError("Firebase ID token is invalid or expired", 401));
        }

        if (!decoded) {
          return reject(new AppError("Firebase ID token could not be decoded", 401));
        }

        try {
          resolve(validateDecodedToken(decoded));
        } catch (validationError) {
          reject(validationError);
        }
      }
    );
  });
}
