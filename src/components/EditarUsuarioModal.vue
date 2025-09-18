<script setup>
import { ref, watchEffect } from 'vue';
import { useToast } from 'vue-toastification';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const props = defineProps({
    show: { type: Boolean, default: false },
    usuario: { type: Object, default: null }
});
const emit = defineEmits(['close', 'usuarioActualizado']);

const toast = useToast();
const db = getFirestore();
const formData = ref({});
const isSaving = ref(false);

// Llena el formulario cuando el modal se abre con un usuario
watchEffect(() => {
    if (props.usuario) {
        formData.value = { ...props.usuario };
    } else {
        formData.value = {};
    }
});

const handleSubmit = async () => {
    if (!formData.value.nombre_completo?.trim()) {
        return toast.error('El nombre completo no puede estar vacío.');
    }

    isSaving.value = true;
    try {
        const userDocRef = doc(db, 'usuarios', props.usuario.uid);
        await updateDoc(userDocRef, {
            nombre_completo: formData.value.nombre_completo,
            rol: formData.value.rol
        });
        toast.success('Usuario actualizado con éxito.');
        emit('usuarioActualizado');
        emit('close');
    } catch (error) {
        toast.error('Error al actualizar el usuario.');
        console.error(error);
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <Transition name="modal-fade">
        <div v-if="show" class="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div class="bg-card rounded-lg shadow-xl w-full max-w-lg transform transition-all">
                <form @submit.prevent="handleSubmit" v-if="usuario">
                    <div class="p-4 border-b border-borde">
                        <h2 class="text-xl font-bold text-texto-principal">Editar Usuario</h2>
                    </div>
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Nombre Completo</label>
                            <input v-model="formData.nombre_completo" type="text" required
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Rol</label>
                            <select v-model="formData.rol"
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
                            {{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}
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