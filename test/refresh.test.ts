import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthio } from "../src";
import { JwtVerifier } from "@useauthio/node";
import { makeJwt, tomorrowExp, expiredExp, mockFetchOnce } from "./_helpers";

describe("silent refresh", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("refreshes an expired access token transparently", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);

    const freshToken = makeJwt({ exp: tomorrowExp() });
    const fetchMock = mockFetchOnce("/v1/auth/refresh", {
      access_token: freshToken,
      refresh_token: "rt_new",
      user: { id: "user_1", email: "a@b.com", emailVerified: true },
    });

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: makeJwt({ exp: expiredExp() }),
      initialRefreshToken: "rt_old",
      initialUser: { id: "user_1", email: "a@b.com", emailVerified: true },
      fetch: fetchMock,
    });

    const ok = await plugin.context.refresh();
    expect(ok).toBe(true);
    expect(plugin.context.accessToken.value).toBe(freshToken);
    expect(plugin.context.status.value).toBe("authenticated");
    plugin.context.dispose();
  });

  it("refresh failure flips state to unauthenticated", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: "invalid_refresh_token" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: makeJwt({ exp: expiredExp() }),
      initialRefreshToken: "rt_bad",
      initialUser: { id: "user_1", email: "a@b.com", emailVerified: true },
      fetch: fetchMock,
    });

    const ok = await plugin.context.refresh();
    expect(ok).toBe(false);
    expect(plugin.context.accessToken.value).toBeNull();
    expect(plugin.context.user.value).toBeNull();
    expect(plugin.context.status.value).toBe("unauthenticated");
    plugin.context.dispose();
  });

  it("getAccessToken triggers refresh when token is near expiry", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);
    const refreshed = makeJwt({ exp: tomorrowExp() });
    const fetchMock = mockFetchOnce("/v1/auth/refresh", {
      access_token: refreshed,
      refresh_token: "rt_new",
      user: { id: "user_1", email: "a@b.com", emailVerified: true },
    });

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: makeJwt({ exp: expiredExp() }),
      initialRefreshToken: "rt",
      initialUser: { id: "user_1", email: "a@b.com", emailVerified: true },
      fetch: fetchMock,
      refreshLeadSeconds: 60,
    });

    const tok = await plugin.context.getAccessToken();
    expect(tok).toBe(refreshed);
    plugin.context.dispose();
  });
});
