<template>
  <div class="flex flex-row justify-center items-center gap-x-2">
    <SpinnerAnimated class="w-8 h-8" />
    <slot>Loading...</slot>
  </div>
</template>

<script setup lang="ts">
import SpinnerAnimated from "./SpinnerAnimated.vue"
</script>