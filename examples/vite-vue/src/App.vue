<script setup lang="ts">
import { SignedIn, SignedOut, useAuthio } from "@useauthio/vue";
const { user, signOut } = useAuthio();
</script>

<template>
  <nav>
    <router-link to="/">Home</router-link> |
    <router-link to="/dashboard">Dashboard</router-link> |
    <SignedOut>
      <router-link to="/sign-in">Sign in</router-link>
    </SignedOut>
    <SignedIn>
      <span>Signed in as {{ user?.email }}</span>
      <button @click="signOut">Sign out</button>
    </SignedIn>
  </nav>
  <main>
    <router-view />
  </main>
</template>
