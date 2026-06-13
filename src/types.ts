import type { Ref } from "vue";
import type { AuthioStorageMode } from "./storage";
import type { AuthioTelemetryListener } from "./telemetry";

export interface AuthioUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

export type AuthioStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthioPluginOptions {
  apiUrl: string;
  projectId: string;
  /** Token storage mode. Defaults to `memory`. */
  storage?: AuthioStorageMode;
  /** Schedule silent refresh N seconds before access-token expiry. Default 60. */
  refreshLeadSeconds?: number;
  /** Forward SDK telemetry into Sentry/Datadog. No phone-home by default. */
  onTelemetryEvent?: AuthioTelemetryListener;
  /** Inject a custom fetch (Node 16 / mocking). Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Override JWT issuer (staging tenants). */
  jwtIssuer?: string;
  /** Override JWT audience (staging tenants). */
  jwtAudience?: string;
  /** Override the redirect target for `signIn()`. Defaults to `/sign-in`. */
  signInPath?: string;
  /** Optional starting access token (e.g. handed off from the BFF). */
  initialAccessToken?: string | null;
  /** Optional starting refresh token (memory-only). */
  initialRefreshToken?: string | null;
  /** Optional starting user. */
  initialUser?: AuthioUser | null;
}

export interface AuthioContextValue {
  user: Ref<AuthioUser | null>;
  status: Ref<AuthioStatus>;
  accessToken: Ref<string | null>;
  getAccessToken(): Promise<string | null>;
  signIn(): void;
  signOut(): Promise<void>;
  refresh(): Promise<boolean>;
  /**
   * Hand a freshly-obtained `(accessToken, refreshToken, user)` triple to
   * the SDK — e.g. after `signInWithPasskey` resolves. Verifies the
   * access token, swaps it into reactive state, and (re-)arms the silent
   * refresh scheduler.
   */
  handleSignInResult(input: {
    accessToken: string;
    refreshToken?: string | null;
    user?: AuthioUser | null;
  }): Promise<void>;
}

/**
 * Extended context returned by `createAuthio().context`. The extra
 * `dispose()` and `bootstrap()` hooks are not surfaced to user-land
 * components via `useAuthio()` (which returns the slim
 * `AuthioContextValue` only) — they're intended for tests, Nuxt server
 * teardown, and hot-reload scenarios where you need to stop the
 * silent-refresh timer.
 */
export interface AuthioPluginContext extends AuthioContextValue {
  /** Tear down timers + listeners. Idempotent. */
  dispose(): void;
  /** Re-run the bootstrap sequence (e.g. after hot-reload). */
  bootstrap(): void;
}

/**
 * The Vue plugin returned from `createAuthio()`. Pass to `app.use()`.
 */
export interface AuthioPlugin {
  install(app: import("vue").App): void;
  /** The shared context — mostly useful from tests / Nuxt. */
  context: AuthioPluginContext;
  /** Options the plugin was constructed with. */
  options: AuthioPluginOptions;
}
