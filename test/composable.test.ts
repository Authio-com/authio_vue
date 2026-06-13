import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h, isRef } from "vue";
import { createAuthio, useAuthio } from "../src";
import { JwtVerifier } from "@useauthio/node";

describe("useAuthio", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns Vue refs and helpers", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "u",
    } as never);

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      fetch: vi.fn() as unknown as typeof fetch,
    });

    const probeResult: { ctx?: ReturnType<typeof useAuthio> } = {};
    const Probe = defineComponent({
      setup() {
        probeResult.ctx = useAuthio();
        return () => h("span");
      },
    });

    const app = createApp(Probe);
    app.use(plugin);
    app.mount(document.createElement("div"));

    expect(probeResult.ctx).toBeDefined();
    expect(isRef(probeResult.ctx!.user)).toBe(true);
    expect(isRef(probeResult.ctx!.status)).toBe(true);
    expect(isRef(probeResult.ctx!.accessToken)).toBe(true);
    expect(typeof probeResult.ctx!.getAccessToken).toBe("function");
    expect(typeof probeResult.ctx!.signIn).toBe("function");
    expect(typeof probeResult.ctx!.signOut).toBe("function");
    expect(typeof probeResult.ctx!.refresh).toBe("function");

    plugin.context.dispose();
    app.unmount();
  });

  it("throws when used without provider", () => {
    const Probe = defineComponent({
      setup() {
        useAuthio();
        return () => null;
      },
    });
    const app = createApp(Probe);
    expect(() => app.mount(document.createElement("div"))).toThrow(/Authio plugin/);
  });
});
