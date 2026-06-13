import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h, type App } from "vue";
import { createAuthio, createAuthioRouterGuard } from "../src";
import { JwtVerifier } from "@useauthio/node";

/**
 * `createAuthioRouterGuard()` returns a function intended for
 * `router.beforeEach`. The guard pulls reactive state via `useAuthio`,
 * which means it must be executed from within an app context. We
 * mount a host component and run the guard from inside its setup() so
 * `inject()` resolves correctly.
 */
function runGuardInApp<T>(
  plugin: ReturnType<typeof createAuthio>,
  body: () => T | Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const Probe = defineComponent({
      async setup() {
        try {
          const result = await body();
          resolve(result);
        } catch (e) {
          reject(e);
        }
        return () => h("span");
      },
    });
    const app: App = createApp(Probe);
    app.use(plugin);
    app.mount(document.createElement("div"));
  });
}

describe("createAuthioRouterGuard", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("redirects unauthenticated users to signInPath with returnTo", async () => {
    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      fetch: vi.fn() as unknown as typeof fetch,
    });

    await Promise.resolve();
    await Promise.resolve();

    const guard = createAuthioRouterGuard({ signInPath: "/login" });
    const decision = await runGuardInApp(plugin, () =>
      guard({
        path: "/dashboard",
        fullPath: "/dashboard?tab=billing",
        meta: { requiresAuth: true },
      }),
    );

    expect(decision).toEqual({
      path: "/login",
      query: { returnTo: "/dashboard?tab=billing" },
    });
    plugin.context.dispose();
  });

  it("passes through routes without requiresAuth", async () => {
    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      fetch: vi.fn() as unknown as typeof fetch,
    });
    await Promise.resolve();

    const guard = createAuthioRouterGuard();
    const decision = await runGuardInApp(plugin, () =>
      guard({ path: "/", fullPath: "/", meta: {} }),
    );
    expect(decision).toBe(true);
    plugin.context.dispose();
  });

  it("admits authenticated users", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: "EdDSA" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const payload = btoa(JSON.stringify({ sub: "u", exp: futureExp }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const jwt = `${header}.${payload}.sig`;

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: jwt,
      initialUser: { id: "user_1", email: "a@b.com", emailVerified: true },
      fetch: vi.fn() as unknown as typeof fetch,
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(plugin.context.status.value).toBe("authenticated");

    const guard = createAuthioRouterGuard();
    const decision = await runGuardInApp(plugin, () =>
      guard({
        path: "/dashboard",
        fullPath: "/dashboard",
        meta: { requiresAuth: true },
      }),
    );
    expect(decision).toBe(true);
    plugin.context.dispose();
  });
});
