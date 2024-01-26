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
          <h2 v-if="!validatorDeployed" class="text-center text-lg text-red-900 dark:text-red-300">
            Validator Node not found
          </h2>
        </template>
        <div v-if="!mainBusy" class="flex flex-col justify-center items-center gap-y-1">
          <LightButton @click="generateKeys">Generate Keys</LightButton>
          <a href="https://staking.jibchain.net/en/upload-deposit-data" target="_blank">
            <LightButton class="flex flex-row items-center gap-x-2">
              Deposit Fund
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </LightButton>
          </a>
          <template v-if="validatorDeployed">
            <LightButton @click="monitorValidators" disabled>Monitor Validators</LightButton>
            <LightButton @click="exitValdiators" disabled>Close Validators</LightButton>
          </template>
          <template v-else>
            <LightButton @click="deployValidators" disabled>Deploy Validators</LightButton>
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
const validatorDeployed = ref(false);

function checkValidators() {
  window.ipcRenderer.send("checkValidators");
}

function generateKeys() {
  emit("setPage", "generateKeys");
}

function deployValidators() {
  emit("setPage", "deployValidators");
}

// mockup functions
function monitorValidators() {

}
function exitValdiators() {
  validatorDeployed.value = false;
}

onMounted(() => {
  window.ipcRenderer.on('paths', (_event, ...args) => {
    console.log(args[0])
  });

  window.ipcRenderer.on('checkValidatorsResponse', (_event, ...args) => {
    const response: { validatorExists: boolean } = args[0];

    validatorDeployed.value = response.validatorExists;
    mainBusy.value = false;
  });

  checkValidators();
})

</script>