<template>
  <div class="inline-block cursor-pointer" :title="showPassword ? 'Hide Password' : 'Show Password'"
    @click="emit('click', !props.showPassword)">
    <EyeIcon v-if="props.showPassword" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
    <EyeSlashIcon v-else class="w-4 h-4 text-gray-500 dark:text-gray-400" />
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  showPassword?: boolean,
}>();


const emit = defineEmits<{
  (e: 'click', v: boolean): void
}>();
</script>