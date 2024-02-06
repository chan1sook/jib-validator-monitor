<template>
  <div>
    <HomePage v-if="page === 'home'" @setPage="setPage"></HomePage>
    <GenerateKeysPage v-else-if="page === 'generateKeys'" @setPage="setPage"></GenerateKeysPage>
    <DeployValidatorsPage v-else-if="page === 'deployValidators'" @setPage="setPage"></DeployValidatorsPage>
    <ValidatorManagement v-else-if="page === 'validatorManagement'" @setPage="setPage"></ValidatorManagement>
    <SirenInfo v-else-if="page === 'jbcSirenMonitor'" @setPage="setPage"></SirenInfo>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import HomePage from "./components/HomePage.vue"
import GenerateKeysPage from "./components/GenerateKeysPage.vue"
import DeployValidatorsPage from "./components/DeployValidatorsPage.vue"
import ValidatorManagement from "./components/ValidatorManagement.vue"
import SirenInfo from "./components/SirenInfo.vue"

const page = ref("home");

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