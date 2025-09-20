<script setup>
import { ref, onMounted } from 'vue';
import { getFirestore, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from 'vue-toastification';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '@heroicons/vue/24/outline';

const toast = useToast();
const db = getFirestore();

const tareas = ref({ preventivas: [], correctivas: [] });
const cargando = ref(true);

// Variables para el formulario de agregar/editar
const showModal = ref(false);
const esEdicion = ref(false);
const tipoTarea = ref(''); // 'preventivas' o 'correctivas'
const tareaActual = ref({ key: '', label: '' });
const indiceActual = ref(-1);

onMounted(() => {
    const docRef = doc(db, 'configuracion', 'tareas');
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            tareas.value = docSnap.data();
        } else {
            toast.error("No se encontró el documento de configuración de tareas.");
        }
        cargando.value = false;
    });
});

const abrirModalNuevo = (tipo) => {
    esEdicion.value = false;
    tipoTarea.value = tipo;
    tareaActual.value = { key: '', label: '' };
    showModal.value = true;
};

const abrirModalEditar = (tarea, index, tipo) => {
    esEdicion.value = true;
    tipoTarea.value = tipo;
    // Creamos una copia para no modificar el original directamente
    tareaActual.value = { ...tarea };
    indiceActual.value = index;
    showModal.value = true;
};

const guardarTarea = async () => {
    if (!tareaActual.value.key.trim() || !tareaActual.value.label.trim()) {
        return toast.error("El Key y el Label son obligatorios.");
    }

    try {
        const docRef = doc(db, 'configuracion', 'tareas');
        if (esEdicion.value) {
            // Para editar, necesitamos reemplazar todo el array
            const tareasActualizadas = [...tareas.value[tipoTarea.value]];
            tareasActualizadas[indiceActual.value] = tareaActual.value;
            await updateDoc(docRef, {
                [tipoTarea.value]: tareasActualizadas
            });
            toast.success("Tarea actualizada con éxito.");
        } else {
            // Para agregar, usamos arrayUnion
            await updateDoc(docRef, {
                [tipoTarea.value]: arrayUnion(tareaActual.value)
            });
            toast.success("Tarea agregada con éxito.");
        }
        showModal.value = false;
    } catch (error) {
        toast.error("Error al guardar la tarea.");
        console.error(error);
    }
};

const eliminarTarea = async (tareaAEliminar, tipo) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la tarea "${tareaAEliminar.label}"?`)) {
        return;
    }
    try {
        const docRef = doc(db, 'configuracion', 'tareas');
        await updateDoc(docRef, {
            [tipo]: arrayRemove(tareaAEliminar)
        });
        toast.success("Tarea eliminada con éxito.");
    } catch (error) {
        toast.error("Error al eliminar la tarea.");
        console.error(error);
    }
};
</script>

<template>
    <div>
        <h2 class="text-xl font-bold text-texto-principal mb-4">Gestión de Tareas de Mantenimiento</h2>
        <p class="text-sm text-texto-secundario mb-6">Añade, edita o elimina las tareas que los técnicos pueden
            seleccionar al registrar un mantenimiento.</p>

        <div v-if="cargando">Cargando tareas...</div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold text-texto-principal">Tareas Preventivas</h3>
                    <button @click="abrirModalNuevo('preventivas')"
                        class="flex items-center gap-2 text-sm text-interactivo font-semibold">
                        <PlusCircleIcon class="h-5 w-5" />
                        Añadir Tarea
                    </button>
                </div>
                <ul class="space-y-2">
                    <li v-for="(tarea, index) in tareas.preventivas" :key="tarea.key"
                        class="bg-fondo p-3 rounded-md flex justify-between items-center">
                        <div>
                            <p class="font-medium text-texto-principal">{{ tarea.label }}</p>
                            <p class="text-xs text-texto-secundario">Key: {{ tarea.key }}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <button @click="abrirModalEditar(tarea, index, 'preventivas')"
                                class="text-texto-secundario hover:text-interactivo">
                                <PencilIcon class="h-5 w-5" />
                            </button>
                            <button @click="eliminarTarea(tarea, 'preventivas')"
                                class="text-texto-secundario hover:text-status-rojo">
                                <TrashIcon class="h-5 w-5" />
                            </button>
                        </div>
                    </li>
                </ul>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold text-texto-principal">Tareas Correctivas</h3>
                    <button @click="abrirModalNuevo('correctivas')"
                        class="flex items-center gap-2 text-sm text-interactivo font-semibold">
                        <PlusCircleIcon class="h-5 w-5" />
                        Añadir Tarea
                    </button>
                </div>
                <ul class="space-y-2">
                    <li v-for="(tarea, index) in tareas.correctivas" :key="tarea.key"
                        class="bg-fondo p-3 rounded-md flex justify-between items-center">
                        <div>
                            <p class="font-medium text-texto-principal">{{ tarea.label }}</p>
                            <p class="text-xs text-texto-secundario">Key: {{ tarea.key }}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <button @click="abrirModalEditar(tarea, index, 'correctivas')"
                                class="text-texto-secundario hover:text-interactivo">
                                <PencilIcon class="h-5 w-5" />
                            </button>
                            <button @click="eliminarTarea(tarea, 'correctivas')"
                                class="text-texto-secundario hover:text-status-rojo">
                                <TrashIcon class="h-5 w-5" />
                            </button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>

        <Transition name="modal-fade">
            <div v-if="showModal"
                class="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                <div class="bg-card rounded-lg shadow-xl w-full max-w-lg">
                    <form @submit.prevent="guardarTarea">
                        <div class="p-4 border-b border-borde">
                            <h2 class="text-xl font-bold text-texto-principal">{{ esEdicion ? 'Editar' : 'Nueva' }}
                                Tarea</h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label class="block text-sm font-semibold text-texto-principal mb-1">Key (identificador
                                    único, sin espacios)</label>
                                <input v-model="tareaActual.key" type="text" required :disabled="esEdicion"
                                    class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario disabled:bg-gray-200 dark:disabled:bg-gray-700">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-texto-principal mb-1">Label (texto a
                                    mostrar)</label>
                                <input v-model="tareaActual.label" type="text" required
                                    class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal">
                            </div>
                        </div>
                        <div class="p-4 bg-fondo flex justify-end gap-3 rounded-b-lg">
                            <button @click="showModal = false" type="button"
                                class="bg-card text-texto-principal px-4 py-2 rounded-lg font-semibold text-sm">Cancelar</button>
                            <button type="submit"
                                class="bg-interactivo text-white px-4 py-2 rounded-lg font-semibold text-sm">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: all 0.2s ease-out;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>