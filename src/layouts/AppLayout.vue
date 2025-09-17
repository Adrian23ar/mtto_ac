<script setup>
import { useRouter } from 'vue-router';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

const router = useRouter();

const handleLogout = async () => {
  try {
    await signOut(auth); // Cierra la sesión en Firebase
    router.push('/login'); // Redirige al usuario a la página de login
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    alert('Hubo un problema al cerrar la sesión.');
  }
};
</script>

<template>
  <div>
    <header class="bg-white shadow-sm">
      <nav class="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 class="text-xl font-bold text-interactivo">Sistema de Mantenimiento</h1>
        <button @click="handleLogout" class="bg-status-rojo text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors">
          Cerrar Sesión
        </button>
      </nav>
    </header>

    <main class="container mx-auto p-4">
      <router-view />
    </main>
  </div>
</template>