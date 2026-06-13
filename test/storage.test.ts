import { describe, it, expect, beforeEach } from "vitest";
import { createStorage } from "../src/storage";

describe("storage", () => {
  beforeEach(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    try {
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("memory: round-trip + clear", () => {
    const s = createStorage("memory");
    expect(s.mode).toBe("memory");
    s.set("foo", "bar");
    expect(s.get("foo")).toBe("bar");
    s.remove("foo");
    expect(s.get("foo")).toBeNull();
    s.set("a", "1");
    s.set("b", "2");
    s.clear();
    expect(s.get("a")).toBeNull();
    expect(s.get("b")).toBeNull();
  });

  it("localStorage: persists across creates", () => {
    const a = createStorage("localStorage");
    a.set("k", "v");
    expect(a.get("k")).toBe("v");
    const b = createStorage("localStorage");
    expect(b.get("k")).toBe("v");
    b.clear();
    expect(a.get("k")).toBeNull();
  });

  it("sessionStorage: round-trip", () => {
    const s = createStorage("sessionStorage");
    s.set("x", "y");
    expect(s.get("x")).toBe("y");
    s.remove("x");
    expect(s.get("x")).toBeNull();
  });

  it("none: never persists, never throws", () => {
    const s = createStorage("none");
    expect(s.mode).toBe("none");
    s.set("anything", "value");
    expect(s.get("anything")).toBeNull();
    s.remove("anything");
    s.clear();
  });
});
