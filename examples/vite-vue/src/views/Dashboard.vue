<script setup lang="ts">
import { useAuthio } from "@useauthio/vue";
const { user, accessToken } = useAuthio();
</script>

<template>
  <h1>Dashboard</h1>
  <p>This route is protected by <code>meta.requiresAuth</code>.</p>
  <pre>{{ JSON.stringify({ user, hasAccessToken: !!accessToken }, null, 2) }}</pre>
</template>
