import { describe, it, expect, vi, beforeEach } from "vitest";
import { signInWithMagicLink, AuthioError } from "../src";

describe("signInWithMagicLink", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("POSTs to /v1/auth/magic-link/start with the right shape", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    await signInWithMagicLink({
      apiUrl: "https://auth.example.com",
      projectId: "proj_xyz",
      email: "alice@example.com",
      redirectUri: "https://app.example.com/callback",
      fetch: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const args = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    const [url, init] = args as [string, RequestInit];
    expect(url).toBe("https://auth.example.com/v1/auth/magic-link/start");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-authio-project"]).toBe("proj_xyz");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "alice@example.com",
      redirect_uri: "https://app.example.com/callback",
    });
  });

  it("throws AuthioError when email is missing", async () => {
    await expect(
      signInWithMagicLink({
        apiUrl: "https://auth.example.com",
        projectId: "proj_xyz",
        email: "",
        redirectUri: "https://app.example.com/cb",
      }),
    ).rejects.toBeInstanceOf(AuthioError);
  });

  it("wraps non-2xx responses as AuthioError with the server's code", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: "rate_limited", message: "slow down" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const err = await signInWithMagicLink({
      apiUrl: "https://auth.example.com",
      projectId: "proj_xyz",
      email: "alice@example.com",
      redirectUri: "https://app.example.com/cb",
      fetch: fetchMock,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AuthioError);
    expect((err as AuthioError).code).toBe("rate_limited");
    expect((err as AuthioError).status).toBe(429);
  });
});
