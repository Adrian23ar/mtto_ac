<script setup>
import { useTheme } from '../composables/useTheme';
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline';

const { theme, toggleTheme } = useTheme();
</script>

<template>
  <button
    @click="toggleTheme"
    class="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
    aria-label="Cambiar tema"
  >
    <SunIcon v-if="theme === 'dark'" class="h-6 w-6" />
    <MoonIcon v-else class="h-6 w-6" />
  </button>
</template>