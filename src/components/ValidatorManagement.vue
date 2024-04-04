<template>
  <div class="h-full flex flex-col">
    <div class="w-full flex flex-row flex-wrap px-2 py-1 bg-white shadow-md border-b border-gray-200">
      <LightButton :disabled="mainBusy" @click="toHome">Back</LightButton>
      <LightButton v-if="!mainBusy" class="ml-auto" :disabled="mainBusy" @click="loadLighthouseApiData">
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
            Validator Management
          </h2>
          <h3 v-if="lastestError" class="text-center italic text-red-900 dark:text-red-300">
            {{ lastestError }}
          </h3>
          <div class="max-w-screen-sm w-full mx-auto flex flex-col gap-y-2">
            <template v-if="lighhouseApiData">
              <LoadingContainer v-if="apiBusy"></LoadingContainer>
              <template v-else>
                <div class="py-2 flex flex-row items-center">
                  <div class="text-sm flex flex-row items-center gap-x-2">
                    <LedStatus :state="isChainOnline" />
                    <span v-if="(typeof isChainOnline != 'boolean')"> Loading </span>
                    <span v-else-if="isChainOnline"> Online </span>
                    <span v-else> Offline </span>
                  </div>
                  <div class="text-sm ml-auto inline-flex gap-x-2">
                    <span class="font-bold">Active:</span>
                    <span>
                      {{ validatorActiveLength }}/{{ validatorList.length }}
                    </span>
                  </div>
                </div>

                <div>
                  <div class="relative">
                    <div class="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5">
                      <MagnifyingGlassIcon class="w-4 h-4" />
                    </div>
                    <input type="text" id="search-pubkeys" v-model="searchKeyword"
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Search Pubkey">
                  </div>
                </div>
                <div class="w-full max-h-[50vh] relative overflow-auto border shadow-md">
                  <table class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                    <thead class="text-xs text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th scope="col" class="px-4 py-2 w-10">
                          <div class="inline-flex gap-x-2">
                            <span>Status</span>
                            <SortButton :index="0" :sorted="sortColumn === 0" :asc="sortAsc" @sort="setSortValidator">
                            </SortButton>
                          </div>
                        </th>
                        <th scope="col" class="px-4 py-2 w-10">
                          <div class="inline-flex gap-x-2">
                            <span>Online</span>
                          </div>
                        </th>
                        <th scope="col" class="px-4 py-2">
                          <div class="inline-flex gap-x-2">
                            <span>Pubkey</span>
                            <SortButton :index="1" :sorted="sortColumn === 1" :asc="sortAsc" @sort="setSortValidator">
                            </SortButton>
                          </div>
                        </th>
                        <th scope="col" class="px-4 py-2 w-8">
                          Dora
                        </th>
                        <th scope="col" class="px-4 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="validator of filteredValidatorList"
                        class="transition duration-200 relative bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100">
                        <td class="px-4 py-2 relative">
                          <div class="absolute inset-0 flex flex-row justify-center items-center">
                            <span v-if="waitChangeValidator.has(validator.voting_pubkey)" title="Loading...">
                              <SpinnerAnimated class="w-4 h-4" />
                            </span>
                            <span v-else-if="validator.enabled" class="cursor-pointer" title="Enabled">
                              <PlayIcon class="w-4 h-4" @click="setValidatorRun(validator, false)" />
                            </span>
                            <span v-else class="cursor-pointer" title="Disabled">
                              <PauseIcon class="w-4 h-4" @click="setValidatorRun(validator, true)" />
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white relative">
                          <div class="absolute inset-0 flex flex-row justify-center items-center">
                            <LedStatus :state="validator.enabled && isChainOnline" />
                          </div>
                        </td>
                        <td class="px-4 py-2">
                          <div class="inline-flex flex-row gap-x-2">
                            <abbr :title="validator.voting_pubkey">{{ trimPubKey(validator.voting_pubkey, 12, 8)
                              }}</abbr>
                            <span title="Copy Pubkey">
                              <ClipboardDocumentListIcon class="w-4 h-4 cursor-pointer"
                                @click="copyText(validator.voting_pubkey)" />
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-2 relative">
                          <div class="absolute inset-0 flex flex-row justify-center items-center">
                            <a :href="getValidatorDoraLink(validator.voting_pubkey)" target="_blank"
                              title="Open Dora Validator Link">
                              <ArrowTopRightOnSquareIcon class="w-4 h-4 cursor-pointer" />
                            </a>
                          </div>
                        </td>
                        <td class="px-4 py-2 relative">
                          <div class="absolute inset-0 flex flex-row justify-center items-center">
                            <img src="../assets/exit-svgrepo-com.svg" class="w-4 h-4 cursor-pointer" draggable="false"
                              title="Exit Validator" @click="popupExitValidator(validator)" />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="filteredValidatorList.length === 0" class="italic text-center my-2">
                  No Validators Found
                </div>
              </template>
            </template>

            <template v-else>
              <div class="italic text-center">Validator Not Running</div>
              <div class="flex flex-row justify-center">
                <LightButton @click="loadLighthouseApiData">
                  Refresh
                </LightButton>
              </div>
            </template>
          </div>
        </template>
        <LightModal v-if="exitValidatorTarget" @confirm="exitValidator(exitValidatorTarget)"
          @close="closeExitValidatorPopup" @cancel="closeExitValidatorPopup">

          <template #header>Confirm Voluntary exit</template>
          <form @submit.prevent="exitValidator(exitValidatorTarget)">
            <p class="text-base leading-relaxed text-red-900 dark:text-red-300">
              WARNING: THIS IS IRREVERSIBLE OPERATION
            </p>
            <p class="text-base leading-relaxe">
              You still need to run this node until node marked "exit_unslashed"
            </p>
            <div class="my-2">
              <label for="password-address" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Enter Key Password
              </label>
              <div class="relative">
                <input :type="showPassword ? 'text' : 'password'" id="password-address" v-model="keyPassword"
                  class="transition duration-200 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pe-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  :class="[getKeyPasswordError ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500' : '']"
                  placeholder="Key Password" required :disabled="mainBusy">
                <div class="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5">
                  <PasswordToggler :show-password="showPassword" @click="showPassword = !showPassword" />
                </div>
              </div>
            </div>
            <p v-if="getKeyPasswordError" class="mt-2 text-xs text-red-900 dark:text-gray-500">
              {{ getKeyPasswordError }}
            </p>
          </form>

          <template #footer="{ close }">
            <button type="button" class="transition duration-200 text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800
                  disabled:bg-red-200
                  " :disabled="!!getKeyPasswordError" @click="close('confirm')">
              Confirm
            </button>
            <button type="button"
              class="ms-3 text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
              @click="close('cancel')">
              Cancel
            </button>
          </template>
        </LightModal>
        <LightModal v-if="exitVcBusy" no-close>
          <LoadingContainer>{{ loadingMessage }}</LoadingContainer>
        </LightModal>

        <LightModal v-if="exitVcError" @close="exitVcError = ''">

          <template #header>Error</template>
          <div class="break-all">
            {{ exitVcError }}
          </div>
        </LightModal>
        <LightModal v-if="exitVcResult" @close="exitVcResult = undefined">

          <template #header>Exit VC Successful</template>
          <div class=""></div>
          <div class="flex flex-col gap-y-1 items-start">
            <div class="flex flex-row gap-x-2">
              <div class="font-bold whitespace-nowrap">Pubkey: </div>
              <div class="flex-1">{{ exitVcResult.pubkey || '?' }}</div>
            </div>

            <div class="flex flex-row gap-x-2">
              <div class="font-bold whitespace-nowrap">Current Epoch: </div>
              <div class="flex-1">{{ exitVcResult.currentEpoch || '?' }}</div>
            </div>
            <div class="flex flex-row gap-x-2">
              <div class="font-bold whitespace-nowrap">Exit Epoch: </div>
              <div class="flex-1">{{ exitVcResult.exitEpoch || '?' }}</div>
            </div>
            <div class="flex flex-row gap-x-2">
              <div class="font-bold whitespace-nowrap">Withdrawable Epoch: </div>
              <div class="flex-1">{{ exitVcResult.withdrawableEpoch || '?' }}</div>
            </div>
            <div class="flex flex-row gap-x-2">
              <div class="font-bold whitespace-nowrap">Est. Exit After: </div>
              <div class="flex-1">{{ formatDate(exitVcResult.exitTs) }}</div>
            </div>
          </div>
        </LightModal>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SpinnerAnimated from "./SpinnerAnimated.vue"
import LoadingContainer from "./LoadingContainer.vue"
import LightButton from "./LightButton.vue"
import SortButton from "./SortButton.vue"
import PasswordToggler from "./PasswordToggler.vue"
import LedStatus from "./LedStatus.vue"
import LightModal from "./LightModal.vue"

import { Ref, computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ArrowTopRightOnSquareIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon, PauseIcon, PlayIcon } from '@heroicons/vue/24/solid'
import dayjs from "dayjs"

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const apiBusy = ref(false);
const exitVcBusy = ref(false);
const loadingMessage = ref("Load Lighhouse Api Keys...");
const lastestError = ref("");
const exitVcError = ref("");

const lighhouseApiData: Ref<LighhouseApiData | undefined> = ref(undefined);
const validatorList: Ref<ValidatorData[]> = ref([]);
const searchKeyword = ref("");
const sortColumn: Ref<number | undefined> = ref(undefined);
const sortAsc = ref(true);

const isChainOnline: Ref<boolean | undefined> = ref(undefined);
const waitChangeValidator = ref(new Set<string>());

const filteredValidatorList = computed(() => {
  let result: ValidatorData[] = [];
  if (!searchKeyword.value) {
    result = validatorList.value.slice();
  } else {
    result = validatorList.value.filter((ele) => {
      return ele.voting_pubkey.startsWith(searchKeyword.value) || ele.description.includes(searchKeyword.value);
    });
  }
  switch (sortColumn.value) {
    case 0:
      // by enabled
      if (sortAsc.value) {
        result.sort((a, b) => a.enabled !== b.enabled ? (a.enabled ? -1 : 1) : 0)
      } else {
        result.sort((b, a) => a.enabled !== b.enabled ? (a.enabled ? -1 : 1) : 0)
      }
      break;
    case 1:
      // by voting_pubkey
      if (sortAsc.value) {
        result.sort((a, b) => a.voting_pubkey.localeCompare(b.voting_pubkey))
      } else {
        result.sort((b, a) => a.voting_pubkey.localeCompare(b.voting_pubkey))
      }
      break;
    case 2:
      // by description
      if (sortAsc.value) {
        result.sort((a, b) => a.description.localeCompare(b.description))
      } else {
        result.sort((b, a) => a.description.localeCompare(b.description))
      }
      break;
  }
  return result;
});
const validatorActiveLength = computed(() => {
  return validatorList.value.filter((e) => e.enabled).length;
})

const exitValidatorTarget: Ref<ValidatorData | undefined> = ref(undefined);
const keyPassword = ref("");
const showPassword = ref(false);
const exitVcResult: Ref<ExitValidatorResult & { pubkey?: string } | undefined> = ref(undefined);

const getKeyPasswordError = computed(() => {
  if (keyPassword.value === "") {
    return "Password not empty"
  }
  if (keyPassword.value.length < 8) {
    return "Password too short!"
  }

  return "";
})

function loadLighthouseApiData() {
  if (mainBusy.value) {
    return;
  }

  mainBusy.value = true;
  window.ipcRenderer.send("loadLighthouseApiData");
}

function setupInterval() {
  if (refreshId) {
    clearInterval(refreshId);
  }
  refreshId = setInterval(async () => {
    if (mainBusy.value || apiBusy.value) {
      return;
    }

    const validatorManagement = await _getValidatorsInfo();
    if (validatorManagement) {
      validatorList.value = validatorManagement;
    }
  }, 5000);

  if (onlineRefreshId) {
    clearInterval(onlineRefreshId);
  }

  onlineRefreshId = setInterval(_checkJibServer, 10000);

}

async function _checkJibServer() {
  console.log("Check JIB");

  try {
    await fetch(`https://dora.jibchain.net/`, {
      method: "GET",
      mode: 'no-cors',
    });
    isChainOnline.value = true;
  } catch (err) {
    console.error(err);
    isChainOnline.value = false;
  }
}

async function getValidators() {
  if (apiBusy.value) {
    return;
  }

  apiBusy.value = true;

  const validatorManagement = await _getValidatorsInfo();
  if (validatorManagement) {
    validatorList.value = validatorManagement;
  }

  apiBusy.value = false;
}


async function _getValidatorsInfo() {
  if (!lighhouseApiData.value) {
    return undefined;
  }

  const response = await fetch(`http://localhost:${lighhouseApiData.value.apiPort}/lighthouse/validators`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${lighhouseApiData.value.apiToken}`
    }
  });

  const { data } = await response.json() as { data: ValidatorData[] };
  return data;
}

function setSortValidator(v: { index?: number, sorted?: boolean, asc?: boolean }) {
  if (!v.sorted) {
    sortColumn.value = v.index;
    sortAsc.value = true;
  } else {
    if (sortAsc.value) {
      sortAsc.value = false;
    } else {
      sortColumn.value = undefined;
    }
  }

}

function trimPubKey(pubkey: string, lead = 4, tail = 4) {
  if (pubkey.length < lead + tail + 4) {
    return pubkey;
  }

  const leadStr = pubkey.substring(0, lead);
  const tailStr = pubkey.substring(pubkey.length - tail);
  return `${leadStr}...${tailStr}`;
}

function getValidatorDoraLink(pubkey: string) {
  return `https://dora.jibchain.net/validator/${pubkey}`;
}

async function setValidatorRun(validator: ValidatorData, state: boolean) {
  if (!lighhouseApiData.value || waitChangeValidator.value.has(validator.voting_pubkey)) {
    return undefined;
  }

  waitChangeValidator.value.add(validator.voting_pubkey);

  try {
    await fetch(`http://localhost:${lighhouseApiData.value.apiPort}/lighthouse/validators/${validator.voting_pubkey}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${lighhouseApiData.value.apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        enabled: state
      })
    });
    validator.enabled = state;
  } catch (err) {
    console.error(err);
  }

  waitChangeValidator.value.delete(validator.voting_pubkey)
}

async function popupExitValidator(validator: ValidatorData) {
  if (!lighhouseApiData.value || waitChangeValidator.value.has(validator.voting_pubkey) || exitVcBusy.value) {
    return;
  }

  keyPassword.value = "";
  showPassword.value = false;
  exitValidatorTarget.value = validator;
}

async function closeExitValidatorPopup() {
  keyPassword.value = "";
  showPassword.value = false;
  exitValidatorTarget.value = undefined;
}

async function exitValidator(validator: ValidatorData) {
  if (!lighhouseApiData.value || waitChangeValidator.value.has(validator.voting_pubkey) || !!getKeyPasswordError.value || exitVcBusy.value) {
    return;
  }

  waitChangeValidator.value.add(validator.voting_pubkey);
  exitVcBusy.value = true;
  window.ipcRenderer.send("exitValidator", validator.voting_pubkey, keyPassword.value);

  closeExitValidatorPopup();
}

function formatDate(d: number | undefined) {
  if (typeof d === 'undefined') {
    return '?';
  }

  return dayjs(d).format("D MMMM YYYY HH:mm:ss");
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

let refreshId: NodeJS.Timeout | undefined;
let onlineRefreshId: NodeJS.Timeout | undefined;

onMounted(() => {
  window.ipcRenderer.on('loadLighthouseApiDataResponse', (_event, ...args) => {
    const response: LighhouseApiData | undefined = args[0];
    lighhouseApiData.value = response;

    mainBusy.value = false;

    getValidators();
  });


  window.ipcRenderer.on("exitValidatorStatus", (err, ...args) => {
    loadingMessage.value = args[0] as string;
  })

  window.ipcRenderer.on('exitValidatorResponse', (_event, ...args) => {
    const [resError, pubkey, response] = args as [string | null, string, ExitValidatorResult | undefined];

    exitVcResult.value = {
      currentEpoch: response?.currentEpoch,
      exitEpoch: response?.exitEpoch,
      withdrawableEpoch: response?.withdrawableEpoch,
      exitTs: response?.exitTs,
      pubkey,
    }

    if (resError) {
      // show error
      console.error(resError);
      exitVcError.value = resError || "Can't exit validators";
    }

    waitChangeValidator.value.delete(pubkey);
    exitVcBusy.value = false;
  });

  setupInterval();
  _checkJibServer();
  loadLighthouseApiData();
})

onBeforeUnmount(() => {
  clearInterval(refreshId);
  clearInterval(onlineRefreshId);
})
</script>