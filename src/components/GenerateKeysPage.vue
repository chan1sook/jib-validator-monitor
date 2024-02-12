<template>
  <div class="h-screen flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-1 bg-white shadow-md border-b border-gray-200">
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
              <LightInput type="number" id="node-count" v-model.number="nodeCount" min="1" step="1" placeholder="1"
                required :disabled="mainBusy" />
            </div>
            <div class="w-full">
              <label for="withdraw-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Withdraw Address
              </label>
              <LightInput type="text" id="withdraw-address" v-model="withdrawAddress"
                :validation="getWithdrawAddressError" placeholder="ETH Address" required :disabled="mainBusy">
                <template #lead="{ validation }">
                  <MapPinIcon class="w-4 h-4 text-gray-500 dark:text-gray-400"
                    :class="[validation ? 'text-red-900' : '']" />
                </template>
              </LightInput>
            </div>
            <div class="w-full">
              <label for="password-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Key Password
              </label>
              <LightInput :type="showPassword ? 'text' : 'password'" id="password-address" v-model="keyPassword"
                :validation="getKeyPasswordError" placeholder="Key Password" required :disabled="mainBusy">
                <template #tail>
                  <PasswordToggler :show-password="showPassword" @click="showPassword = !showPassword" />
                </template>
              </LightInput>
            </div>
            <div class="w-full">
              <label for="password-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Confrim Key Password
              </label>
              <LightInput :type="showPassword ? 'text' : 'password'" id="password-address" v-model="confirmKeyPassword"
                :validation="getConfirmKeyPasswordError" placeholder="Key Password" required :disabled="mainBusy">
                <template #tail>
                  <PasswordToggler :show-password="showPassword" @click="showPassword = !showPassword" />
                </template>
              </LightInput>
            </div>
            <div>
              <LightButton class="mx-auto" :disabled="mainBusy || !isFormValid" @click="generateKey">Generate
              </LightButton>
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
            <div class="w-full flex flex-row items-end mb-2">
              <h4 class="block flex-1 text-sm font-bold text-gray-900 dark:text-white">
                Files:
              </h4>
              <a v-if="!zipBusy" :href="zipURI" download="jbc-deposit-keystore.zip">
                <LightButton>Download Zip</LightButton>
              </a>
              <LightButton v-else disabled>Zipping...</LightButton>
            </div>
            <div class="w-full flex flex-col divide-y-2">
              <div v-for="key of Object.keys(generateResult.contents)"
                class="py-1 w-full flex flex-row items-center gap-x-2">
                <div class="flex-1">
                  {{ key }}
                </div>
                <a :href="fileURI[key]" :download="key" class="inline-block" title="Download File"
                  @click="fileDownloaded.add(key)">
                  <ArrowDownTrayIcon class="w-4 h-4 cursor-pointer" />
                </a>
                <div>
                  <Checkmark :checked="fileDownloaded.has(key)">
                    <template #no>
                      <span class="w-4 h-4 inline-block"></span>
                    </template>
                  </Checkmark>
                </div>
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
import LightInput from "./LightInput.vue"
import LightButton from "./LightButton.vue"
import PasswordToggler from "./PasswordToggler.vue"
import Checkmark from "./Checkmark.vue"
import { MapPinIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/solid'

import { ref, onMounted, computed, Ref } from 'vue';
import { isAddress } from "ethers"
import JSZip from 'jszip'

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const loadingMessage = ref("Check Dependencies...");
const generateResult: Ref<GenerateKeyResponse | undefined> = ref(undefined);
const fileDownloaded = ref(new Set<string>());
const lastestError = ref("");
const fileURI: Ref<Record<string, string>> = ref({});
const zipBusy = ref(false);
const zipURI: Ref<string | undefined> = ref(undefined);

const nodeCount = ref(1);
const withdrawAddress = ref("");
const keyPassword = ref("");
const confirmKeyPassword = ref("");
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

const getKeyPasswordError = computed(() => {
  if (keyPassword.value === "") {
    return "Password not empty"
  }
  if (keyPassword.value.length < 8) {
    return "Password too short!"
  }

  return "";
})

const getConfirmKeyPasswordError = computed(() => {
  if (confirmKeyPassword.value !== keyPassword.value) {
    return "Confirm password not match"
  }

  return "";
})


const isFormValid = computed(() => {
  return getWithdrawAddressError.value === "" && getKeyPasswordError.value === "" && getConfirmKeyPasswordError.value === "";
})

function generateKey() {
  if (!isFormValid.value) {
    return;
  }

  mainBusy.value = true;
  generateResult.value = undefined;

  window.ipcRenderer.send("generateKeys", nodeCount.value, withdrawAddress.value.trim(), keyPassword.value);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Content copied to clipboard');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

async function buildZipFile(generateResult?: GenerateKeyResponse) {
  if (!generateResult) {
    return;
  }

  zipBusy.value = true;
  try {
    const zipFile = new JSZip();
    zipFile.file("mnemonic.txt", generateResult.mnemonic);
    for (const filename of Object.keys(generateResult.contents)) {
      zipFile.file(filename, generateResult.contents[filename]);
    }

    const blob = await zipFile.generateAsync({ type: "blob" });

    if (zipURI.value) {
      URL.revokeObjectURL(zipURI.value);
    }
    zipURI.value = URL.createObjectURL(blob);
  } catch (err) {
    console.error(err);
  }
  zipBusy.value = false;
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
  emit('setPage', 'home');
}

onMounted(() => {
  window.ipcRenderer.on("generateKeysStatus", (err, ...args) => {
    loadingMessage.value = args[0] as string;
  })

  window.ipcRenderer.on("generateKeysResponse", (err, ...args) => {
    const [resError, response] = args as [string | null, GenerateKeyResponse | undefined];
    if (resError) {
      // show error
      console.error(resError);
      lastestError.value = resError || "Can't generate validator keys";
    } else {
      generateFileURIs(response?.contents);
      buildZipFile(response);
      generateResult.value = response;
    }
    mainBusy.value = false;
  })
})
</script>