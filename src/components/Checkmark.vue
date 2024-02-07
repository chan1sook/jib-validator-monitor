<template>
  <div class="inline-block">
    <slot v-if="props.checked">
      <CheckIcon class="w-4 h-4" />
    </slot>
    <slot v-else name="no">
      <XMarkIcon class="w-4 h-4" />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  checked?: boolean,
}>();
</script>