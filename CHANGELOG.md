# Changelog

All notable changes to `@useauthio/vue` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.2] — 2026-06-13

### Fixed
- **Magic-link sign-in now matches auth-core.** `signInWithMagicLink`
  posted to `/v1/auth/magic-link/start` with body `{ email, redirect_uri }`;
  auth-core's route is `/v1/auth/magic-link/send` and the recipient field
  is `destination`. Real sends were rejected; they now succeed.
- **Passkey login now completes.** `signInWithPasskey` called
  `/v1/auth/passkey/login/start` and posted `{ email, assertion }`;
  auth-core's route is `/v1/auth/passkey/login/options` and verify expects
  the WebAuthn assertion (camelCase) wrapped under a top-level `credential`
  key (unknown fields are rejected). The options response is also parsed as
  camelCase (`rpId` / `userVerification` / `allowCredentials`).

## [0.2.0] — 2026-06-12

### Changed
- **Renamed npm package `@authio/vue` → `@useauthio/vue`.** The
  original `@authio` scope could not be claimed on npm, so every Authio
  SDK now publishes under the organization scope `@useauthio`. Install
  with `npm install @useauthio/vue` and update imports accordingly.
  The old `@authio/vue` name is retired; releases below this entry were
  published (or prepared) under the old name and are kept for history.

## [0.2.1] — 2026-06-13

### Fixed
- **Package is now installable from npm.** `0.2.0` declared its
  `@useauthio/node` dependency as `file:./vendor/authio-node` (and did
  not even ship the vendor directory in the tarball), so
  `npm install @useauthio/vue` failed for every external user. The
  dependency now points at the published `@useauthio/node` (`^0.2.0`).

## [Unreleased]

## [0.1.0] — 2026-05-22

### Added
- Initial release of the `@authio/vue` SDK for pure-SPA Vue 3
  integrations.
- `createAuthio({ apiUrl, projectId, ... })` Vue plugin install factory.
- `useAuthio()` composable returning Vue refs
  `{ user, status, accessToken, getAccessToken, signIn, signOut, refresh }`.
- `<AuthioProvider>` SFC for component-tree-scoped Authio state.
- `<SignedIn>` / `<SignedOut>` slot-based gates and
  `<RedirectToSignIn return-to />`.
- `signInWithMagicLink` and `signInWithPasskey` top-level helpers.
- `createAuthioRouterGuard()` `vue-router` integration — `beforeEach`
  guard that redirects unauthenticated users with `?returnTo=...`.
- Token storage modes: `memory` (default), `localStorage`,
  `sessionStorage`, `none`. Refresh tokens are never JS-accessible.
- JWT signature verification via `@authio/node`'s `JwtVerifier`
  (EdDSA-pinned, refuses `alg: none`).
- Optional `onTelemetryEvent` hook for Sentry/Datadog wiring. No
  phone-home by default.
- SSR-safe for Nuxt 3 / Vite SSR — every composable handles
  `typeof window === "undefined"`.
- **Experimental** Nuxt 3 module entry (`@authio/vue/nuxt`) that
  auto-installs the plugin and route guard.
- Dual ESM + CJS via tsup, full TypeScript declarations, zero runtime
  deps beyond `@authio/node`.

[0.1.0]: https://github.com/authio-com/authio_vue/releases/tag/v0.1.0
