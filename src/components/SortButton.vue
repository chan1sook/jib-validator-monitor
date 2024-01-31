<template>
  <span class="cursor-pointer" @click="trigSort">
    <Bars3BottomLeftIcon v-if="!sorted" class="w-4 h-4" />
    <template v-else>
      <ArrowDownIcon v-if="props.asc" class="w-4 h-4" />
      <ArrowUpIcon v-else class="w-4 h-4" />
    </template>
  </span>
</template>

<script setup lang="ts">
import { Bars3BottomLeftIcon, ArrowDownIcon, ArrowUpIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  index?: number,
  sorted?: boolean,
  asc?: boolean,
}>();

const emit = defineEmits<{
  (e: 'sort', v: { index?: number, sorted?: boolean, asc?: boolean }): void,
}>();

function trigSort() {
  emit('sort', {
    index: props.index,
    sorted: props.sorted,
    asc: props.asc,
  });
}
</script>