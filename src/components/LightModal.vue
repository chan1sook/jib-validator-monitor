<template>
  <div tabindex="-1" aria-hidden="true"
    class="overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full bg-gray-500/50">
    <div class="relative p-4 w-full max-w-2xl max-h-full">
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
        <div v-if="hasHeaderSlot"
          class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            <slot name="header"></slot>
          </h3>
          <button type="button"
            class="transition duration-200 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
            title="Close" @click="close('close')">
            <XMarkIcon class="w-6 h-6" />
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <button v-else-if="!props.noClose" type="button"
          class="absolute top-4 right-4 transition duration-200 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
          title="Close" @click="close('close')">
          <XMarkIcon class="w-6 h-6" />
          <span class="sr-only">Close modal</span>
        </button>
        <div class="p-4 md:p-5 space-y-4 overflow-auto">
          <slot :close="close"></slot>
        </div>
        <div v-if="hasFooterSlot"
          class="flex items-center p-4 md:p-5 border-t border-gray-200 rounded-b dark:border-gray-600">
          <slot name="footer" :close="close">
            <button type="button" class="transition duration-200 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800
                  disabled:bg-red-200
                  " @click="close('confirm')">
              Confirm
            </button>
            <button type="button"
              class="ms-3 text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
              @click="close('cancel')">
              Cancel
            </button>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid'
import { computed, useSlots } from 'vue';

const props = defineProps<{
  noClose?: boolean,
}>();
const emit = defineEmits<{
  (e: string): void,
}>();

function close(action: string) {
  emit(action);
}


const hasHeaderSlot = computed(() => !!useSlots()["header"]);
const hasFooterSlot = computed(() => !!useSlots()["footer"]);

</script>