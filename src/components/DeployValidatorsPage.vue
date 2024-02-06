<template>
  <div class="h-screen flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-1 bg-white shadow-md border-b border-gray-200">
      <div>
        <LightButton v-if="inputPage === 1 || deployResult" :disabled="mainBusy" @click="toHome">Back</LightButton>
        <LightButton v-else-if="!deployResult" :disabled="mainBusy" @click="inputPage -= 1">Prev</LightButton>
      </div>
      <div class="ml-auto">
        <LightButton v-if="inputPage === 1" :disabled="!!getKeyFilesError || mainBusy" @click="inputPage += 1">Next
        </LightButton>
      </div>
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
          <template v-if="!deployResult">
            <div v-if="inputPage === 1" class="max-w-md w-full flex flex-col justify-center items-center gap-y-1">
              <div class="mt-2">
                <LightButton :disabled="mainBusy" @click="selectVcKeyFiles">Select Files</LightButton>
              </div>
              <div class="w-full flex flex-col divide-y-2">
                <div v-for="key of Object.keys(files)" class="py-1 w-full flex flex-row items-center gap-x-2">
                  <div class="flex-1">
                    {{ key }}
                  </div>
                  <span title="Remove File">
                    <XMarkIcon class="w-4 h-4 cursor-pointer" @click="removeFile(key)" />
                  </span>
                </div>
                <div v-if="Object.keys(files).length === 0" class="italic text-center text-sm">
                  No Files
                </div>
              </div>
              <p v-if="Object.keys(files).length > 0 && getKeyFilesError"
                class="mt-2 text-xs text-red-900 dark:text-gray-500">
                {{ getKeyFilesError }}
              </p>
              <div class="mt-4">
                <LightButton :disabled="!!getKeyFilesError" @click="inputPage += 1">Next</LightButton>
              </div>
            </div>
            <div v-else-if="inputPage === 2" class="max-w-md w-full flex flex-col justify-center items-center gap-y-1">
              <h4 class="block mb-2 text-sm font-bold text-gray-900 dark:text-white">
                Extra Information:
              </h4>
              <div class="w-full flex flex-col gap-y-1">
                <div class="w-full">
                  <label for="machine-public-ip" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Machine Public IP
                  </label>
                  <LightInput type="text" id="machine-public-ip" v-model="machinePublicIp"
                    :validation="getMachinePublicIpError" placeholder="eg xxx.xxx.xxx.xxx" required :disabled="mainBusy">
                    <template #lead="{ validation }">
                      <MapPinIcon class="w-4 h-4 text-gray-500 dark:text-gray-400"
                        :class="[validation ? 'text-red-900' : '']" aria-hidden="true" />
                    </template>
                  </LightInput>
                </div>
                <div class="w-full">
                  <label for="fee-recipient-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Fee Recipient Address
                  </label>
                  <LightInput type="text" id="fee-recipient-address" v-model="feeRecipientAddress"
                    :validation="getFeeRecipientAddressError" placeholder="ETH Address" required :disabled="mainBusy">
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
                  <LightInput :type="showPassword ? 'text' : 'password'" id="password-address"
                    v-model="confirmKeyPassword" :validation="getConfirmKeyPasswordError" placeholder="Key Password"
                    required :disabled="mainBusy">
                    <template #tail>
                      <PasswordToggler :show-password="showPassword" @click="showPassword = !showPassword" />
                    </template>
                  </LightInput>
                </div>
              </div>
              <div class="w-full self-start">
                <input id="advance-setting" type="checkbox" v-model="showAdvanceSetting"
                  class="transition duration-200 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <label for="advance-setting" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                  Advance Setting
                </label>
              </div>
              <template v-if="showAdvanceSetting">
                <div class="w-full self-start">
                  <label for="graffiti" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Graffiti
                  </label>
                  <LightInput type="text" id="graffiti" v-model="advanceSetting.graffiti" placeholder="Graffiti"
                    :disabled="mainBusy" />
                </div>
                <div class="w-full">
                  <label for="lighhouse-http-port" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Lighhouse API Port
                  </label>
                  <LightInput type="text" id="vc-graffiti" v-model="advanceSetting.exposeLighhouseApiPort"
                    infomation="Set Lighhouse API Port (for monitoring)" :validation="getLighthouseApiPortError"
                    placeholder="Default port is 5062" required :disabled="mainBusy">
                  </LightInput>
                </div>
              </template>
              <div class="mt-4">
                <LightButton :disabled="!isFormValid" @click="deployValidators">Deploy!</LightButton>
              </div>
            </div>
          </template>
          <div v-else class="max-w-md w-full flex flex-col justify-center items-center gap-y-1">
            <h4 class="block mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Deploy Successful:
            </h4>
            <div>
              <div>
                <span class="font-bold">Imported:</span> {{ deployResult.imported }}
              </div>
              <div>
                <span class="font-bold">Skipped:</span> {{ deployResult.skipped }}
              </div>
              <template v-if="deployResult.apiPort && deployResult.apiToken">
                <div class="break-all mt-4">
                  <span class="font-bold">Lighthouse API Port:</span> {{ deployResult.apiPort }}
                </div>
                <div>
                  <span class="font-bold">API Token: </span>
                  <span class="break-all">
                    {{ deployResult.apiToken }}
                    <span title="Copy API Key">
                      <ClipboardDocumentListIcon class="w-4 h-4 inline-block cursor-pointer"
                        @click="copyText(deployResult.apiToken)" />
                    </span>
                  </span>
                </div>
              </template>
            </div>
            <div class="mt-2">
              <LightButton class="mx-auto" @click="toHome()">Back to home</LightButton>
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
import PasswordToggler from "./PasswordToggler.vue"
import { XMarkIcon, MapPinIcon, ClipboardDocumentListIcon } from '@heroicons/vue/24/solid'

import { ref, onMounted, computed, Ref } from 'vue';
import { isAddress } from "ethers";
import validator from 'validator';

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const inputPage = ref(1);
const loadingMessage = ref("Check Dependencies...");
const lastestError = ref("");
const deployResult: Ref<DeployKeyResult | undefined> = ref(undefined);

const files: Ref<Record<string, string>> = ref({});
const machinePublicIp = ref("");
const feeRecipientAddress = ref("");
const keyPassword = ref("");
const confirmKeyPassword = ref("");
const showPassword = ref(false);
const showAdvanceSetting = ref(true);
const advanceSetting: Ref<DeployKeyAdvanceSetting> = ref({
  graffiti: "JBCValidatorClient",
  exposeLighhouseApiPort: "5062",
});

const getKeyFilesError = computed(() => {
  const keys = Object.keys(files.value)

  const depositFileKey = keys.find((k) => {
    const tokens = k.split("/");
    const lastTokens = tokens[tokens.length - 1] || "";
    return lastTokens.startsWith("deposit_data-") && lastTokens.endsWith(".json");
  });
  if (!depositFileKey) {
    return "Missing Deposit JSON File";
  }

  const keystoreKeys = keys.filter((k) => {
    const tokens = k.split("/");
    const lastTokens = tokens[tokens.length - 1] || "";
    return lastTokens.startsWith("keystore-m_") && lastTokens.endsWith(".json");
  });

  if (keystoreKeys.length === 0) {
    return "Missing Keystore JSON File";
  }
  // TODO read content it

  return "";
});

const getMachinePublicIpError = computed(() => {
  if (!machinePublicIp.value) {
    return "Required";
  }
  if (!validator.isIP(machinePublicIp.value) && !validator.isFQDN(machinePublicIp.value)) {
    return "Invalid ip or domain";
  }
  return "";
});

const getFeeRecipientAddressError = computed(() => {
  if (!isAddress(feeRecipientAddress.value)) {
    return "Not ETH Address";
  }
  if (feeRecipientAddress.value === "0x0000000000000000000000000000000000000000") {
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

const getLighthouseApiPortError = computed(() => {
  if (advanceSetting.value.exposeLighhouseApiPort === "") {
    return "Required"
  }

  const n = parseInt(advanceSetting.value.exposeLighhouseApiPort, 10);
  if (!Number.isInteger(n) || n < 1024) {
    return "Must be Intreger > 1024";
  }

  return "";
})

const isFormValid = computed(() => {
  return getKeyFilesError.value === ""
    && getMachinePublicIpError.value === ""
    && getFeeRecipientAddressError.value === ""
    && getKeyPasswordError.value === ""
    && getConfirmKeyPasswordError.value === ""
    && getLighthouseApiPortError.value === "";
})


function selectVcKeyFiles() {
  window.ipcRenderer.send("selectVcKeyFiles");
}

function removeFile(fileKey: string) {
  delete files.value[fileKey];
}

function deployValidators() {
  if (!isFormValid.value) {
    return;
  }

  lastestError.value = "";
  mainBusy.value = true;

  window.ipcRenderer.send("deployValidators",
    JSON.stringify(files.value),
    machinePublicIp.value.trim(),
    feeRecipientAddress.value.trim(),
    keyPassword.value,
    JSON.stringify(advanceSetting.value),
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Content copied to clipboard');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

function toHome() {
  emit('setPage', 'home');
}

onMounted(() => {
  window.ipcRenderer.on("selectVcKeyFilesResponse", (err, ...args) => {
    const [resError, response] = args as [string | null, Record<string, string>];
    if (resError) {
      // show error
      console.error(resError);
    } else {
      files.value = Object.assign({ ...files.value }, response);
    }
  })

  window.ipcRenderer.on("deployValidatorsStatus", (err, ...args) => {
    loadingMessage.value = args[0] as string;
  })

  window.ipcRenderer.on("deployValidatorsResponse", (err, ...args) => {
    const [resError, response] = args as [string | null, DeployKeyResult | undefined];
    if (resError) {
      // show error
      console.error(resError);
      lastestError.value = "Can't deploy validators";
    } else {
      deployResult.value = response;
    }
    mainBusy.value = false;
  })
})
</script>