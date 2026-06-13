import { JwtVerifier, type AuthioClaims } from "@useauthio/node";

export { JwtVerifier };
export type { AuthioClaims };

/**
 * Parse the `exp` claim out of a JWT WITHOUT verifying the signature.
 *
 * Used only to schedule the silent-refresh timer — we do NOT trust this
 * value for any authentication decision. The token's signature is
 * verified by `JwtVerifier` before it is ever placed into reactive
 * state via `verifyAccessToken`.
 *
 * Returns the unix epoch seconds, or `null` if the token is malformed
 * or has no `exp` claim.
 */
export function readJwtExp(token: string | null | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadSeg = parts[1];
  if (!payloadSeg) return null;
  try {
    const json = base64UrlDecode(payloadSeg);
    const parsed = JSON.parse(json) as { exp?: unknown };
    if (typeof parsed.exp === "number" && Number.isFinite(parsed.exp)) {
      return parsed.exp;
    }
    return null;
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad === 1) throw new Error("invalid base64url segment");
  if (typeof atob === "function") {
    const decoded = atob(s);
    try {
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch {
      return decoded;
    }
  }
  return Buffer.from(s, "base64").toString("utf8");
}

const DEFAULT_ISSUER = "https://api.authio.com";
const DEFAULT_AUDIENCE = "authio";

/**
 * Construct a `JwtVerifier` against the consumer's `apiUrl`. Issuer +
 * audience default to the production values; consumers running against
 * a staging tenant pass overrides.
 */
export function createVerifier(opts: {
  apiUrl: string;
  issuer?: string;
  audience?: string;
}): JwtVerifier {
  return new JwtVerifier(
    opts.apiUrl,
    opts.issuer ?? DEFAULT_ISSUER,
    opts.audience ?? DEFAULT_AUDIENCE,
  );
}
