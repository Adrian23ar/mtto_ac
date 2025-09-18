<template>
  <div class="py-4 px-6 ">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-texto-principal">Panel de Administrador</h1>
        <p class="text-texto-secundario">Herramientas de gestión del sistema.</p>
      </div>
      <router-link to="/dashboard" class="text-sm font-semibold text-interactivo hover:underline">
        &larr; Volver al Dashboard
      </router-link>
    </div>
    <div class="bg-card p-4 border border-borde rounded-lg">
      <router-view />
    </div>
  </div>
</template>