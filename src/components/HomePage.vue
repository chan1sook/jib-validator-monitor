<template>
  <div class="h-screen flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-0.5 bg-white shadow-md border-b border-gray-200">
      <LightButton disabled>Setting</LightButton>
    </div>
    <div class="flex-1 flex flex-col overflow-y-auto">
      <div class="px-4 py-4 my-auto flex flex-col justify-center gap-y-2">
        <div>
          <img src="../assets/jbc-badge.png" class="mx-auto h-20" />
        </div>
        <h1 class="text-center font-bold text-2xl">
          JIB Validator Monitor
        </h1>
        <LoadingContainer v-if="mainBusy"></LoadingContainer>
        <template v-else>
          <h2 v-if="!keyImported" class="text-center text-lg text-red-900 dark:text-red-300">
            Key not found
          </h2>
          <h2 v-else-if="!validatorDeployed" class="text-center text-lg text-red-900 dark:text-red-300">
            Validator Node not found
          </h2>
        </template>
        <div v-if="!mainBusy" class="flex flex-col justify-center items-center gap-y-1">
          <LightButton @click="generateKeys">Generate Keys</LightButton>
          <template v-if="validatorDeployed">
            <LightButton @click="monitorValidators" disabled>Monitor Validators</LightButton>
            <LightButton @click="exitValdiators" disabled>Close Validators</LightButton>
          </template>
          <template v-else-if="keyImported">
            <LightButton @click="deployValidators" disabled>Deploy Validators</LightButton>
          </template>
          <template v-else>
            <LightButton @click="importKeys" disabled>Import Keys</LightButton>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingContainer from "./LoadingContainer.vue"
import LightButton from "./LightButton.vue"

import { ref, onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(true);
const keyImported = ref(false);
const validatorDeployed = ref(false);

function checkValidators() {
  window.ipcRenderer.send("check-validators");
}

// mockup functions
function generateKeys() {
  emit("setPage", "generateKey");
  // loading.value = true;
  // window.ipcRenderer.send("start-generate-key");
}
function importKeys() {
  keyImported.value = true;
}
function deployValidators() {
  validatorDeployed.value = true;
}
function monitorValidators() {

}
function exitValdiators() {
  keyImported.value = false;
  validatorDeployed.value = false;
}

onMounted(() => {
  window.ipcRenderer.on('check-validators-response', (_event, ...args) => {
    const response: { validatorExists: boolean, keyExists: boolean } = args[0];

    keyImported.value = response.keyExists;
    validatorDeployed.value = response.validatorExists;
    mainBusy.value = false;
  });

  checkValidators();
})

</script>