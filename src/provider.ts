import {
  defineComponent,
  h,
  onBeforeUnmount,
  provide,
  type PropType,
  type Slots,
} from "vue";
import type { AuthioPluginOptions } from "./types";
import { AUTHIO_INJECTION_KEY } from "./composables";
import { buildAuthioState } from "./state";
import type { AuthioStorageMode } from "./storage";
import type { AuthioTelemetryListener } from "./telemetry";

/**
 * Component-tree-scoped Authio context. Use this when `app.use()` isn't
 * a fit — e.g. multi-tenant apps that need to provide different
 * `projectId`s in different sub-trees.
 *
 *   <AuthioProvider :api-url="apiUrl" :project-id="projectId">
 *     <Dashboard />
 *   </AuthioProvider>
 *
 * Mounts an isolated Authio state machine for the slot tree. The
 * state is `dispose()`d on unmount so timers don't leak.
 */
export const AuthioProvider = defineComponent({
  name: "AuthioProvider",
  props: {
    apiUrl: { type: String, required: true },
    projectId: { type: String, required: true },
    storage: { type: String as PropType<AuthioStorageMode>, required: false },
    refreshLeadSeconds: { type: Number, required: false },
    onTelemetryEvent: {
      type: Function as PropType<AuthioTelemetryListener>,
      required: false,
    },
    fetch: { type: Function as PropType<typeof fetch>, required: false },
    jwtIssuer: { type: String, required: false },
    jwtAudience: { type: String, required: false },
    signInPath: { type: String, required: false },
    initialAccessToken: { type: String, required: false, default: null },
    initialRefreshToken: { type: String, required: false, default: null },
  },
  setup(props, { slots }: { slots: Slots }) {
    const options: AuthioPluginOptions = {
      apiUrl: props.apiUrl,
      projectId: props.projectId,
      storage: props.storage,
      refreshLeadSeconds: props.refreshLeadSeconds,
      onTelemetryEvent: props.onTelemetryEvent,
      fetch: props.fetch,
      jwtIssuer: props.jwtIssuer,
      jwtAudience: props.jwtAudience,
      signInPath: props.signInPath,
      initialAccessToken: props.initialAccessToken,
      initialRefreshToken: props.initialRefreshToken,
    };

    const state = buildAuthioState({ options });
    provide(AUTHIO_INJECTION_KEY, state);

    onBeforeUnmount(() => {
      state.dispose();
    });

    return () => (slots.default ? slots.default() : h("template"));
  },
});
