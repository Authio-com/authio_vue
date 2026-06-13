import { AuthioError } from "@useauthio/node";

export { AuthioError };

/**
 * Wrap any thrown value in an AuthioError with a stable `code`. The SDK
 * NEVER surfaces a raw fetch / DOMException error — every reject path
 * goes through this helper.
 */
export function toAuthioError(
  err: unknown,
  fallback: { code: string; message: string; status?: number },
): AuthioError {
  if (err instanceof AuthioError) return err;

  let message = fallback.message;
  if (err instanceof Error && err.message) {
    message = `${fallback.message}: ${err.message}`;
  }

  const wrapped = new AuthioError({
    code: fallback.code,
    message,
    status: fallback.status ?? 0,
  });
  if (err instanceof Error) {
    (wrapped as { cause?: unknown }).cause = err;
  }
  return wrapped;
}
