import { isBrowser } from "./ssr";

/**
 * Token storage policy. Refresh tokens are NEVER persisted to a
 * JS-accessible store — only access tokens (which are already
 * short-lived and JWT-bound) may be persisted, and even then only when
 * the consumer opts in.
 *
 * Defaults to `memory` so a tab refresh logs you out unless you choose
 * otherwise; this is the safer default for XSS-exposed surface.
 */
export type AuthioStorageMode =
  | "memory"
  | "localStorage"
  | "sessionStorage"
  | "none";

export interface AuthioStorage {
  readonly mode: AuthioStorageMode;
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

class MemoryStorage implements AuthioStorage {
  readonly mode: AuthioStorageMode = "memory";
  private readonly map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

class WebStorageAdapter implements AuthioStorage {
  constructor(
    readonly mode: AuthioStorageMode,
    private readonly backing: Storage,
    private readonly prefix = "authio.",
  ) {}
  get(key: string): string | null {
    try {
      return this.backing.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      this.backing.setItem(this.prefix + key, value);
    } catch {
      // Quota exceeded, private mode, etc — silently fall back.
    }
  }
  remove(key: string): void {
    try {
      this.backing.removeItem(this.prefix + key);
    } catch {
      // ignore
    }
  }
  clear(): void {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < this.backing.length; i++) {
        const k = this.backing.key(i);
        if (k && k.startsWith(this.prefix)) toRemove.push(k);
      }
      for (const k of toRemove) this.backing.removeItem(k);
    } catch {
      // ignore
    }
  }
}

class NoopStorage implements AuthioStorage {
  readonly mode: AuthioStorageMode = "none";
  get(): string | null {
    return null;
  }
  set(): void {
    /* noop */
  }
  remove(): void {
    /* noop */
  }
  clear(): void {
    /* noop */
  }
}

export function createStorage(mode: AuthioStorageMode = "memory"): AuthioStorage {
  if (mode === "none") return new NoopStorage();
  if (mode === "memory") return new MemoryStorage();
  if (!isBrowser()) return new MemoryStorage();
  if (mode === "localStorage") {
    try {
      return new WebStorageAdapter(mode, window.localStorage);
    } catch {
      return new MemoryStorage();
    }
  }
  if (mode === "sessionStorage") {
    try {
      return new WebStorageAdapter(mode, window.sessionStorage);
    } catch {
      return new MemoryStorage();
    }
  }
  return new MemoryStorage();
}

export const ACCESS_TOKEN_STORAGE_KEY = "access_token";
export const USER_STORAGE_KEY = "user";
