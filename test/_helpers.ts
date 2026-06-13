import { vi } from "vitest";

/**
 * Build a JWT with the given `exp` (epoch seconds). The signature is
 * deliberately bogus — every test that exercises the verifier must
 * mock `JwtVerifier.prototype.verify`.
 */
export function makeJwt(claims: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "EdDSA", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ sub: "user_test", ...claims }));
  return `${header}.${payload}.sig`;
}

function base64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function tomorrowExp(): number {
  return Math.floor(Date.now() / 1000) + 60 * 60 * 24;
}

export function expiredExp(): number {
  return Math.floor(Date.now() / 1000) - 60;
}

/**
 * Returns a fetch mock that responds with the given JSON for any URL
 * matching `pattern`, and 404 otherwise.
 */
export function mockFetchOnce(
  pattern: string | RegExp,
  body: unknown,
  status = 200,
): typeof fetch {
  return vi.fn(async (url: RequestInfo | URL) => {
    const u = typeof url === "string" ? url : url instanceof URL ? url.toString() : (url as Request).url;
    const matches =
      typeof pattern === "string" ? u.includes(pattern) : pattern.test(u);
    if (!matches) {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

/**
 * Multi-call fetch mock — pops one response per call, matching path.
 */
export function mockFetchSequence(
  responses: Array<{
    match: string | RegExp;
    body: unknown;
    status?: number;
  }>,
): typeof fetch {
  let i = 0;
  return vi.fn(async (url: RequestInfo | URL) => {
    const u = typeof url === "string" ? url : url instanceof URL ? url.toString() : (url as Request).url;
    const slot = responses[i++];
    if (!slot) {
      return new Response("end of sequence", { status: 500 });
    }
    const matches =
      typeof slot.match === "string" ? u.includes(slot.match) : slot.match.test(u);
    if (!matches) {
      return new Response(
        JSON.stringify({ code: "test_misroute", url: u, expected: slot.match.toString() }),
        { status: 599 },
      );
    }
    return new Response(JSON.stringify(slot.body), {
      status: slot.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}
