import type { App } from "vue";
import type { AuthioPlugin, AuthioPluginOptions } from "./types";
import { AUTHIO_INJECTION_KEY } from "./composables";
import { buildAuthioState } from "./state";

/**
 * Build a Vue plugin that registers the Authio context globally via
 * `app.provide`. This is the preferred idiomatic Vue integration:
 *
 *   import { createAuthio } from "@useauthio/vue";
 *   app.use(createAuthio({ apiUrl, projectId }));
 *
 * For component-tree scoping (e.g. multi-tenant apps that need
 * different `projectId`s in different sub-trees), use `<AuthioProvider>`
 * from `./provider` instead.
 */
export function createAuthio(options: AuthioPluginOptions): AuthioPlugin {
  const context = buildAuthioState({ options });
  return {
    options,
    context,
    install(app: App) {
      app.provide(AUTHIO_INJECTION_KEY, context);
    },
  };
}
