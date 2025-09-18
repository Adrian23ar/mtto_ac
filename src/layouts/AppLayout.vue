<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import ThemeToggle from '../components/ThemeToggle.vue';
import { useAuth } from '../composables/useAuth';
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'; // Importa los íconos del menú

const { userProfile } = useAuth();
const router = useRouter();
const isMenuOpen = ref(false); // Estado para controlar el menú móvil

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
    <header class="bg-card border-b border-borde shadow-sm sticky top-0 z-20">
      <nav class="container mx-auto px-4 py-3 flex justify-between items-center">
        <router-link to="/dashboard">
          <h1 class="text-xl font-bold text-interactivo">Sistema de Mantenimiento</h1>
        </router-link>

        <div class="hidden md:flex items-center gap-4">
          <router-link to="/dashboard"
            class="text-sm font-semibold text-texto-secundario hover:text-texto-principal transition-all">Dashboard</router-link>
          <router-link to="/reportes"
            class="text-sm font-semibold text-texto-secundario hover:text-texto-principal transition-all">Reportes</router-link>
          <router-link v-if="userProfile?.rol === 'admin'" to="/admin/usuarios"
            class="text-sm font-semibold text-interactivo hover:text-interactivo/80 transition-all">Admin</router-link>
          <ThemeToggle />
          <button @click="handleLogout"
            class="bg-status-rojo text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors">
            Cerrar Sesión
          </button>
        </div>

        <div class="md:hidden">
          <button @click="isMenuOpen = !isMenuOpen" class="text-texto-principal">
            <XMarkIcon v-if="isMenuOpen" class="h-6 w-6" />
            <Bars3Icon v-else class="h-6 w-6" />
          </button>
        </div>
      </nav>

      <div v-if="isMenuOpen" class="md:hidden bg-card border-t border-borde">
        <nav class="container mx-auto px-4 pt-2 pb-4 flex flex-col space-y-2">
          <router-link to="/dashboard" @click="isMenuOpen = false"
            class="px-3 py-2 rounded-md text-texto-secundario hover:bg-fondo">Dashboard</router-link>
          <router-link to="/reportes" @click="isMenuOpen = false"
            class="px-3 py-2 rounded-md text-texto-secundario hover:bg-fondo">Reportes</router-link>
          <router-link v-if="userProfile?.rol === 'admin'" to="/admin/usuarios" @click="isMenuOpen = false"
            class="px-3 py-2 rounded-md text-interactivo hover:bg-fondo">Admin</router-link>
          <div class="border-t border-borde pt-4 mt-2 flex justify-between items-center">
            <ThemeToggle />
            <button @click="handleLogout" class="bg-status-rojo text-white px-3 py-2 rounded-md text-sm">
              Cerrar Sesión
            </button>
          </div>
        </nav>
      </div>
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