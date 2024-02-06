<template>
  <span class="transition duration-200 inline-block w-4 h-4 rounded-full"
    :class="[hasState ? (!!props.state ? 'bg-green-700' : 'bg-red-700') : 'bg-amber-500']"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  state?: boolean,
}>();

const hasState = computed(() => typeof props.state === "boolean");
</script>