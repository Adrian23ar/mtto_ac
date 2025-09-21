<script setup>
// src/views/admin/AdminWrapper.vue
import { ArrowUturnLeftIcon } from '@heroicons/vue/24/outline';
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-2">
      <div>
        <h1 class="text-2xl font-bold text-texto-principal">Panel de Administrador</h1>
        <p class="text-texto-secundario">Herramientas de gestión del sistema.</p>
      </div>
      <router-link to="/dashboard"
        class="text-sm font-semibold text-interactivo hover:underline whitespace-nowrap flex items-center gap-1">
        <ArrowUturnLeftIcon class="h-4 w-4" />
        Volver al Dashboard
      </router-link>
    </div>

    <div>
      <aside class="mb-6">
        <nav class="border-b border-borde">
          <div class="flex space-x-4">
            <router-link to="/admin/usuarios" custom v-slot="{ navigate, isActive }">
              <button @click="navigate" :class="[
                'py-2 px-1 border-b-2 font-medium text-sm',
                isActive
                  ? 'border-interactivo text-interactivo'
                  : 'border-transparent text-texto-secundario hover:border-gray-300 hover:text-texto-principal'
              ]">
                Usuarios
              </button>
            </router-link>

            <router-link to="/admin/equipos" custom v-slot="{ navigate, isActive }">
              <button @click="navigate" :class="[
                'py-2 px-1 border-b-2 font-medium text-sm',
                isActive
                  ? 'border-interactivo text-interactivo'
                  : 'border-transparent text-texto-secundario hover:border-gray-300 hover:text-texto-principal'
              ]">
                Equipos
              </button>
            </router-link>

            <router-link to="/admin/tareas" custom v-slot="{ navigate, isActive }">
              <button @click="navigate" :class="[
                'py-2 px-1 border-b-2 font-medium text-sm',
                isActive
                  ? 'border-interactivo text-interactivo'
                  : 'border-transparent text-texto-secundario hover:border-gray-300 hover:text-texto-principal'
              ]">
                Tareas
              </button>
            </router-link>
          </div>
        </nav>
      </aside>

      <main class="bg-card p-4 border border-borde rounded-lg">
        <router-view />
      </main>
    </div>
  </div>
</template>