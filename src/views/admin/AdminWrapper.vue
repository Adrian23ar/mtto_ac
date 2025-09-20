<template>
  <div class="container mx-auto px-4 py-6">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-texto-principal">Panel de Administrador</h1>
        <p class="text-texto-secundario">Herramientas de gestión del sistema.</p>
      </div>
      <router-link to="/dashboard" class="text-sm font-semibold text-interactivo hover:underline whitespace-nowrap">
        &larr; Volver al Dashboard
      </router-link>
    </div>

    <div>

      <aside class="mb-6">
        <nav class="border-b border-borde">
          <div class="flex space-x-4">
            <router-link to="/admin/usuarios" class="py-2 px-1 border-b-2 font-medium text-sm"
              active-class="border-interactivo text-interactivo"
              inactive-class="border-transparent text-texto-secundario hover:border-gray-300 hover:text-texto-principal">Usuarios
            </router-link>
            <router-link to="/admin/equipos" class="py-2 px-1 border-b-2 font-medium text-sm"
              active-class="border-interactivo text-interactivo"
              inactive-class="border-transparent text-texto-secundario hover:border-gray-300 hover:text-texto-principal">Equipos
            </router-link>
            <router-link to="/admin/tareas" class="py-2 px-1 border-b-2 font-medium text-sm"
              active-class="border-interactivo text-interactivo"
              inactive-class="border-transparent text-texto-secundario hover:border-gray-300 hover:text-texto-principal">Tareas
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

<style scoped>
/* No se necesita CSS extra */
</style>