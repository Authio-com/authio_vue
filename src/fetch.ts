import { AuthioError } from "@useauthio/node";
import { toAuthioError } from "./errors";

export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export interface AuthioFetchOptions {
  apiUrl: string;
  projectId: string;
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

/**
 * Single typed fetch wrapper. Every public SDK helper goes through this:
 *
 *  - 10s default timeout (consumer can override per call)
 *  - composes consumer's `signal` with our internal timeout signal
 *  - stamps `X-Authio-Project` so auth-core can route multi-tenant
 *  - throws a typed AuthioError on any error path — never a raw
 *    DOMException / TypeError
 */
export async function authioFetch<T>(opts: AuthioFetchOptions): Promise<T> {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new AuthioError({
      code: "fetch_unavailable",
      message:
        "No fetch implementation available. Pass `fetch` explicitly when running on Node < 18.",
      status: 0,
    });
  }

  const url = trimSlash(opts.apiUrl) + opts.path;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(timeoutReason()), timeoutMs);

  const externalAbort = () => controller.abort(opts.signal?.reason);
  if (opts.signal) {
    if (opts.signal.aborted) externalAbort();
    else opts.signal.addEventListener("abort", externalAbort, { once: true });
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "x-authio-project": opts.projectId,
    "x-authio-sdk": "authio-vue/0.1.0",
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.accessToken) headers["authorization"] = `Bearer ${opts.accessToken}`;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      credentials: "omit",
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (opts.signal) opts.signal.removeEventListener("abort", externalAbort);
    if (err instanceof Error && err.name === "AbortError") {
      const reason = (controller.signal as AbortSignal & { reason?: unknown })
        .reason;
      const isTimeout =
        reason && typeof reason === "object" && "code" in reason &&
        (reason as { code: string }).code === "fetch_timeout";
      throw new AuthioError({
        code: isTimeout ? "fetch_timeout" : "request_aborted",
        message: isTimeout
          ? `Request to ${opts.path} timed out after ${timeoutMs}ms`
          : `Request to ${opts.path} was aborted`,
        status: 0,
      });
    }
    throw toAuthioError(err, {
      code: "network_error",
      message: `Network error calling ${opts.path}`,
    });
  }

  clearTimeout(timeoutId);
  if (opts.signal) opts.signal.removeEventListener("abort", externalAbort);

  let data: unknown = undefined;
  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  }

  if (!response.ok) {
    const errBody =
      typeof data === "object" && data !== null
        ? (data as { code?: string; message?: string; request_id?: string })
        : {};
    throw new AuthioError({
      code: errBody.code ?? `http_${response.status}`,
      message:
        errBody.message ??
        `Request to ${opts.path} failed with status ${response.status}`,
      status: response.status,
      requestId: errBody.request_id,
    });
  }

  return data as T;
}

function trimSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function timeoutReason(): { code: "fetch_timeout"; message: string } {
  return { code: "fetch_timeout", message: "fetch timed out" };
}
