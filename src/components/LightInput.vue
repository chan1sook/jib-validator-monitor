<template>
  <div>
    <div class="relative">
      <div v-if="hasLeadSlot" class="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none">
        <slot name="lead" :validation="props.validation"></slot>
      </div>
      <input :type="props.type" :value="props.modelValue" :min="props.min" :max="props.max" :step="step"
        class="transition duration-200 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        :class="getInputClasses" :placeholder="props.placeholder" :disabled="props.disabled" :required="props.required"
        @input="updateValue">
      <div v-if="hasTailSlot" class="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5">
        <slot name="tail" :validation="props.validation"></slot>
      </div>
    </div>
    <p v-if="props.validation" class="mt-2 text-xs text-red-900 dark:text-gray-500">
      {{ props.validation }}
    </p>
    <p v-else-if="infomation" class="mt-2 text-xs text-gray-900 dark:text-gray-500">
      {{ infomation }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { type InputTypeHTMLAttribute, computed, useSlots } from 'vue';

const props = defineProps<{
  type?: InputTypeHTMLAttribute,
  modelValue?: any,
  min?: number | string,
  max?: number | string,
  step?: number | string,
  placeholder?: string,
  required?: boolean,
  disabled?: boolean,
  infomation?: string,
  validation?: string,
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: any): void,
}>();

const hasLeadSlot = computed(() => !!useSlots()["lead"]);
const hasTailSlot = computed(() => !!useSlots()["tail"]);

const getInputClasses = computed(() => {
  return [
    !!props.validation ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500' : '',
    hasLeadSlot.value ? "ps-10" : "",
    hasTailSlot.value ? "pe-10" : "",
  ];
});

function updateValue(ev: Event) {
  if (ev.target instanceof HTMLInputElement) {
    emit("update:modelValue", ev.target.value);
  }
}
</script>