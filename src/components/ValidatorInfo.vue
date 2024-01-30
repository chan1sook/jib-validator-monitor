<template>
  <div class="h-screen flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-1 bg-white shadow-md border-b border-gray-200">
      <LightButton :disabled="mainBusy" @click="toHome">Back</LightButton>
      <LightButton :disabled="mainBusy" class="ml-auto" @click="refreshInfo">Refresh</LightButton>
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
            Validator Infomation
          </h2>
          <h3 v-if="lastestError" class="text-center italic text-red-900 dark:text-red-300">
            {{ lastestError }}
          </h3>
          <div class="max-w-screen-sm w-full mx-auto flex flex-col gap-y-2">
            <div class="w-full relative overflow-x-auto">
              <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" class="px-6 py-3">
                      Keys
                    </th>
                    <th scope="col" class="px-6 py-3">
                      Values
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="validatorInfomation">
                    <tr v-for="key of Object.keys(validatorInfomation)"
                      class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {{ key }}
                      </th>
                      <td class="px-6 py-4">
                        {{ (validatorInfomation as Record<string, any>)[key] }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <div class="flex flex-row justify-center items-center gap-x-2">
              <LightButton v-if="!hasAdvanceInfo" :disabled="mainBusy" @click="loadAdvanceInfo">Load Advance Info
              </LightButton>
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
import { Ref, onMounted, ref } from "vue";

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const hasAdvanceInfo = ref(false);
const loadingMessage = ref("Load Infomation...");
const lastestError = ref("");

const validatorInfomation: Ref<ValidatorsInfoResponse | undefined> = ref(undefined);

function loadInfo(type?: string) {
  if (mainBusy.value) {
    return;
  }

  mainBusy.value = true;
  window.ipcRenderer.send("loadInfo", type);
}

function loadAdvanceInfo() {
  loadInfo("all");
  hasAdvanceInfo.value = true;
}

function refreshInfo() {
  if (hasAdvanceInfo.value) {
    loadInfo("all");
  } else {
    loadInfo();
  }
}

function toHome() {
  emit('setPage', 'home');
}

onMounted(() => {
  window.ipcRenderer.on('paths', (_event, ...args) => {
    console.log(args[0])
  });

  window.ipcRenderer.on('loadInfoResponse', (_event, ...args) => {
    const response: ValidatorsInfoResponse = args[0];
    validatorInfomation.value = response;

    mainBusy.value = false;
  });

  loadInfo();
})


</script>