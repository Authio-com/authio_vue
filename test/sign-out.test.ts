import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthio } from "../src";
import { JwtVerifier } from "@useauthio/node";
import { makeJwt, tomorrowExp, mockFetchOnce } from "./_helpers";

describe("signOut", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("clears user/accessToken and flips status to unauthenticated", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);
    const fetchMock = mockFetchOnce("/v1/auth/sign-out", { ok: true });

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: makeJwt({ exp: tomorrowExp() }),
      initialRefreshToken: "rt_alpha",
      initialUser: { id: "user_1", email: "a@b.com", emailVerified: true },
      fetch: fetchMock,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(plugin.context.accessToken.value).toBeTruthy();
    expect(plugin.context.user.value?.id).toBe("user_1");

    await plugin.context.signOut();

    expect(plugin.context.accessToken.value).toBeNull();
    expect(plugin.context.user.value).toBeNull();
    expect(plugin.context.status.value).toBe("unauthenticated");
    expect(fetchMock).toHaveBeenCalled();
    plugin.context.dispose();
  });

  it("still clears local state if the server-side revoke fails", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: makeJwt({ exp: tomorrowExp() }),
      initialRefreshToken: "rt",
      initialUser: { id: "user_1", email: "a@b.com", emailVerified: true },
      fetch: fetchMock,
    });

    await Promise.resolve();
    await plugin.context.signOut();
    expect(plugin.context.accessToken.value).toBeNull();
    expect(plugin.context.user.value).toBeNull();
    expect(plugin.context.status.value).toBe("unauthenticated");
    plugin.context.dispose();
  });
});
