<template>
  <div class="h-screen flex flex-col">
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
            Validator Information
          </h2>
          <h3 v-if="lastestError" class="text-center italic text-red-900 dark:text-red-300">
            {{ lastestError }}
          </h3>
          <div class="max-w-screen-sm w-full mx-auto flex flex-col gap-y-2">
            <template v-if="lighhouseApiData">
              <LoadingContainer v-if="apiBusy"></LoadingContainer>
              <template v-else>
                <div class="text-sm text-right px-4 py-2">
                  <span class="font-bold">Active:</span>
                  <span>
                    {{ validatorList.filter((e) => e.enabled).length }}/{{
                      validatorList.length }}
                  </span>
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
                        <th scope="col" class="px-4 py-2">
                          <div class="inline-flex gap-x-2">
                            <span>Active</span>
                            <SortButton :index="0" :sorted="sortColumn === 0" :asc="sortAsc" @sort="setSortValidator">
                            </SortButton>
                          </div>
                        </th>
                        <th scope="col" class="px-4 py-2 w-44">
                          <div class="inline-flex gap-x-2">
                            <span>Pubkey</span>
                            <SortButton :index="1" :sorted="sortColumn === 1" :asc="sortAsc" @sort="setSortValidator">
                            </SortButton>
                          </div>
                        </th>
                        <th scope="col" class="px-4 py-2">
                          Dora
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="validator of filteredValidatorList"
                        class="transition duration-200 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100">
                        <th scope="row"
                          class="px-4 py-2 w-8 font-medium text-gray-900 whitespace-nowrap dark:text-white relative">
                          <div class="absolute inset-0 flex flex-row justify-center items-center">
                            <div class="transition duration-200 inline-block w-4 h-4 rounded-full bg-gray-300"
                              :class="[validator.enabled ? 'bg-green-700' : 'bg-red-700']"></div>
                          </div>
                        </th>
                        <td class="px-4 py-2">
                          <div class="inline-flex flex-row gap-x-2">
                            <abbr :title="validator.voting_pubkey">{{ trimPubKey(validator.voting_pubkey, 12, 8) }}</abbr>
                            <ClipboardDocumentListIcon class="w-4 h-4 cursor-pointer" title="Copy Pubkey"
                              @click="copyText(validator.voting_pubkey)" />
                          </div>
                        </td>
                        <td class="px-4 py-2 w-8 relative">
                          <div class="absolute inset-0 flex flex-row justify-center items-center">
                            <a :href="getValidatorDoraLink(validator.voting_pubkey)" target="_blank"
                              title="Open Dora Validator Link">
                              <ArrowTopRightOnSquareIcon class="w-4 h-4 cursor-pointer" />
                            </a>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingContainer from "./LoadingContainer.vue"
import LightButton from "./LightButton.vue"
import SortButton from "./SortButton.vue"
import { Ref, computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ArrowTopRightOnSquareIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon, PencilIcon, CheckIcon } from '@heroicons/vue/24/solid'

const emit = defineEmits<{
  (e: 'setPage', v: string): void
}>();

const mainBusy = ref(false);
const apiBusy = ref(false);
const loadingMessage = ref("Load Lighhouse Api Keys...");
const lastestError = ref("");

const lighhouseApiData: Ref<LighhouseApiData | undefined> = ref(undefined);
const validatorList: Ref<ValidatorData[]> = ref([]);
const searchKeyword = ref("");
const sortColumn: Ref<number | undefined> = ref(undefined);
const sortAsc = ref(true);

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

function loadLighthouseApiData() {
  if (mainBusy.value) {
    return;
  }

  mainBusy.value = true;
  window.ipcRenderer.send("loadLighthouseApiData");
}

function setupAutoGetValidators() {
  if (refreshId) {
    clearInterval(refreshId);
  }
  refreshId = setInterval(async () => {
    if (mainBusy.value || apiBusy.value) {
      return;
    }

    const validatorInfo = await _getValidatorsInfo();
    if (validatorInfo) {
      validatorList.value = validatorInfo;
    }
  }, 5000);
}

async function getValidators() {
  if (apiBusy.value) {
    return;
  }

  apiBusy.value = true;

  const validatorInfo = await _getValidatorsInfo();
  if (validatorInfo) {
    validatorList.value = validatorInfo;
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

onMounted(() => {
  window.ipcRenderer.on('loadLighthouseApiDataResponse', (_event, ...args) => {
    const response: LighhouseApiData = args[0];
    lighhouseApiData.value = response;

    mainBusy.value = false;

    getValidators();
  });


  setupAutoGetValidators();
  loadLighthouseApiData();
})

onBeforeUnmount(() => {
  clearInterval(refreshId);
})
</script>