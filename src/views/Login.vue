<script setup>
// src/views/login.vue

// Paso 1: Corrige tus importaciones
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../firebase/config.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

const usuario = ref('');
const password = ref('');

// Paso 2: Instancia el router para poder usarlo
const router = useRouter();

// Paso 3: Reestructura tu función handleLogin así
const handleLogin = async () => {
    try {
        // 3.1 Transforma el usuario a un email ficticio
        const fakeEmail = `${usuario.value}@hotelchacaosuites.com`;
        // 3.2 Llama a la función de Firebase con la sintaxis correcta
        const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password.value);

        // 3.4 Redirige al usuario al dashboard
        router.push('/dashboard'); // Asegúrate de tener esta ruta en tu router

    } catch (error) {
        // 3.5 Si algo sale mal (contraseña incorrecta, etc.), el código salta aquí
        console.error("Error durante el inicio de sesión:", error.code);
        alert("Usuario o contraseña incorrectos. Por favor, intenta de nuevo.");
    }
};
</script>
<template>
    <div class="bg-interactivo h-screen flex justify-center items-center">

        <div class="w-full max-w-md">
            <div class="text-center text-white mb-6">
                <p class="text-3xl font-bold mb-2">Sistema de Mantenimiento</p>
                <span class="font-light">Gestión de Aires Acondicionados</span>
            </div>

            <div class="bg-white p-6 rounded-xl ">
                <div class="text-center mb-4">
                    <p class="text-lg font-semibold">Acceso de tecnicos</p>
                    <span class="text-sm text-gray-500">
                        Ingresa tus credenciales para continuar
                    </span>
                </div>

                <form @submit.prevent="handleLogin">
                    <div class="mb-4">
                        <label for="usuario" class="block text-gray-700 text-sm mb-1">Usuario</label>
                        <input type="usuario" v-model="usuario" id="usuario" required
                            class="w-full p-[6px] border rounded-md bg-gray-50 border-gray-200 focus:ring-2 focus:ring-interactivo focus-within:outline-none">
                    </div>
                    <div class="mb-6">
                        <label for="password" class="block text-gray-700 text-sm mb-1">Contraseña</label>
                        <input type="password" v-model="password" id="password" required
                            class="w-full p-[6px] border rounded-md bg-gray-50 border-gray-200 focus:ring-2 focus:ring-interactivo focus-within:outline-none">
                    </div>
                    <button type="submit"
                        class="w-full bg-interactivo hover:bg-interactivo/90 text-sm text-white font-semibold py-3 rounded-lg">
                        Iniciar Sesión
                    </button>
                </form>
                <p class="text-sm text-gray-500 mt-8 text-center">¿Problemas para acceder? <span
                        class="text-interactivo">Contacta al administrador</span></p>
            </div>

            <p class="text-sm text-white/90 mt-8 text-center">&copy; 2025 Todos los derechos reservados</p>
        </div>

    </div>
</template>
<style scoped></style>