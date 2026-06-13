import { inject, type InjectionKey } from "vue";
import type { AuthioContextValue } from "./types";
import { AuthioError } from "./errors";

export const AUTHIO_INJECTION_KEY: InjectionKey<AuthioContextValue> =
  Symbol.for("@useauthio/vue:context");

/**
 * Reactive Authio context. Must be invoked from inside `setup()` of a
 * component that lives under either `app.use(createAuthio(...))` OR
 * `<AuthioProvider>`. Returns plain Vue refs you can render directly:
 *
 *   const { user, status, accessToken } = useAuthio();
 *   <template>
 *     <div v-if="status === 'authenticated'">{{ user.email }}</div>
 *   </template>
 */
export function useAuthio(): AuthioContextValue {
  const ctx = inject(AUTHIO_INJECTION_KEY, null);
  if (!ctx) {
    throw new AuthioError({
      code: "authio_not_provided",
      message:
        "useAuthio() must be called inside a component tree that has installed the Authio plugin (app.use(createAuthio(...))) or is wrapped in <AuthioProvider>.",
      status: 0,
    });
  }
  return ctx;
}
