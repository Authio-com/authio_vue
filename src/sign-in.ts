import type { AuthioUser } from "./types";
import { authioFetch } from "./fetch";
import { AuthioError, toAuthioError } from "./errors";
import { isBrowser } from "./ssr";

export interface SignInWithMagicLinkInput {
  apiUrl: string;
  projectId: string;
  email: string;
  redirectUri: string;
  signal?: AbortSignal;
  fetch?: typeof fetch;
}

/**
 * Kick off the magic-link sign-in ceremony. Resolves once auth-core has
 * accepted the request (the email is then dispatched out-of-band). The
 * landing page at `redirectUri` is responsible for completing the
 * exchange by calling back into the SDK with the returned token.
 */
export async function signInWithMagicLink(
  input: SignInWithMagicLinkInput,
): Promise<void> {
  if (!input.email) {
    throw new AuthioError({
      code: "invalid_input",
      message: "signInWithMagicLink: `email` is required",
      status: 0,
    });
  }
  if (!input.redirectUri) {
    throw new AuthioError({
      code: "invalid_input",
      message: "signInWithMagicLink: `redirectUri` is required",
      status: 0,
    });
  }

  await authioFetch<void>({
    apiUrl: input.apiUrl,
    projectId: input.projectId,
    // auth-core's magic-link send route is `/v1/auth/magic-link/send` and
    // the recipient field is `destination` (email or E.164), NOT `email`.
    // See auth-core magiclink.go registerMagicLinkRoutes + magicLinkSendReq.
    path: "/v1/auth/magic-link/send",
    method: "POST",
    body: { destination: input.email, redirect_uri: input.redirectUri },
    signal: input.signal,
    fetch: input.fetch,
  });
}

export interface SignInWithPasskeyInput {
  apiUrl: string;
  projectId: string;
  email: string;
  signal?: AbortSignal;
  fetch?: typeof fetch;
}

export interface SignInWithPasskeyResult {
  accessToken: string;
  refreshToken: string;
  user: AuthioUser;
}

interface PasskeyChallenge {
  challenge: string;
  // auth-core unwraps go-webauthn's CredentialAssertion and emits the inner
  // PublicKeyCredentialRequestOptions, which is standard WebAuthn camelCase
  // (rpId / userVerification / allowCredentials), NOT snake_case.
  rpId?: string;
  timeout?: number;
  userVerification?: "required" | "preferred" | "discouraged";
  allowCredentials?: Array<{
    id: string;
    type?: "public-key";
    transports?: string[];
  }>;
}

interface PasskeyVerifyResponse {
  access_token: string;
  refresh_token: string;
  user: AuthioUser;
}

/**
 * Run the WebAuthn ceremony end-to-end. Two round-trips with auth-core:
 *
 *   1. `POST /v1/auth/passkey/login/start` → challenge + allowList
 *   2. `navigator.credentials.get(...)` → assertion
 *   3. `POST /v1/auth/passkey/login/verify` → `{ access_token, refresh_token, user }`
 *
 * Throws `AuthioError` on any failure path.
 */
export async function signInWithPasskey(
  input: SignInWithPasskeyInput,
): Promise<SignInWithPasskeyResult> {
  if (!isBrowser()) {
    throw new AuthioError({
      code: "passkey_unavailable",
      message: "signInWithPasskey can only be invoked in a browser",
      status: 0,
    });
  }
  if (!input.email) {
    throw new AuthioError({
      code: "invalid_input",
      message: "signInWithPasskey: `email` is required",
      status: 0,
    });
  }
  if (!navigator.credentials || typeof navigator.credentials.get !== "function") {
    throw new AuthioError({
      code: "passkey_unavailable",
      message: "WebAuthn is not available in this browser",
      status: 0,
    });
  }

  const challenge = await authioFetch<PasskeyChallenge>({
    apiUrl: input.apiUrl,
    projectId: input.projectId,
    // auth-core's passkey login route is `/options`, not `/start`.
    path: "/v1/auth/passkey/login/options",
    method: "POST",
    body: { email: input.email },
    signal: input.signal,
    fetch: input.fetch,
  });

  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: base64UrlToBuf(challenge.challenge),
        rpId: challenge.rpId,
        timeout: challenge.timeout ?? 60_000,
        userVerification: challenge.userVerification ?? "preferred",
        allowCredentials: (challenge.allowCredentials ?? []).map((c) => ({
          id: base64UrlToBuf(c.id),
          type: "public-key",
          transports: c.transports as AuthenticatorTransport[] | undefined,
        })),
      },
      signal: input.signal,
    })) as PublicKeyCredential | null;
  } catch (err) {
    throw toAuthioError(err, {
      code: "passkey_ceremony_failed",
      message: "WebAuthn ceremony was rejected by the authenticator",
    });
  }

  if (!assertion) {
    throw new AuthioError({
      code: "passkey_ceremony_failed",
      message: "WebAuthn ceremony returned no credential",
      status: 0,
    });
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  // auth-core's login/verify expects the standard WebAuthn JSON (camelCase)
  // wrapped under a top-level `credential` key, and rejects unknown
  // top-level fields (DisallowUnknownFields) — so no `email`/`assertion`
  // wrapper. See auth-core passkey.go passkeyLoginVerify.
  const credential = {
    id: assertion.id,
    rawId: bufToBase64Url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufToBase64Url(response.clientDataJSON),
      authenticatorData: bufToBase64Url(response.authenticatorData),
      signature: bufToBase64Url(response.signature),
      userHandle: response.userHandle ? bufToBase64Url(response.userHandle) : null,
    },
  };

  const verified = await authioFetch<PasskeyVerifyResponse>({
    apiUrl: input.apiUrl,
    projectId: input.projectId,
    path: "/v1/auth/passkey/login/verify",
    method: "POST",
    body: { credential },
    signal: input.signal,
    fetch: input.fetch,
  });

  return {
    accessToken: verified.access_token,
    refreshToken: verified.refresh_token,
    user: verified.user,
  };
}

function base64UrlToBuf(b64url: string): ArrayBuffer {
  const s = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s + pad);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
