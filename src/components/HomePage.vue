<template>
  <div class="h-screen px-4 py-4 flex flex-col justify-center gap-y-2" @click="loading = false">
    <div>
      <img src="../assets/jbc-badge.png" class="mx-auto h-20" />
    </div>
    <h1 class="text-center font-bold text-2xl">
      JIB Validator Monitor
    </h1>
    <LoadingContainer v-if="loading"></LoadingContainer>
    <template v-else>
      <h2 v-if="!keyImported" class="text-center text-lg">
        Key not imported
      </h2>
      <h2 v-else-if="!validatorDeployed" class="text-center text-lg">
        Validator Node not found
      </h2>
    </template>
    <div class="flex flex-col justify-center items-center gap-y-1">
      <LightButton @click="generateKeys">Generate Keys</LightButton>
      <template v-if="validatorDeployed">
        <LightButton @click="monitorValidators">Monitor Validators</LightButton>
        <LightButton @click="exitValdiators">Close Validators</LightButton>
      </template>
      <template v-else-if="keyImported">
        <LightButton @click="deployValidators">Deploy Validators</LightButton>
      </template>
      <template v-else>
        <LightButton @click="importKeys">Import Keys</LightButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingContainer from "./LoadingContainer.vue"
import LightButton from "./LightButton.vue"
import { ref, onMounted } from 'vue';

const loading = ref(true);
const keyImported = ref(false);
const validatorDeployed = ref(false);

function checkValidators() {
  window.ipcRenderer.send("check-validators");
}

// mockup functions
function generateKeys() {
}
function importKeys() {
  keyImported.value = true;
}
function deployValidators() {
  validatorDeployed.value = true;
}
function monitorValidators() {

}
function exitValdiators() {
  keyImported.value = false;
  validatorDeployed.value = false;
}

onMounted(() => {
  window.ipcRenderer.on('check-validators-response', (_event, ...args) => {
    const response: { validatorExists: boolean, keyExists: boolean } = args[0];

    keyImported.value = response.keyExists;
    validatorDeployed.value = response.validatorExists;
    loading.value = false;
  });

  checkValidators();
})

</script>