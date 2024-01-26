<template>
  <div class="h-screen flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-0.5 bg-white shadow-md border-b border-gray-200">
      <LightButton :disabled="mainBusy" @click="toHome">Back</LightButton>
      <LightButton class="ml-auto" disabled>Next</LightButton>
    </div>
    <div class="flex-1 overflow-y-auto">
      <div class="px-4 py-4 flex flex-col gap-y-2 items-center">
        <div>
          <img src="../assets/jbc-badge.png" class="mx-auto h-20" />
        </div>
        <h1 class="text-center font-bold text-2xl">
          JIB Validator Monitor
        </h1>
        <LoadingContainer v-if="mainBusy">
          {{ loadingMessage }}
        </LoadingContainer>
        <template v-else>
          <h2 class="text-center text-lg">
            Deploy Validators
          </h2>
          <h3 v-if="lastestError" class="text-center italic text-red-900 dark:text-red-300">
            {{ lastestError }}
          </h3>
        </template>
        <template v-if="!mainBusy">
          <div class="max-w-md w-full flex flex-col justify-center items-center gap-y-1">
            <div class="mt-2">
              <LightButton :disabled="mainBusy" @click="selectVcKeyFiles">Select Files</LightButton>
            </div>
            <div class="w-full flex flex-col divide-y-2">
              <div v-for="key of Object.keys(files)" class="py-1 w-full flex flex-row items-center gap-x-2">
                <div class="flex-1">
                  {{ key }}
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                  stroke="currentColor" class="w-4 h-4 cursor-pointer" title="Remove File" @click="removeFile(key)">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </div>
              <div v-if="Object.keys(files).length === 0" class="italic text-center text-sm">
                No Files
              </div>
            </div>
            <div class="mt-4">
              <LightButton @click="deployValidators">Deploy!</LightButton>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingContainer from "./LoadingContainer.vue"
import LightButton from "./LightButton.vue"

import { ref, onMounted, computed, Ref } from 'vue';
import { initFlowbite } from 'flowbite'

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const loadingMessage = ref("Check Dependencies...");
const lastestError = ref("");

const files: Ref<Record<string, string>> = ref({});
const fileValid = computed(() => {
  // TODO ...
  return false;
})

function selectVcKeyFiles() {
  window.ipcRenderer.send("selectVcKeyFiles");
}

function removeFile(fileKey: string) {
  delete files.value[fileKey];
}

function deployValidators() {
  mainBusy.value = true;

  window.ipcRenderer.send("deployValidators");
}

function toHome() {
  emit('setPage', 'home');
}

onMounted(() => {
  initFlowbite();

  window.ipcRenderer.on("deployValidatorsStatus", (err, ...args) => {
    loadingMessage.value = args[0] as string;
  })

  window.ipcRenderer.on("deployValidatorsResponse", (err, ...args) => {
    // const [resError, response] = args as [Error | null, GenerateKeyResponse | undefined];
    // if (resError) {
    //   // show error
    //   console.error(resError);
    //   lastestError.value = "Can't generate validator keys";
    // } else {
    //   generateFileURIs(response?.contents);
    //   generateResult.value = response;
    // }
    mainBusy.value = false;
  })
})
</script>