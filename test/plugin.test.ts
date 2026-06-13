import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { createAuthio, useAuthio } from "../src";
import { JwtVerifier } from "@useauthio/node";
import { makeJwt, tomorrowExp } from "./_helpers";

describe("createAuthio", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the Authio context via app.provide", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: makeJwt({ exp: tomorrowExp() }),
      initialUser: {
        id: "user_1",
        email: "a@b.com",
        emailVerified: true,
      },
      fetch: vi.fn() as unknown as typeof fetch,
    });

    let observedStatus: string | null = null;
    const Probe = defineComponent({
      setup() {
        const { status } = useAuthio();
        observedStatus = status.value;
        return () => h("div");
      },
    });

    const app = createApp(Probe);
    app.use(plugin);
    const host = document.createElement("div");
    app.mount(host);

    expect(observedStatus).toBeTruthy();
    expect(["loading", "authenticated"]).toContain(observedStatus);
    plugin.context.dispose();
    app.unmount();
  });

  it("throws AuthioError when apiUrl/projectId are missing", () => {
    expect(() =>
      createAuthio({ apiUrl: "", projectId: "p" }),
    ).toThrow(/apiUrl/);
    expect(() =>
      createAuthio({ apiUrl: "https://x", projectId: "" }),
    ).toThrow(/projectId/);
  });
});
