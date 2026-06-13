<script setup lang="ts">
import { SignedIn, SignedOut } from "@useauthio/vue";
</script>

<template>
  <h1>@useauthio/vue example</h1>
  <SignedOut>
    <p>You are signed out. <router-link to="/sign-in">Sign in</router-link>.</p>
  </SignedOut>
  <SignedIn>
    <p>You are signed in. <router-link to="/dashboard">Go to dashboard</router-link>.</p>
  </SignedIn>
</template>
