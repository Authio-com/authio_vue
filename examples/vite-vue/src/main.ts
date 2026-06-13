import { createApp } from "vue";
import { createAuthio } from "@useauthio/vue";
import App from "./App.vue";
import { router } from "./router";

const app = createApp(App);

app.use(
  createAuthio({
    apiUrl: import.meta.env.VITE_AUTHIO_API_URL,
    projectId: import.meta.env.VITE_AUTHIO_PROJECT_ID,
  }),
);

app.use(router);
app.mount("#app");
