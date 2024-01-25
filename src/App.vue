<template>
  <div>
    <HomePage v-if="page === 'home'" @setPage="setPage"></HomePage>
    <GenerateKeyPage v-else-if="page === 'generateKey'" @setPage="setPage"></GenerateKeyPage>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import HomePage from "./components/HomePage.vue"
import GenerateKeyPage from "./components/GenerateKeyPage.vue"

const page = ref("generateKey");

function setPage(pageName: string) {
  page.value = pageName;
}
</script>


<style>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo.electron:hover {
  filter: drop-shadow(0 0 2em #9FEAF9);
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>