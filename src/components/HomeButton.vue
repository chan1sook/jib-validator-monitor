<template>
  <div
    class="w-24 h-24 overflow-hidden p-2 text-gray-900 bg-white border-gray-300 border hover:bg-gray-100 over:shadow-md 
              rounded-lg text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 
              dark:hover:border-gray-600 dark:focus:ring-gray-700 flex flex-col justify-center items-center gap-y-2 cursor-pointer"
    @click="emit('click')">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'click'): void
}>();
</script>