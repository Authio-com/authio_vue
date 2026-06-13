/**
 * SSR-safe environment helpers. Every composable that touches the DOM,
 * localStorage, or schedules timers must gate behind these checks so the
 * SDK can be imported by Nuxt 3 / Vite SSR / unit tests under jsdom
 * without exploding.
 */

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getDocumentVisibility(): "visible" | "hidden" {
  if (!isBrowser()) return "hidden";
  return document.visibilityState === "hidden" ? "hidden" : "visible";
}
