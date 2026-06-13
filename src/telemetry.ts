/**
 * Discriminated union of every telemetry event the SDK emits. Consumers
 * wire `onTelemetryEvent` to forward into Sentry / Datadog / their own
 * logger. We do not phone home by default.
 */

export type AuthioTelemetryEvent =
  | { type: "refresh_succeeded"; at: number }
  | { type: "refresh_failed"; at: number; attempt: number; reason: string }
  | {
      type: "sign_in_started";
      at: number;
      method: "magic_link" | "passkey";
    }
  | {
      type: "sign_in_completed";
      at: number;
      method: "magic_link" | "passkey";
      userId: string;
    }
  | { type: "sign_out"; at: number }
  | { type: "token_verified"; at: number; userId: string }
  | { type: "token_rejected"; at: number; reason: string };

export type AuthioTelemetryListener = (event: AuthioTelemetryEvent) => void;

export function safeEmit(
  listener: AuthioTelemetryListener | undefined,
  event: AuthioTelemetryEvent,
): void {
  if (!listener) return;
  try {
    listener(event);
  } catch {
    // Listeners MUST NOT break SDK state. Swallow throws.
  }
}
