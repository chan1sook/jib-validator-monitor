<template>
  <div class="h-screen flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-1 bg-white shadow-md border-b border-gray-200">
      <LightButton :disabled="mainBusy" @click="toHome">Back</LightButton>
      <LightButton v-if="zipBuilded" class="ml-auto" @click="zipBuilded = false">Generate Again
      </LightButton>
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
          <form v-if="!zipBuilded" class="max-w-md w-full flex flex-col justify-center items-center gap-y-1"
            @submit.prevent="generateKey">
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
              <LightButton type="submit" class="mx-auto" :disabled="mainBusy || !isFormValid">
                Generate
              </LightButton>
            </div>
          </form>
          <div v-else class="max-w-md w-full flex flex-col justify-center items-center gap-y-1">
            <h3 class="text-center">Zip File Generated</h3>
            <div class="text-center mb-2">
              <a :href="zipURI" download="jbc-deposit-keystore.zip">
                <LightButton>Download Zip</LightButton>
              </a>
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
import { MapPinIcon } from '@heroicons/vue/24/solid'

import { ref, onMounted, computed, Ref } from 'vue';
import Axios from "axios"
import { isAddress } from "ethers"

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const loadingMessage = ref("Cloud Generate Keys");
const lastestError = ref("");
const zipBuilded = ref(false);
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

async function generateKey() {
  if (!isFormValid.value) {
    return;
  }

  mainBusy.value = true;
  lastestError.value = "";

  try {
    loadingMessage.value = "Cloud Generate Keys";
    const res = await Axios.post("https://jbc-keygen.chan1sook.com/generate-keys", {
      withdrawAddress: withdrawAddress.value,
      keyPassword: keyPassword.value,
      qty: nodeCount.value,
    }, {
      responseType: 'blob',
      onDownloadProgress(progress) {
        loadingMessage.value = `Downloading: (${progress.bytes} bytes)`;
      }
    })

    if (zipURI.value) {
      URL.revokeObjectURL(zipURI.value);
    }
    zipURI.value = URL.createObjectURL(res.data);

    console.log("Zip Builded");

    zipBuilded.value = true;
    mainBusy.value = false;
  } catch (err) {
    console.error(err);

    if (err instanceof Error) {
      lastestError.value = err.message;
    } else {
      lastestError.value = "Can't Generate File"
    }

    mainBusy.value = false;
  }

  // window.ipcRenderer.send("generateKeys", nodeCount.value, withdrawAddress.value.trim(), keyPassword.value);
}

function toHome() {
  emit('setPage', 'home');
}
</script>