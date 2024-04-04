<template>
  <div class="h-full flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-1 bg-white shadow-md border-b border-gray-200">
      <LightButton :disabled="mainBusy" @click="toHome">Back</LightButton>
      <LightButton v-if="!mainBusy" class="ml-auto" :disabled="mainBusy" @click="loadLighthouseSirenData">
        Refresh
      </LightButton>
    </div>
    <div class="flex-1 flex flex-col overflow-y-auto">
      <div class="px-4 py-4 flex flex-col gap-y-2">
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
            JBC Siren
          </h2>
          <h3 v-if="lastestError" class="text-center italic text-red-900 dark:text-red-300">
            {{ lastestError }}
          </h3>
          <div v-if="!deployResult" class="max-w-md w-full mx-auto flex flex-col justify-center items-center gap-y-1">
            <div>
              <div class="flex justify-center items-center gap-x-2">
                <span class="font-bold">VC Deploy:</span>
                <LedStatus :state="isVcInstalled" />
              </div>
              <div class="flex justify-center items-center gap-x-2">
                <span class="font-bold">Lighthouse Siren:</span>
                <LedStatus :state="isSirenInstalled" />
              </div>
            </div>
            <div class="mt-4 flex flex-col justify-center items-center gap-y-1">
              <template v-if="!isVcInstalled">
                <div>
                  Docker VC Not Installed (or undetected)
                </div>
                <LightButton @click="emit('setPage', 'deployValidators')" class="mx-auto">
                  Deploy JBC Siren
                </LightButton>
              </template>
              <template v-if="!isSirenInstalled">
                <div>
                  JBC Siren Not Installed (or undetected)
                </div>
                <div class="my-4 flex flex-col gap-y-2">
                  <div class="w-full">
                    <label for="lighhouse-http-port"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Lighhouse API Port
                    </label>
                    <LightInput type="text" id="vc-graffiti" v-model="sirenPort"
                      infomation="Set Lighhouse API Port (for monitoring)" :validation="getLighthouseSirenPortError"
                      placeholder="Default port is 5062" required :disabled="mainBusy">
                    </LightInput>
                  </div>
                </div>
                <LightButton :disabled="!!getLighthouseSirenPortError" class="mx-auto" @click="deployJbcSiren">
                  Install Lighthouse Siren
                </LightButton>
              </template>
              <template v-else>
                <template v-if="lighthouseSirenData">
                  <div v-if="lighthouseSirenData.apiToken">
                    <span class="font-bold">API Token: </span>
                    <span class="break-all">
                      {{ lighthouseSirenData.apiToken }}
                      <span title="Copy API Key">
                        <ClipboardDocumentListIcon class="w-4 h-4 inline-block cursor-pointer"
                          @click="copyText(lighthouseSirenData.apiToken)" />
                      </span>
                    </span>
                  </div>
                </template>
                <div class="mt-4">
                  <a :href="getSirenLink(lighthouseSirenData?.sirenPort || '8080')" class="mx-auto" target="_blank">
                    <LightButton>
                      Open Lighthouse Siren
                    </LightButton>
                  </a>
                </div>
              </template>
            </div>
          </div>
          <div v-else class="max-w-md w-full mx-auto flex flex-col gap-y-1">
            <h4 class="block  self-center mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Deploy Successful:
            </h4>
            <div class="my-2">
              <div>
                <span class="font-bold">JBC Siren Port: </span>
                <span>{{ deployResult.sirenPort }}</span>
              </div>
              <div>
                <span class="font-bold">Link: </span>
                <a :href="getSirenLink(deployResult.sirenPort || '8080')" class="underline" target="_blank">
                  {{ getSirenLink(deployResult.sirenPort || '8080') }}
                </a>
              </div>
              <div class="mt-4">
                <span class="font-bold whitespace-nowrap">API Token: </span>
                <span class="break-all">
                  {{ deployResult.apiToken || '-' }}
                  <span v-if="deployResult.apiToken" title="Copy API Key">
                    <ClipboardDocumentListIcon class="w-4 h-4 inline-block cursor-pointer"
                      @click="copyText(deployResult.apiToken)" />
                  </span>
                </span>
              </div>
            </div>
            <div>
              <LightButton class="mx-auto" @click="loadLighthouseSirenData">Refresh</LightButton>
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
import LightInput from "./LightInput.vue"
import LedStatus from "./LedStatus.vue"

import { ClipboardDocumentListIcon } from '@heroicons/vue/24/solid'
import { Ref, computed, onMounted, ref } from "vue";

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const loadingMessage = ref("Check Lighthouse Siren...");
const lastestError = ref("");
const deployResult: Ref<VcConfigData | undefined> = ref(undefined);

const lighthouseSirenData: Ref<VcConfigData | undefined> = ref(undefined);
const sirenPort = ref("8080");

const isVcInstalled = computed(() => {
  return !!lighthouseSirenData.value?.apiPort && !!lighthouseSirenData.value?.apiToken;
})
const isSirenInstalled = computed(() => {
  return !!lighthouseSirenData.value?.sirenPort;
})

const getLighthouseSirenPortError = computed(() => {
  if (sirenPort.value === "") {
    return "Required"
  }

  const n = parseInt(sirenPort.value, 10);
  if (!Number.isInteger(n) || n < 1024) {
    return "Must be Intreger > 1024";
  }

  return "";
})

function getSirenLink(port: string | number) {
  return `http://localhost:${port}`;
}

function loadLighthouseSirenData() {
  if (mainBusy.value) {
    return;
  }

  mainBusy.value = true;
  window.ipcRenderer.send("loadSirenApiData");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Content copied to clipboard');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

function deployJbcSiren() {
  if (mainBusy.value || getLighthouseSirenPortError.value) {
    return;
  }

  mainBusy.value = true;
  lastestError.value = "";
  loadingMessage.value = "Install Lighthouse Siren";
  window.ipcRenderer.send("deployJbcSiren");
}

function toHome() {
  emit('setPage', 'home');
}

onMounted(() => {
  window.ipcRenderer.on('loadSirenApiDataResponse', (_event, ...args) => {
    const response: VcConfigData = args[0];
    lighthouseSirenData.value = response;
    deployResult.value = undefined;
    mainBusy.value = false;
  });

  window.ipcRenderer.on("deployJbcSirenStatus", (err, ...args) => {
    loadingMessage.value = args[0] as string;
  })

  window.ipcRenderer.on("deployJbcSirenResponse", (err, ...args) => {
    const [resError, response] = args as [string | null, DeploySirenResult | undefined];
    if (resError) {
      // show error
      console.error(resError);
      lastestError.value = resError || "Can't deploy Siren";
    } else {
      deployResult.value = response;
    }

    mainBusy.value = false;
  })

  loadLighthouseSirenData();
})
</script>