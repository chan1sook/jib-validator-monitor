<template>
  <div class="inline-block">
    <CheckIcon v-if="props.checked" class="w-4 h-" />
    <XMarkIcon v-else class="w-4 h-4" />
  </div>
</template>

<script setup lang="ts">
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  checked?: boolean,
}>();
</script>