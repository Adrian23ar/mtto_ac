<script setup>
import { useRouter } from 'vue-router';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import ThemeToggle from '../components/ThemeToggle.vue'; // <-- 1. Importa el componente

const router = useRouter();

const handleLogout = async () => {
  try {
    await signOut(auth);
    router.push('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};
</script>

<template>
  <div>
    <header class="bg-blanco dark:bg-negro_card shadow-sm">
      <nav class="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 class="text-xl font-bold text-interactivo">Sistema de Mantenimiento</h1>
        <div class="flex items-center gap-4">
          <router-link to="/reportes"
            class="text-sm font-semibold text-texto-secundario hover:text-texto-principal">Reportes</router-link>

          <ThemeToggle /> <button @click="handleLogout"
            class="bg-status-rojo text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </nav>
    </header>

    <main class="container mx-auto p-4">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>