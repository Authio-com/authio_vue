# `@useauthio/vue` — Vite + Vue 3 example

Minimal Vite + Vue 3 + TypeScript + `vue-router` app demonstrating the
full surface of `@useauthio/vue`:

- `app.use(createAuthio(...))` plugin install.
- `<SignedIn>` / `<SignedOut>` gates in `App.vue`.
- Magic-link sign-in (`signInWithMagicLink`) and passkey sign-in
  (`signInWithPasskey`) in `views/SignIn.vue`.
- Protected `/dashboard` route via `meta.requiresAuth` + the
  `createAuthioRouterGuard()` `beforeEach` guard.
- `signOut` button.

## Run

```sh
cp .env.example .env
# edit .env to point at your Authio tenant
pnpm install
pnpm dev
```

The `@useauthio/vue` dependency is a `file:../..` link, so any changes to
the SDK source rebuild and propagate after `pnpm --filter @useauthio/vue build`.
