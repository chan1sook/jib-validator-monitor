<template>
  <div class="h-screen flex flex-col">
    <div class="flex-1 flex flex-col overflow-y-auto">
      <div class="px-4 py-4 my-auto flex flex-col justify-center gap-y-2">
        <div>
          <img src="../assets/jbc-badge.png" class="mx-auto h-20" />
        </div>
        <h1 class="text-center font-bold text-2xl">
          JIB Validator Monitor
        </h1>
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
          <HomeButton @click="validatorInfo">
            <InformationCircleIcon class="w-8 h-8" />
            <div class="text-sm text-center">Validators Info</div>
          </HomeButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import HomeButton from "./HomeButton.vue"
import { KeyIcon, WalletIcon, ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/vue/24/solid'

import { onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

function generateKeys() {
  emit("setPage", "generateKeys");
}

function deployValidators() {
  emit("setPage", "deployValidators");
}

function validatorInfo() {
  emit("setPage", "validatorInfo");
}

onMounted(() => {
  window.ipcRenderer.on('getPathsResponse', (_event, ...args) => {
    console.log(args[0])
  });

  window.ipcRenderer.send("getPaths");
})

</script>