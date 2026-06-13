import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { createAuthioRouterGuard } from "@useauthio/vue";
import Home from "./views/Home.vue";
import SignIn from "./views/SignIn.vue";
import Dashboard from "./views/Dashboard.vue";

const routes: RouteRecordRaw[] = [
  { path: "/", component: Home },
  { path: "/sign-in", component: SignIn },
  { path: "/dashboard", component: Dashboard, meta: { requiresAuth: true } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(createAuthioRouterGuard());
