import { ref, type Ref } from "vue";
import type {
  AuthioContextValue,
  AuthioPluginContext,
  AuthioPluginOptions,
  AuthioUser,
} from "./types";
import { authioFetch } from "./fetch";
import { createVerifier, readJwtExp, type JwtVerifier } from "./jwt";
import { AuthioError, toAuthioError } from "./errors";
import { safeEmit, type AuthioTelemetryListener } from "./telemetry";
import {
  createStorage,
  ACCESS_TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  type AuthioStorage,
} from "./storage";
import { createRefreshScheduler, type RefreshScheduler } from "./refresh";
import { isBrowser } from "./ssr";

const DEFAULT_REFRESH_LEAD_SECONDS = 60;
const DEFAULT_SIGN_IN_PATH = "/sign-in";

export type AuthioStateInternal = AuthioPluginContext;

interface BuildArgs {
  options: AuthioPluginOptions;
}

/**
 * Constructs the shared `AuthioContextValue` that both the Vue plugin
 * install (`createAuthio`) and the `<AuthioProvider>` SFC expose. The
 * same factory is used by both so the surface is byte-for-byte
 * identical regardless of the integration path.
 */
export function buildAuthioState({ options }: BuildArgs): AuthioStateInternal {
  if (!options.apiUrl) {
    throw new AuthioError({
      code: "invalid_options",
      message: "createAuthio: `apiUrl` is required",
      status: 0,
    });
  }
  if (!options.projectId) {
    throw new AuthioError({
      code: "invalid_options",
      message: "createAuthio: `projectId` is required",
      status: 0,
    });
  }

  const telemetry: AuthioTelemetryListener | undefined = options.onTelemetryEvent;
  const storage: AuthioStorage = createStorage(options.storage ?? "memory");
  const refreshLeadSeconds = options.refreshLeadSeconds ?? DEFAULT_REFRESH_LEAD_SECONDS;
  const fetchImpl = options.fetch;

  const user: Ref<AuthioUser | null> = ref<AuthioUser | null>(options.initialUser ?? null);
  const status: Ref<AuthioContextValue["status"]["value"]> = ref<
    AuthioContextValue["status"]["value"]
  >("loading");
  const accessToken: Ref<string | null> = ref<string | null>(
    options.initialAccessToken ?? null,
  );

  // Refresh tokens are MEMORY-ONLY. They are intentionally never placed
  // into localStorage / sessionStorage even when the consumer opts into
  // a JS-accessible storage for the access token.
  let refreshToken: string | null = options.initialRefreshToken ?? null;

  const verifier: JwtVerifier = createVerifier({
    apiUrl: options.apiUrl,
    issuer: options.jwtIssuer,
    audience: options.jwtAudience,
  });

  // Hydrate from storage if available.
  if (!accessToken.value) {
    const restored = storage.get(ACCESS_TOKEN_STORAGE_KEY);
    if (restored) accessToken.value = restored;
  }
  if (!user.value) {
    const rawUser = storage.get(USER_STORAGE_KEY);
    if (rawUser) {
      try {
        user.value = JSON.parse(rawUser) as AuthioUser;
      } catch {
        storage.remove(USER_STORAGE_KEY);
      }
    }
  }

  const scheduler: RefreshScheduler = createRefreshScheduler({
    refreshLeadSeconds,
    getAccessToken: () => accessToken.value,
    refresh: () => refresh(),
  });

  function setUnauthenticated(): void {
    user.value = null;
    accessToken.value = null;
    refreshToken = null;
    storage.remove(ACCESS_TOKEN_STORAGE_KEY);
    storage.remove(USER_STORAGE_KEY);
    status.value = "unauthenticated";
    scheduler.cancel();
  }

  function persistAuthenticated(): void {
    if (accessToken.value) storage.set(ACCESS_TOKEN_STORAGE_KEY, accessToken.value);
    if (user.value) storage.set(USER_STORAGE_KEY, JSON.stringify(user.value));
  }

  async function verifyAndAdopt(
    nextAccessToken: string,
    nextUser: AuthioUser | null,
  ): Promise<void> {
    try {
      const claims = await verifier.verify(nextAccessToken);
      accessToken.value = nextAccessToken;
      if (nextUser) user.value = nextUser;
      status.value = "authenticated";
      persistAuthenticated();
      safeEmit(telemetry, {
        type: "token_verified",
        at: Date.now(),
        userId: claims.sub,
      });
      scheduler.schedule();
    } catch (err) {
      safeEmit(telemetry, {
        type: "token_rejected",
        at: Date.now(),
        reason: err instanceof Error ? err.message : String(err),
      });
      setUnauthenticated();
      throw toAuthioError(err, {
        code: "token_rejected",
        message: "Authio rejected the access token signature",
      });
    }
  }

  async function handleSignInResult(input: {
    accessToken: string;
    refreshToken?: string | null;
    user?: AuthioUser | null;
  }): Promise<void> {
    refreshToken = input.refreshToken ?? refreshToken;
    await verifyAndAdopt(input.accessToken, input.user ?? user.value);
  }

  async function refresh(): Promise<boolean> {
    if (!refreshToken) {
      setUnauthenticated();
      safeEmit(telemetry, {
        type: "refresh_failed",
        at: Date.now(),
        attempt: 1,
        reason: "no_refresh_token",
      });
      return false;
    }
    try {
      const result = await authioFetch<{
        access_token: string;
        refresh_token?: string;
        user?: AuthioUser;
      }>({
        apiUrl: options.apiUrl,
        projectId: options.projectId,
        path: "/v1/auth/refresh",
        method: "POST",
        body: { refresh_token: refreshToken },
        fetch: fetchImpl,
      });

      if (result.refresh_token) refreshToken = result.refresh_token;
      await verifyAndAdopt(result.access_token, result.user ?? user.value);
      safeEmit(telemetry, { type: "refresh_succeeded", at: Date.now() });
      return true;
    } catch (err) {
      safeEmit(telemetry, {
        type: "refresh_failed",
        at: Date.now(),
        attempt: 1,
        reason: err instanceof Error ? err.message : String(err),
      });
      setUnauthenticated();
      return false;
    }
  }

  async function getAccessToken(): Promise<string | null> {
    if (!accessToken.value) return null;
    const exp = readJwtExp(accessToken.value);
    if (exp) {
      const skewSeconds = Math.max(5, Math.min(refreshLeadSeconds, 30));
      const expiresInMs = exp * 1000 - Date.now();
      if (expiresInMs < skewSeconds * 1000) {
        const ok = await refresh();
        if (!ok) return null;
      }
    }
    return accessToken.value;
  }

  function signIn(): void {
    if (!isBrowser()) return;
    const target = options.signInPath ?? DEFAULT_SIGN_IN_PATH;
    safeEmit(telemetry, {
      type: "sign_in_started",
      at: Date.now(),
      method: "magic_link",
    });
    window.location.assign(target);
  }

  async function signOut(): Promise<void> {
    const had = !!accessToken.value || !!refreshToken;
    try {
      if (refreshToken || accessToken.value) {
        await authioFetch<void>({
          apiUrl: options.apiUrl,
          projectId: options.projectId,
          path: "/v1/auth/sign-out",
          method: "POST",
          body: { refresh_token: refreshToken ?? undefined },
          accessToken: accessToken.value,
          fetch: fetchImpl,
        }).catch(() => {
          /* server-side revoke is best-effort */
        });
      }
    } finally {
      setUnauthenticated();
      if (had) safeEmit(telemetry, { type: "sign_out", at: Date.now() });
    }
  }

  async function bootstrap(): Promise<void> {
    if (!isBrowser()) {
      status.value = options.initialUser ? "authenticated" : "unauthenticated";
      return;
    }
    if (accessToken.value) {
      const exp = readJwtExp(accessToken.value);
      const stillValid =
        exp === null ? false : exp * 1000 - Date.now() > refreshLeadSeconds * 1000;
      if (stillValid && user.value) {
        status.value = "authenticated";
        scheduler.schedule();
        return;
      }
      if (refreshToken) {
        const ok = await refresh();
        if (ok) return;
      }
    }
    if (refreshToken) {
      const ok = await refresh();
      if (ok) return;
    }
    setUnauthenticated();
  }

  function dispose(): void {
    scheduler.cancel();
  }

  void bootstrap();

  return {
    user,
    status,
    accessToken,
    getAccessToken,
    signIn,
    signOut,
    refresh,
    handleSignInResult,
    dispose,
    bootstrap: () => void bootstrap(),
  };
}
