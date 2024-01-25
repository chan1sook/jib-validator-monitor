<template>
  <div class="h-screen flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-0.5 bg-white shadow-md border-b border-gray-200">
      <LightButton :disabled="mainBusy" @click="toHome">Back</LightButton>
      <LightButton v-if="generateResult" class="ml-auto" @click="generateResult = undefined">Generate Again</LightButton>
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
            Generate Keys
          </h2>
          <h3 v-if="lastestError" class="text-center italic text-red-900 dark:text-red-300">
            {{ lastestError }}
          </h3>
        </template>
        <template v-if="!mainBusy">
          <div v-if="!generateResult" class="max-w-md w-full flex flex-col justify-center items-center gap-y-1">
            <div class="w-full">
              <label for="node-count" class="block mb-2 text-sm font-bold text-gray-900 dark:text-white">
                Number of Nodes:
              </label>
              <input type="number" id="node-count" v-model.number="nodeCount" min="1" step="1"
                aria-describedby="helper-text-explanation"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="1" required :disabled="mainBusy">
            </div>
            <div class="w-full">
              <label for="withdraw-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Withdraw Address
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-500 dark:text-gray-400"
                    :class="[getWithdrawAddressError ? 'text-red-900' : '']" aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 20">
                    <path
                      d="M8 0a7.992 7.992 0 0 0-6.583 12.535 1 1 0 0 0 .12.183l.12.146c.112.145.227.285.326.4l5.245 6.374a1 1 0 0 0 1.545-.003l5.092-6.205c.206-.222.4-.455.578-.7l.127-.155a.934.934 0 0 0 .122-.192A8.001 8.001 0 0 0 8 0Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                  </svg>
                </div>
                <input type="text" id="withdraw-address" v-model="withdrawAddress"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  :class="[getWithdrawAddressError ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500' : '']"
                  placeholder="ETH Address" required :disabled="mainBusy">
              </div>
              <p v-if="getWithdrawAddressError" class="mt-2 text-sm text-red-900 dark:text-gray-500">
                {{ getWithdrawAddressError }}
              </p>
            </div>
            <div class="w-full">
              <label for="password-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Key Password
              </label>
              <div class="relative">
                <input :type="showPassword ? 'text' : 'password'" id="password-address" v-model="keyPassword"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pe-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  :class="[getPasswordError ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500' : '']"
                  placeholder="Key Password" required :disabled="mainBusy">
                <div class="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5">
                  <PasswordToggler :show-password="showPassword" @click="showPassword = !showPassword" />
                </div>
              </div>
              <p v-if="getPasswordError" class="mt-2 text-sm text-red-900 dark:text-gray-500">
                {{ getPasswordError }}
              </p>
            </div>
            <div class="w-full">
              <label for="password-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Confrim Key Password
              </label>
              <div class="relative">
                <input :type="showPassword ? 'text' : 'password'" id="password-address" v-model="confirmKeyPassword"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pe-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  :class="[getPasswordKeyError ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500' : '']"
                  placeholder="Key Password" required :disabled="mainBusy">
                <div class="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5">
                  <PasswordToggler :show-password="showPassword" @click="showPassword = !showPassword" />
                </div>
              </div>
              <p v-if="getPasswordKeyError" class="mt-2 text-sm text-red-900 dark:text-gray-500">
                {{ getPasswordKeyError }}
              </p>
            </div>
            <div>
              <LightButton class="mx-auto" :disabled="mainBusy || !formValid" @click="generateKey">Generate</LightButton>
            </div>
          </div>
          <div v-else class="max-w-md w-full flex flex-col justify-center items-center gap-y-1">
            <h4 class="block mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Mnemonic:
            </h4>
            <div>
              {{ generateResult.mnemonic }}
            </div>
            <div>
              <LightButton v-if="generateResult" class="mx-auto" @click="copyText(generateResult.mnemonic)">Copy
              </LightButton>
            </div>
            <h4 class="block mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Files:
            </h4>
            <div class="w-full flex flex-col divide-y-2">
              <div v-for="key of Object.keys(generateResult.contents)"
                class="py-1 w-full flex flex-row items-center gap-x-2">
                <div class="flex-1">
                  {{ key }}
                </div>
                <a :href="fileURI[key]" :download="key" class="inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="w-4 h-4 cursor-pointer" title="Download File">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </a>
              </div>
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
import PasswordToggler from "./PasswordToggler.vue"

import { ref, onMounted, computed, Ref } from 'vue';
import { isAddress } from "ethers"
import { initFlowbite } from 'flowbite'

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const loadingMessage = ref("Check Dependencies...");
const generateResult: Ref<GenerateKeyResponse | undefined> = ref(undefined);
const lastestError = ref("");
const fileURI: Ref<Record<string, string>> = ref({});

const nodeCount = ref(1);
const withdrawAddress = ref("0xC70Edf3aB36E0D57eFD8f412A3460D225931A110");
const keyPassword = ref("12345678");
const confirmKeyPassword = ref("12345678");
const showPassword = ref(false);

const getWithdrawAddressError = computed(() => {
  if (!isAddress(withdrawAddress.value)) {
    return "Not ETH Address";
  }
  if (withdrawAddress.value === "0x0000000000000000000000000000000000000000") {
    return "Not Empty Address";
  }
  return "";
});

const getPasswordError = computed(() => {
  if (keyPassword.value === "") {
    return "Password not empty"
  }
  if (keyPassword.value.length < 8) {
    return "Password too short!"
  }

  return "";
})

const getPasswordKeyError = computed(() => {
  if (confirmKeyPassword.value !== keyPassword.value) {
    return "Confirm password not match"
  }

  return "";
})


const formValid = computed(() => {
  return getWithdrawAddressError.value === "";
})

function generateKey() {
  if (!formValid.value) {
    return;
  }

  mainBusy.value = true;
  generateResult.value = undefined;

  window.ipcRenderer.send("generateKeys", nodeCount.value, withdrawAddress.value, keyPassword.value);
}

function cancelGenerateKeys() {
  window.ipcRenderer.send("generateKeysCancel")
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Content copied to clipboard');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

function generateFileURIs(contents: Record<string, string> | undefined) {
  if (!contents) {
    return;
  }

  for (const link of Object.values(fileURI.value)) {
    URL.revokeObjectURL(link);
  }
  fileURI.value = {};


  for (const key of Object.keys(contents)) {
    const content = contents[key];
    const blob = new Blob([content], { type: 'application/json' });
    fileURI.value[key] = URL.createObjectURL(blob);
  }
}

function toHome() {
  cancelGenerateKeys();
  emit('setPage', 'home');
}

onMounted(() => {
  initFlowbite();

  window.ipcRenderer.on("generateKeysStatus", (err, ...args) => {
    loadingMessage.value = args[0] as string;
  })

  window.ipcRenderer.on("generateKeysResponse", (err, ...args) => {
    const [resError, response] = args as [Error | null, GenerateKeyResponse | undefined];
    if (resError) {
      // show error
      console.error(resError);
      lastestError.value = "Can't generate validator keys";
    } else {
      generateFileURIs(response?.contents);
      generateResult.value = response;
    }
    mainBusy.value = false;
  })
})
</script>