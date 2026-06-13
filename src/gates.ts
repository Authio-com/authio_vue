import { defineComponent, h, onMounted, watch, type PropType, type Slots } from "vue";
import { useAuthio } from "./composables";
import { isBrowser } from "./ssr";

/**
 * Renders the default slot only when `status === "authenticated"`.
 * Renders nothing while loading or unauthenticated.
 *
 *   <SignedIn>
 *     <Dashboard />
 *   </SignedIn>
 */
export const SignedIn = defineComponent({
  name: "SignedIn",
  setup(_, { slots }: { slots: Slots }) {
    const { status } = useAuthio();
    return () =>
      status.value === "authenticated"
        ? slots.default
          ? slots.default()
          : null
        : null;
  },
});

/**
 * Renders the default slot only when `status === "unauthenticated"`.
 * Renders nothing while loading or authenticated.
 *
 *   <SignedOut>
 *     <SignInForm />
 *   </SignedOut>
 */
export const SignedOut = defineComponent({
  name: "SignedOut",
  setup(_, { slots }: { slots: Slots }) {
    const { status } = useAuthio();
    return () =>
      status.value === "unauthenticated"
        ? slots.default
          ? slots.default()
          : null
        : null;
  },
});

/**
 * Declarative redirect. When mounted and the user is unauthenticated,
 * navigates the browser to `signInPath?returnTo=<encoded>`. Renders
 * nothing.
 *
 * Use sparingly — `createAuthioRouterGuard` is the preferred mechanism
 * for protecting whole routes.
 */
export const RedirectToSignIn = defineComponent({
  name: "RedirectToSignIn",
  props: {
    returnTo: { type: String as PropType<string>, required: false },
    signInPath: { type: String as PropType<string>, required: false },
  },
  setup(props) {
    const { status } = useAuthio();
    const go = () => {
      if (!isBrowser()) return;
      if (status.value !== "unauthenticated") return;
      const signInPath = props.signInPath ?? "/sign-in";
      const returnTo =
        props.returnTo ?? window.location.pathname + window.location.search;
      const sep = signInPath.includes("?") ? "&" : "?";
      const target = `${signInPath}${sep}returnTo=${encodeURIComponent(returnTo)}`;
      window.location.assign(target);
    };

    onMounted(go);
    watch(status, go);

    return () => null;
  },
});
