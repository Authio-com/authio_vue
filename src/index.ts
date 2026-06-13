/**
 * Public surface of @useauthio/vue.
 *
 * - `createAuthio()` — Vue plugin factory; pass to `app.use()`.
 * - `<AuthioProvider>` — component-tree-scoped provider.
 * - `useAuthio()` — composable returning reactive Vue refs.
 * - `<SignedIn>` / `<SignedOut>` — slot-based gates.
 * - `<RedirectToSignIn>` — declarative redirect.
 * - `signInWithMagicLink` / `signInWithPasskey` — top-level helpers.
 * - `createAuthioRouterGuard()` — vue-router `beforeEach` guard.
 * - `AuthioError` — re-exported from `@useauthio/node`.
 */

export { createAuthio } from "./plugin";
export { AuthioProvider } from "./provider";
export { useAuthio, AUTHIO_INJECTION_KEY } from "./composables";
export { SignedIn, SignedOut, RedirectToSignIn } from "./gates";
export {
  signInWithMagicLink,
  signInWithPasskey,
  type SignInWithMagicLinkInput,
  type SignInWithPasskeyInput,
  type SignInWithPasskeyResult,
} from "./sign-in";
export {
  createAuthioRouterGuard,
  type AuthioRouterGuard,
  type CreateAuthioRouterGuardOptions,
} from "./router-guard";
export { AuthioError } from "./errors";
export { readJwtExp, createVerifier, JwtVerifier, type AuthioClaims } from "./jwt";
export type {
  AuthioUser,
  AuthioStatus,
  AuthioPluginOptions,
  AuthioContextValue,
  AuthioPlugin,
} from "./types";
export type {
  AuthioTelemetryEvent,
  AuthioTelemetryListener,
} from "./telemetry";
export type { AuthioStorageMode, AuthioStorage } from "./storage";
