<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/logo-dark.png">
    <img alt="Authio" src=".github/logo-light.png" width="220">
  </picture>
</p>

# @useauthio/vue

> Part of **[Authio Lobby](https://authio.com/products/lobby)** —
> Authio's drop-in passwordless authentication. Learn more at
> https://authio.com/products/lobby.

**Vue 3 SDK for Authio — plugin, composable, gates, and router guard
for pure SPAs.**

Pure-SPA Vue 3 surface for Authio. Use this when your frontend talks
directly to `auth-core` from the browser (no BFF). For Nuxt 3 + a
server route, prefer `@useauthio/nextjs` — see the comparison table
below.

## Recent additions

- **Embed `@useauthio/widgets` in a Vue template** via the
  framework-agnostic `mountSSOConnectionWidget` /
  `mountDirectorySyncWidget` helpers — full snippet on
  [`/sdks/vue`](https://docs.authio.com/sdks/vue#embedding-authiowidgets-in-a-vue-app).
  Mint the JWT from any Node BFF / Nuxt server route per
  [`/widgets/tokens`](https://docs.authio.com/widgets/tokens).
- **Roles + permissions on the JWT.** The composables expose
  `claims.roles` (string in single-role mode, array in multi-role
  mode) and `claims.permissions` (always an array) for any UI that
  wants to gate on roles and permissions.
  ([`/concepts/roles-and-permissions`](https://docs.authio.com/concepts/roles-and-permissions))

## 5-minute integration

```bash
pnpm add @useauthio/vue
```

```ts
// main.ts
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { createAuthio, createAuthioRouterGuard } from "@useauthio/vue";
import App from "./App.vue";

const app = createApp(App);

app.use(
  createAuthio({
    apiUrl: import.meta.env.VITE_AUTHIO_API_URL,
    projectId: import.meta.env.VITE_AUTHIO_PROJECT_ID,
  }),
);

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("./views/Home.vue") },
    { path: "/sign-in", component: () => import("./views/SignIn.vue") },
    {
      path: "/dashboard",
      component: () => import("./views/Dashboard.vue"),
      meta: { requiresAuth: true },
    },
  ],
});
router.beforeEach(createAuthioRouterGuard());
app.use(router);

app.mount("#app");
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { SignedIn, SignedOut, useAuthio } from "@useauthio/vue";
const { user, signOut } = useAuthio();
</script>

<template>
  <SignedIn>
    Hello {{ user!.email }} — <button @click="signOut">Sign out</button>
  </SignedIn>
  <SignedOut>
    <router-link to="/sign-in">Sign in</router-link>
  </SignedOut>
</template>
```

```vue
<!-- views/SignIn.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { signInWithMagicLink } from "@useauthio/vue";
const email = ref("");
async function submit() {
  await signInWithMagicLink({
    apiUrl: import.meta.env.VITE_AUTHIO_API_URL,
    projectId: import.meta.env.VITE_AUTHIO_PROJECT_ID,
    email: email.value,
    redirectUri: window.location.origin + "/dashboard",
  });
}
</script>

<template>
  <input v-model="email" type="email" />
  <button @click="submit">Send magic link</button>
</template>
```

That's it. You have:

- A reactive Authio state machine you can read from any component via
  `useAuthio()`.
- Silent background refresh (default: 60s before access-token expiry).
- A vue-router guard that bounces unauthenticated users to `/sign-in`
  with `?returnTo=/dashboard?...`.
- Slot-based `<SignedIn>` / `<SignedOut>` gates with no flash of
  wrong-state content (renders nothing while `status === "loading"`).

---

## API reference

### `createAuthio(options)`

Vue plugin factory. Pass the returned object to `app.use()`.

```ts
import { createAuthio } from "@useauthio/vue";

app.use(
  createAuthio({
    apiUrl: "https://auth-api.authio.com",
    projectId: "proj_...",
    // optional:
    storage: "memory",          // | "localStorage" | "sessionStorage" | "none"
    refreshLeadSeconds: 60,
    onTelemetryEvent(ev) { sentry.captureMessage(ev.type, { extra: ev }) },
    fetch: customFetch,
    jwtIssuer: "https://staging-auth.acme.com",
    jwtAudience: "authio",
    signInPath: "/login",
    initialAccessToken: null,
    initialRefreshToken: null,
    initialUser: null,
  }),
);
```

Returns `{ install, options, context }` — `context` is the same
`AuthioContextValue` exposed by `useAuthio()`, useful from tests and
the Nuxt module.

### `useAuthio()`

Composable. Must be called inside the `setup()` of a component that
lives under either the plugin install OR an `<AuthioProvider>`.

```ts
const {
  user,            // Ref<AuthioUser | null>
  status,          // Ref<"loading" | "authenticated" | "unauthenticated">
  accessToken,     // Ref<string | null>
  getAccessToken,  // () => Promise<string | null>     -- refreshes if near expiry
  signIn,          // () => void                       -- navigates to signInPath
  signOut,         // () => Promise<void>              -- clears state, revokes RT
  refresh,         // () => Promise<boolean>           -- force a silent refresh
} = useAuthio();
```

### `<AuthioProvider>`

Component-tree-scoped provider. Use this when `app.use()` doesn't fit
your app shape — for instance, a multi-tenant dashboard that needs to
swap `projectId` between routes.

```vue
<AuthioProvider :api-url="apiUrl" :project-id="projectId">
  <Dashboard />
</AuthioProvider>
```

All props of `createAuthio()` are exposed as kebab-case props here
(`api-url`, `project-id`, `refresh-lead-seconds`, …).

### `<SignedIn>` / `<SignedOut>`

Slot-based gates. Render the default slot only when status matches.
Render nothing while loading — no flash of wrong-state UI.

```vue
<SignedIn>
  <Dashboard />
</SignedIn>
<SignedOut>
  <SignInForm />
</SignedOut>
```

### `<RedirectToSignIn :return-to="..." />`

Declarative redirect. When mounted, if the user is unauthenticated,
the browser navigates to `signInPath?returnTo=<encoded>`. Use sparingly
— prefer `createAuthioRouterGuard()` for protecting whole routes.

### `signInWithMagicLink(input)`

```ts
await signInWithMagicLink({
  apiUrl,
  projectId,
  email: "alice@example.com",
  redirectUri: window.location.origin + "/callback",
  // optional:
  signal,
  fetch,
});
```

Resolves once auth-core has accepted the request (the email is then
dispatched out-of-band). The landing page at `redirectUri` is
responsible for completing the exchange.

### `signInWithPasskey(input)`

```ts
const { accessToken, refreshToken, user } = await signInWithPasskey({
  apiUrl,
  projectId,
  email: "alice@example.com",
});
// hand the triple to the SDK so the state machine adopts it:
const { handleSignInResult } = useAuthio();
await handleSignInResult({ accessToken, refreshToken, user });
```

Runs the WebAuthn ceremony end-to-end against auth-core. Throws
`AuthioError` with `code: "passkey_unavailable"` on browsers without
WebAuthn.

### `createAuthioRouterGuard(options?)`

Returns a `beforeEach` guard for `vue-router`. Routes that opt in via
`meta: { requiresAuth: true }` redirect unauthenticated users to
`signInPath?returnTo=<current>`.

```ts
router.beforeEach(
  createAuthioRouterGuard({
    signInPath: "/sign-in",      // default
    returnToParam: "returnTo",   // default
  }),
);
```

The guard awaits the initial bootstrap when `status === "loading"`, so
deep links into protected routes never flash the sign-in page for a
returning user.

### `AuthioError`

Every reject path throws `AuthioError` (re-exported from
`@useauthio/node`). Inspect `.code`, `.status`, and `.requestId` to
branch in your UI.

```ts
import { AuthioError } from "@useauthio/vue";

try {
  await signInWithMagicLink({ ... });
} catch (e) {
  if (e instanceof AuthioError && e.code === "rate_limited") {
    notify("Too many attempts. Try again in a minute.");
  }
}
```

---

## When to use `@useauthio/vue` vs `@useauthio/nextjs`

`@useauthio/vue` is for **pure SPAs**. The browser holds the access
token, talks directly to `auth-core` for refresh, and there is no
server-rendered HTML in your auth flow. If you have a Nuxt 3 BFF
(server routes, `useFetch` proxying through your origin), you'll get
a stronger security posture with the cookie-bound BFF pattern in
`@useauthio/nextjs`.

| Concern | `@useauthio/vue` (this SDK) | `@useauthio/nextjs` |
|---|---|---|
| Runtime | Browser (Vite SPA) | Server (Node/Edge) + browser |
| Tokens live in | JS memory (default) | HttpOnly cookies |
| Refresh | Silent in-browser timer, hits `auth-core` directly | Server-side refresh handler rotates cookies |
| XSS exposure | Access token reachable from JS (unless `storage: "memory"`) | Access token never reachable from JS |
| Login-CSRF defense (D1) | Origin-bound state nonce optional | Built-in via `createAuthioSignInHandler` |
| Best for | Static SPAs, Tauri / Electron, Nuxt SSG | Nuxt 3 with server routes, Next.js apps, anything with a BFF |

**Rule of thumb:** if your app has a `/server/` directory or an
edge-runtime middleware, you want `@useauthio/nextjs`. Otherwise this
SDK is what you want.

---

## CSP guidance

Add your Authio API origin to `connect-src`:

```http
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' https://auth-api.authio.com;
  script-src 'self';
  style-src 'self' 'unsafe-inline';
```

If you run a self-hosted auth-core, replace
`https://auth-api.authio.com` with your tenant's URL. The SDK only
hits one host (`apiUrl`) — never any third party.

---

## Token storage — security considerations

The SDK supports four storage modes for the access token, picked via
`storage`:

| Mode | Persists across | XSS exposure |
|---|---|---|
| `memory` (default) | This tab, this load | Access token reachable until tab close |
| `sessionStorage` | This tab | Access token reachable for the tab's lifetime |
| `localStorage` | All tabs, forever | Access token reachable from any script for as long as the user is signed in |
| `none` | Nothing | Access token reachable only inside the current `useAuthio()` call |

**XSS reality check.** Any token reachable from JavaScript can be
exfiltrated by an XSS bug. If your app loads ANY third-party scripts
(analytics, ads, embedded chat widgets), prefer `memory`. If you can
tolerate a tab refresh forcing re-login, prefer `memory` over
`sessionStorage`. Only choose `localStorage` if you've eliminated all
third-party script surface and accept the trade-off explicitly.

**Refresh tokens are never JS-accessible.** Regardless of `storage`,
refresh tokens live only in JS-memory (lost on tab close) and are
never written to `localStorage` / `sessionStorage`. This is non-
configurable — the spec is that an XSS bug must not be able to mint
a persistent session.

---

## CSRF guidance

Pure-SPA mode uses bearer tokens — `Authorization: Bearer <jwt>` —
not cookies. CSRF is therefore not a vector for auth-core requests
themselves. However:

1. **CORS allowlist.** The auth-core API enforces a per-project CORS
   allowlist. Your SPA's origin must be added to `project.web_origins`
   on the dashboard before any browser request will succeed.
2. **`SameSite` is N/A.** Since the SDK uses bearer auth, no `SameSite`
   cookie attribute applies. The bearer-vs-cookie boundary is also why
   we can't run a BFF login-CSRF defense (D1) from a pure SPA — for
   that posture, switch to `@useauthio/nextjs` and the
   `createAuthioSignInHandler` flow.
3. **Magic-link redirect URIs are exact-matched.** auth-core refuses
   any `redirect_uri` not in `project.allowed_redirect_uris`, so a
   stolen magic-link can't be re-pointed at an attacker origin.

---

## Nuxt 3 module — EXPERIMENTAL

> **Status: experimental.** API may change in a `0.x` minor.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@useauthio/vue/nuxt"],
  authio: {
    apiUrl: process.env.AUTHIO_API_URL!,
    projectId: process.env.AUTHIO_PROJECT_ID!,
    registerRouterGuard: true,
  },
});
```

The module installs the Vue plugin and (optionally) the router guard
into the Nuxt app. For now, prefer manually wiring `createAuthio()` in
a `plugins/authio.client.ts` — the module entry exists to take a
dependency on so future versions can stabilise it.

If you need server-side cookies + the BFF login-CSRF defense, use
`@useauthio/nextjs` instead. We'll graduate the Nuxt module out of
experimental once we have a first-party Nuxt 3 BFF helper alongside it.

---

## License

MIT
