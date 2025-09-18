<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { auth } from '../firebase/config.js';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const usuario = ref('');
const password = ref('');
const router = useRouter();
const toast = useToast();
const isLoading = ref(false); // Para deshabilitar el botón mientras se procesa

const handleLogin = async () => {
    // 1. Validación de campos vacíos
    if (!usuario.value.trim() || !password.value) {
        return toast.error('Por favor, ingresa tu usuario y contraseña.');
    }

    isLoading.value = true;
    try {
        const fakeEmail = `${usuario.value.trim()}@hotelchacaosuites.com`;

        // 2. Autenticación con Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password.value);
        const user = userCredential.user;

        // 3. Autorización: Verificación del estado en Firestore
        const db = getFirestore();
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        // Si el usuario existe en nuestra colección y está inactivo...
        if (userDocSnap.exists() && userDocSnap.data().estado === 'inactivo') {
            await signOut(auth); // ...cerramos su sesión inmediatamente...
            toast.error("Usuario o contraseña incorrectos."); // ...y mostramos el error genérico.
        } else {
            // Si está activo (o no tiene perfil aún, lo cual permitimos), lo dejamos pasar.
            router.push('/dashboard');
        }
    } catch (error) {
        // Para cualquier otro error de autenticación (contraseña mala, usuario no existe)...
        console.error("Error durante el inicio de sesión:", error.code);
        toast.error("Usuario o contraseña incorrectos."); // ...mostramos el mismo error genérico.
    } finally {
        isLoading.value = false; // Reactivamos el botón
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
                    <button type="submit" :disabled="isLoading"
                        class="w-full bg-interactivo hover:bg-opacity-90 text-sm text-white font-semibold py-3 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {{ isLoading ? 'Verificando...' : 'Iniciar Sesión' }}
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