<script setup lang="ts">
import { ref } from "vue";
import {
  signInWithMagicLink,
  signInWithPasskey,
  useAuthio,
  AuthioError,
} from "@useauthio/vue";

const { handleSignInResult } = useAuthio();
const email = ref("");
const status = ref<string>("");
const apiUrl = import.meta.env.VITE_AUTHIO_API_URL;
const projectId = import.meta.env.VITE_AUTHIO_PROJECT_ID;

async function magic() {
  status.value = "Sending magic link…";
  try {
    await signInWithMagicLink({
      apiUrl,
      projectId,
      email: email.value,
      redirectUri: window.location.origin + "/dashboard",
    });
    status.value = "Check your email.";
  } catch (e) {
    status.value =
      e instanceof AuthioError ? `${e.code}: ${e.message}` : String(e);
  }
}

async function passkey() {
  status.value = "Starting passkey ceremony…";
  try {
    const result = await signInWithPasskey({
      apiUrl,
      projectId,
      email: email.value,
    });
    await handleSignInResult(result);
    status.value = "Signed in!";
  } catch (e) {
    status.value =
      e instanceof AuthioError ? `${e.code}: ${e.message}` : String(e);
  }
}
</script>

<template>
  <h1>Sign in</h1>
  <input v-model="email" type="email" placeholder="you@example.com" />
  <div>
    <button @click="magic">Email me a magic link</button>
    <button @click="passkey">Use a passkey</button>
  </div>
  <p v-if="status">{{ status }}</p>
</template>
