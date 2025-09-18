<script setup>
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const props = defineProps({
    show: { type: Boolean, default: false },
    firebaseConfig: { type: Object, required: true }
});
const emit = defineEmits(['close', 'usuarioCreado']);

const toast = useToast();
const db = getFirestore();

const nombreCompleto = ref('');
const nombreUsuario = ref('');
const password = ref('');
const rol = ref('tecnico');
const isSaving = ref(false);

const handleSubmit = async () => {
    // Validaciones simples
    if (!nombreCompleto.value.trim() || !nombreUsuario.value.trim() || !password.value) {
        return toast.error('Todos los campos son obligatorios.');
    }
    if (password.value.length < 6) {
        return toast.error('La contraseña debe tener al menos 6 caracteres.');
    }

    isSaving.value = true;

    // Creamos una segunda app de Firebase temporalmente
    const secondaryApp = initializeApp(props.firebaseConfig, 'secondary');
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const email = `${nombreUsuario.value.trim()}@hotelchacaosuites.com`;

        // 1. Creamos el usuario en Firebase Authentication con la app secundaria
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password.value);
        const newUser = userCredential.user;

        // 2. Creamos el documento del perfil en Firestore con la app principal
        const userDocRef = doc(db, 'usuarios', newUser.uid);
        await setDoc(userDocRef, {
            nombre_completo: nombreCompleto.value.trim(),
            email: email,
            rol: rol.value,
        });

        toast.success('Usuario creado con éxito.');
        emit('usuarioCreado'); // Emitimos un evento para que la lista se refresque
        emit('close');

    } catch (error) {
        console.error("Error creando usuario:", error);
        toast.error(error.code === 'auth/email-already-in-use' ? 'Este nombre de usuario ya existe.' : 'Error al crear el usuario.');
    } finally {
        isSaving.value = false;
        // Aunque no es estrictamente necesario, es buena práctica limpiar la app secundaria
        // En una app más compleja, se manejaría de forma más robusta.
    }
};
</script>

<template>
    <Transition name="modal-fade">
        <div v-if="show" class="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div class="bg-card rounded-lg shadow-xl w-full max-w-lg transform transition-all">
                <form @submit.prevent="handleSubmit">
                    <div class="p-4 border-b border-borde">
                        <h2 class="text-xl font-bold text-texto-principal">Crear Nuevo Usuario</h2>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Nombre Completo</label>
                            <input v-model="nombreCompleto" type="text" required
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Nombre de
                                Usuario</label>
                            <input v-model="nombreUsuario" type="text" required
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Contraseña
                                Temporal</label>
                            <input v-model="password" type="password" required
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Rol</label>
                            <select v-model="rol"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario">
                                <option value="tecnico">Técnico</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                    </div>
                    <div class="p-4 bg-fondo flex justify-end gap-3 rounded-b-lg">
                        <button @click="$emit('close')" type="button"
                            class="bg-gray-200 dark:bg-gray-700 text-texto-principal px-4 py-2 rounded-lg font-semibold text-sm">Cancelar</button>
                        <button type="submit" :disabled="isSaving"
                            class="bg-interactivo text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:bg-gray-400">
                            {{ isSaving ? 'Creando...' : 'Crear Usuario' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: all 0.2s ease-out;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-from .transform,
.modal-fade-leave-to .transform {
    transform: scale(0.95);
}
</style>