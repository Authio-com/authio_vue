/**
 * EXPERIMENTAL Nuxt 3 module entry. Pulled in as `@useauthio/vue/nuxt`:
 *
 *   // nuxt.config.ts
 *   export default defineNuxtConfig({
 *     modules: ["@useauthio/vue/nuxt"],
 *     authio: {
 *       apiUrl: process.env.AUTHIO_API_URL!,
 *       projectId: process.env.AUTHIO_PROJECT_ID!,
 *     },
 *   });
 *
 * This module exposes a stable shape — `defineNuxtModule`-compatible
 * setup function plus a `register` helper for non-Nuxt SSR frameworks —
 * but is marked EXPERIMENTAL in the README until we've shipped a few
 * real Nuxt apps on it.
 *
 * The module is intentionally typed against a minimal local `NuxtApp`
 * shape so consumers don't need to install `nuxt` to typecheck the
 * SDK build. The real Nuxt types are picked up by the Nuxt app at
 * consumer install time.
 */

import type { App } from "vue";
import type { AuthioPlugin, AuthioPluginOptions } from "./types";
import { createAuthio } from "./plugin";
import { createAuthioRouterGuard } from "./router-guard";

export interface AuthioNuxtModuleOptions extends AuthioPluginOptions {
  /** Automatically install the router guard. Default true. */
  registerRouterGuard?: boolean;
  /** Guard options. */
  guard?: {
    signInPath?: string;
    returnToParam?: string;
  };
}

interface MinimalNuxtApp {
  vueApp: App;
  $router?: {
    beforeEach: (g: (to: unknown) => unknown) => void;
  };
}

/**
 * Programmatic install — exposed for non-Nuxt SSR setups and tests.
 * Returns the configured plugin so the consumer can inspect / dispose
 * the underlying state.
 */
export function registerAuthio(
  nuxtApp: MinimalNuxtApp,
  options: AuthioNuxtModuleOptions,
): AuthioPlugin {
  const plugin = createAuthio(options);
  nuxtApp.vueApp.use(plugin);
  if (options.registerRouterGuard !== false && nuxtApp.$router) {
    const guard = createAuthioRouterGuard(options.guard ?? {});
    nuxtApp.$router.beforeEach(guard as (to: unknown) => unknown);
  }
  return plugin;
}

/**
 * Nuxt-module shape. We don't depend on `@nuxt/kit` directly — instead
 * we export the setup function and let the consumer wire it via
 * `defineNuxtModule` if they need full module ergonomics. The function
 * signature matches what `defineNuxtModule({ setup })` expects.
 */
export const nuxtModule = {
  meta: {
    name: "@useauthio/vue/nuxt",
    configKey: "authio",
    compatibility: { nuxt: "^3.0.0" },
  },
  defaults: {
    registerRouterGuard: true,
  } as Partial<AuthioNuxtModuleOptions>,
  setup(options: AuthioNuxtModuleOptions, _nuxt: unknown): void {
    // Real Nuxt module setup runs at build time; the runtime install
    // lives in `registerAuthio` above. Modules are expected to call
    // `addPluginTemplate` here — consumers should reference the
    // plugin via `defineNuxtPlugin(nuxtApp => registerAuthio(nuxtApp, ...))`.
    void options;
    void _nuxt;
  },
};

export default nuxtModule;
