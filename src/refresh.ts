import { isBrowser, getDocumentVisibility } from "./ssr";
import { readJwtExp } from "./jwt";

export interface RefreshScheduler {
  /** Re-arm the refresh timer based on the current access token's exp. */
  schedule(): void;
  /** Cancel any pending refresh and back off. */
  cancel(): void;
}

interface SchedulerArgs {
  refreshLeadSeconds: number;
  getAccessToken: () => string | null;
  refresh: () => Promise<boolean>;
}

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 30_000;

/**
 * Silent-refresh scheduler.
 *
 *  - Parses `exp` out of the current access token (no signature trust;
 *    state.ts verifies before adopting any new token returned by
 *    refresh).
 *  - Refreshes `refreshLeadSeconds` (default 60) BEFORE expiry.
 *  - Exponential backoff on failure: 1s → 2s → 4s → 8s → 16s, capped at
 *    30s, max 5 attempts before giving up.
 *  - Pauses when the tab is hidden; reschedules on `visibilitychange`.
 */
export function createRefreshScheduler(args: SchedulerArgs): RefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let visibilityHandlerAttached = false;
  let attempts = 0;
  let disposed = false;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function attachVisibilityHandler(): void {
    if (!isBrowser() || visibilityHandlerAttached) return;
    document.addEventListener("visibilitychange", onVisibilityChange);
    visibilityHandlerAttached = true;
  }

  function onVisibilityChange(): void {
    if (getDocumentVisibility() === "visible") {
      schedule();
    } else {
      clearTimer();
    }
  }

  function schedule(): void {
    if (disposed) return;
    if (!isBrowser()) return;
    clearTimer();
    attachVisibilityHandler();
    if (getDocumentVisibility() === "hidden") return;

    const token = args.getAccessToken();
    if (!token) return;
    const exp = readJwtExp(token);
    if (exp === null) return;

    const targetEpochMs = exp * 1000 - args.refreshLeadSeconds * 1000;
    const delay = Math.max(0, targetEpochMs - Date.now());

    timer = setTimeout(() => {
      void runRefresh();
    }, delay);
  }

  async function runRefresh(): Promise<void> {
    if (disposed) return;
    if (getDocumentVisibility() === "hidden") {
      // Tab is hidden — pause until visibilitychange fires.
      return;
    }
    attempts += 1;
    const ok = await args.refresh().catch(() => false);
    if (ok) {
      attempts = 0;
      schedule();
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      attempts = 0;
      return;
    }
    const exponent = Math.min(attempts - 1, 5);
    const delay = Math.min(BACKOFF_BASE_MS * 2 ** exponent, BACKOFF_CAP_MS);
    timer = setTimeout(() => {
      void runRefresh();
    }, delay);
  }

  function cancel(): void {
    disposed = true;
    clearTimer();
    if (visibilityHandlerAttached && isBrowser()) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visibilityHandlerAttached = false;
    }
  }

  return { schedule, cancel };
}
