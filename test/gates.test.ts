import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { createAuthio, SignedIn, SignedOut } from "../src";
import { JwtVerifier } from "@useauthio/node";
import { makeJwt, tomorrowExp } from "./_helpers";

describe("gates", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("SignedIn renders default slot only when authenticated", async () => {
    vi.spyOn(JwtVerifier.prototype, "verify").mockResolvedValue({
      sub: "user_1",
    } as never);

    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      initialAccessToken: makeJwt({ exp: tomorrowExp() }),
      initialUser: { id: "user_1", email: "a@b.com", emailVerified: true },
      fetch: vi.fn() as unknown as typeof fetch,
    });

    // wait for bootstrap to verify and flip to authenticated
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    const Host = defineComponent({
      components: { SignedIn },
      render() {
        return h(SignedIn, null, { default: () => h("p", { class: "hi" }, "hello") });
      },
    });
    const wrapper = mount(Host, { global: { plugins: [plugin] } });
    await nextTick();
    expect(wrapper.html()).toContain("hello");
    wrapper.unmount();
    plugin.context.dispose();
  });

  it("SignedOut renders default slot only when unauthenticated", async () => {
    const plugin = createAuthio({
      apiUrl: "https://auth.example.com",
      projectId: "proj_test",
      fetch: vi.fn() as unknown as typeof fetch,
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();
    expect(plugin.context.status.value).toBe("unauthenticated");

    const Host = defineComponent({
      components: { SignedOut },
      render() {
        return h(SignedOut, null, { default: () => h("p", null, "please-sign-in") });
      },
    });
    const wrapper = mount(Host, { global: { plugins: [plugin] } });
    await nextTick();
    expect(wrapper.html()).toContain("please-sign-in");
    wrapper.unmount();
    plugin.context.dispose();
  });
});
