<template>
  <div class="h-full flex flex-col">
    <div class="flex-1 flex flex-col overflow-y-auto">
      <div class="px-4 py-4 my-auto flex flex-col justify-center gap-y-2">
        <div>
          <img src="../assets/jbc-badge.png" class="mx-auto h-20" />
        </div>
        <h1 class="text-center font-bold text-2xl">
          JIB Validator Monitor
        </h1>
        <LoadingContainer v-if="loading">
        </LoadingContainer>
        <template v-else>
          <div class="my-2 flex flex-row justify-center flex-wrap gap-4">
            <HomeButton @click="generateKeys">
              <KeyIcon class="w-8 h-8" />
              <div class="text-sm text-center">Generate Keys</div>
            </HomeButton>
            <a href="https://staking.jibchain.net/en/upload-deposit-data" target="_blank" class="inline-block">
              <HomeButton>
                <WalletIcon class="w-8 h-8" />
                <div class="text-sm text-center">Deposit Fund</div>
              </HomeButton>
            </a>
            <HomeButton @click="deployValidators">
              <ArrowDownTrayIcon class="w-8 h-8" />
              <div class="text-sm text-center">Deploy Validators</div>
            </HomeButton>
          </div>
          <div class="my-2 flex flex-row justify-center flex-wrap gap-4">
            <HomeButton v-if="allowSiren" @click="jbcSirenMonitor">
              <TvIcon class="w-8 h-8" />
              <div class="text-sm text-center">JBC Siren Monitor</div>
            </HomeButton>
            <HomeButton @click="validatorManagement">
              <InformationCircleIcon class="w-8 h-8" />
              <div class="text-sm text-center">Validators Managemnet</div>
            </HomeButton>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import HomeButton from "./HomeButton.vue"
import { KeyIcon, WalletIcon, ArrowDownTrayIcon, InformationCircleIcon, TvIcon } from '@heroicons/vue/24/solid'

import { onMounted, ref } from 'vue';
import LoadingContainer from "./LoadingContainer.vue";

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const loading = ref(true);
const allowSiren = ref(false);

function generateKeys() {
  emit("setPage", "generateKeys");
}

function deployValidators() {
  emit("setPage", "deployValidators");
}

function validatorManagement() {
  emit("setPage", "validatorManagement");
}

function jbcSirenMonitor() {
  emit("setPage", "jbcSirenMonitor");
}

onMounted(() => {
  window.ipcRenderer.on('getPathsResponse', (_event, ...args) => {
    console.log("paths", args[0])
  });


  window.ipcRenderer.on('getFeatureConfigsResponse', (_event, ...args) => {
    const [configs] = args as [FeatureConfigData];
    console.log("features", configs);
    allowSiren.value = configs.allowSiren;
    loading.value = false;
  });

  window.ipcRenderer.send("getPaths");
  window.ipcRenderer.send("getFeatureConfigs");
})

</script>