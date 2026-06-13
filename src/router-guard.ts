import { watch } from "vue";
import { useAuthio } from "./composables";

/**
 * `vue-router` is an optional peer dependency — we don't import its
 * types directly so consumers without `vue-router` installed can still
 * build the SDK. These minimal local shapes describe just the slice of
 * the API we touch.
 */
interface RouteLike {
  path: string;
  fullPath: string;
  meta?: Record<string, unknown>;
}

interface RouteLocationOpts {
  path: string;
  query?: Record<string, string | undefined>;
}

type NavigationGuardReturn = boolean | string | RouteLocationOpts | undefined;

export type AuthioRouterGuard = (
  to: RouteLike,
) => NavigationGuardReturn | Promise<NavigationGuardReturn>;

export interface CreateAuthioRouterGuardOptions {
  /** Path to redirect unauthenticated users to. Default `/sign-in`. */
  signInPath?: string;
  /** Query-param name to use for the post-sign-in destination. Default `returnTo`. */
  returnToParam?: string;
}

/**
 * Build a `beforeEach` guard for `vue-router`. Routes that opt in via
 * `meta: { requiresAuth: true }` will redirect unauthenticated users to
 * `signInPath?returnTo=<current>`. Routes without that flag pass
 * through unchanged.
 *
 *   const router = createRouter({ ... });
 *   router.beforeEach(createAuthioRouterGuard());
 *
 * Must be called from a component tree where `useAuthio()` resolves —
 * i.e. AFTER `app.use(createAuthio(...))`.
 */
export function createAuthioRouterGuard(
  opts: CreateAuthioRouterGuardOptions = {},
): AuthioRouterGuard {
  const signInPath = opts.signInPath ?? "/sign-in";
  const returnToParam = opts.returnToParam ?? "returnTo";

  return async function guard(to) {
    const requiresAuth = to.meta && to.meta.requiresAuth === true;
    if (!requiresAuth) return true;

    const { status } = useAuthio();

    const current = status.value;
    if (current === "authenticated") return true;
    if (current === "unauthenticated") {
      return {
        path: signInPath,
        query: { [returnToParam]: to.fullPath },
      };
    }

    // status === "loading": wait until bootstrap completes, then re-decide.
    await new Promise<void>((resolve) => {
      const stop = watch(status, (v) => {
        if (v !== "loading") {
          stop();
          resolve();
        }
      });
    });

    const resolved: string = status.value;
    if (resolved === "authenticated") return true;
    return {
      path: signInPath,
      query: { [returnToParam]: to.fullPath },
    };
  };
}
