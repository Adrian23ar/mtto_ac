<script setup>
import { ref, onMounted } from 'vue';
import { getFirestore, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from 'vue-toastification';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '@heroicons/vue/24/outline';
import SkeletonLoader from '../../components/SkeletonLoader.vue'; // <-- 1. Importar
import ConfirmacionModal from '../../components/ConfirmacionModal.vue';

const toast = useToast();
const db = getFirestore();

const tareas = ref({ preventivas: [], correctivas: [] });
const cargando = ref(true);

const showModal = ref(false);
const esEdicion = ref(false);
const tipoTarea = ref('');
const tareaActual = ref({ key: '', label: '' });
const indiceActual = ref(-1);
const isSaving = ref(false);

const confirmacionState = ref({ show: false, titulo: '', mensaje: '', onConfirm: () => { } });

const generarKey = (label) => {
    if (!label) return '';
    return label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, '_')
        .replace(/[^\w-]+/g, '');
};

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
    tareaActual.value = { ...tarea };
    indiceActual.value = index;
    showModal.value = true;
};

const guardarTarea = async () => {
    const label = tareaActual.value.label.trim();
    if (!label) {
        return toast.error("El nombre de la tarea es obligatorio.");
    }

    // Generamos el nuevo key a partir del label
    const nuevoKey = generarKey(label);

    // --- Verificación de duplicados ---
    const listaDeTareas = tareas.value[tipoTarea.value];
    const keyExiste = listaDeTareas.some((tarea, index) => {
        // Si estamos editando, excluimos la tarea actual de la verificación
        if (esEdicion.value && index === indiceActual.value) {
            return false;
        }
        return tarea.key === nuevoKey;
    });

    if (keyExiste) {
        return toast.error(`Ya existe una tarea con el key generado ('${nuevoKey}'). Elige un nombre diferente.`);
    }

    isSaving.value = true;


    const tareaParaGuardar = { key: nuevoKey, label: label };

    try {
        const docRef = doc(db, 'configuracion', 'tareas');
        if (esEdicion.value) {
            // Para editar, reemplazamos el array completo en Firestore
            const tareasActualizadas = [...listaDeTareas];
            tareasActualizadas[indiceActual.value] = tareaParaGuardar;
            await updateDoc(docRef, { [tipoTarea.value]: tareasActualizadas });
            isSaving.value = false;

            toast.success("Tarea actualizada con éxito.");
        } else {
            // Para agregar, usamos arrayUnion para añadir el nuevo elemento
            await updateDoc(docRef, { [tipoTarea.value]: arrayUnion(tareaParaGuardar) });
            isSaving.value = false;
            toast.success("Tarea agregada con éxito.");
        }
        showModal.value = false;
    } catch (error) {
        isSaving.value = false;
        toast.error("Error al guardar la tarea.");
        console.error(error);
    }
};

const iniciarEliminacion = (tareaAEliminar, tipo) => {
    confirmacionState.value = {
        show: true,
        titulo: 'Confirmar Eliminación',
        mensaje: `¿Estás seguro de que quieres eliminar la tarea "${tareaAEliminar.label}"? Esta acción no se puede deshacer.`,
        onConfirm: async () => {
            try {
                const docRef = doc(db, 'configuracion', 'tareas');
                await updateDoc(docRef, { [tipo]: arrayRemove(tareaAEliminar) });
                toast.success("Tarea eliminada con éxito.");
            } catch (error) {
                toast.error("Error al eliminar la tarea.");
                console.error(error);
            }
        }
    };
};

const manejarConfirmacion = () => {
    if (typeof confirmacionState.value.onConfirm === 'function') {
        confirmacionState.value.onConfirm();
    }
    confirmacionState.value.show = false;
};
</script>

<template>
    <div>
        <h2 class="text-xl font-bold text-texto-principal mb-1">Gestión de Tareas de Mantenimiento</h2>
        <p class="text-sm text-texto-secundario mb-6">Añade, edita o elimina las tareas que los técnicos pueden
            seleccionar al registrar un mantenimiento.</p>

        <div v-if="cargando" class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div v-for="i in 2" :key="i" class="space-y-3">
                <SkeletonLoader width="60%" height="28px" />
                <div v-for="n in 3" :key="n" class="bg-fondo p-3 rounded-md">
                    <SkeletonLoader width="80%" />
                    <SkeletonLoader width="40%" class="mt-2" />
                </div>
            </div>
        </div>
        <div v-else>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-lg font-semibold text-texto-principal">Tareas Preventivas</h3>
                        <button @click="abrirModalNuevo('preventivas')"
                            class="flex items-center gap-2 text-sm text-interactivo font-semibold">
                            <PlusCircleIcon class="h-5 w-5" />
                            Añadir Tarea
                        </button>
                    </div>
                    <div v-if="tareas.preventivas.length === 0"
                        class="text-center text-sm text-texto-secundario bg-fondo p-4 rounded-md">
                        <p>No hay tareas preventivas.</p>
                    </div>
                    <ul v-else class="space-y-2">
                        <li v-for="(tarea, index) in tareas.preventivas" :key="tarea.key"
                            class="bg-fondo p-3 rounded-md flex justify-between items-center">
                            <div>
                                <p class="font-medium text-texto-principal">{{ tarea.label }}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <button @click="abrirModalEditar(tarea, index, 'preventivas')"
                                    class="text-texto-secundario hover:text-interactivo">
                                    <PencilIcon class="h-5 w-5" />
                                </button>
                                <button @click="iniciarEliminacion(tarea, 'preventivas')"
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
                    <div v-if="tareas.correctivas.length === 0"
                        class="text-center text-sm text-texto-secundario bg-fondo p-4 rounded-md">
                        <p>No hay tareas correctivas.</p>
                    </div>
                    <ul v-else class="space-y-2">
                        <li v-for="(tarea, index) in tareas.correctivas" :key="tarea.key"
                            class="bg-fondo p-3 rounded-md flex justify-between items-center">
                            <div>
                                <p class="font-medium text-texto-principal">{{ tarea.label }}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <button @click="abrirModalEditar(tarea, index, 'correctivas')"
                                    class="text-texto-secundario hover:text-interactivo">
                                    <PencilIcon class="h-5 w-5" />
                                </button>
                                <button @click="iniciarEliminacion(tarea, 'correctivas')"
                                    class="text-texto-secundario hover:text-status-rojo">
                                    <TrashIcon class="h-5 w-5" />
                                </button>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <ConfirmacionModal :show="confirmacionState.show" :titulo="confirmacionState.titulo"
            :mensaje="confirmacionState.mensaje" @close="confirmacionState.show = false"
            @confirm="manejarConfirmacion" />

        <Transition name="modal-fade">
            <div v-if="showModal"
                class="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                <div class="bg-card rounded-lg shadow-xl w-full max-w-lg">
                    <form @submit.prevent="guardarTarea">
                        <div class="p-4 border-b border-borde">
                            <h2 class="text-xl font-bold text-texto-principal">{{ esEdicion ? 'Editar' : 'Nueva' }}
                                Tarea</h2>
                        </div>
                        <div class="p-6">
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Nombre de la
                                Tarea</label>
                            <input v-model="tareaActual.label" type="text" required
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal">
                        </div>
                        <div class="p-4 bg-fondo flex justify-end gap-3 rounded-b-lg">
                            <button @click="showModal = false" type="button"
                                class="bg-gray-200 dark:bg-gray-700 text-texto-principal px-4 py-2 rounded-lg font-semibold text-sm">Cancelar</button>
                            <button type="submit" :disabled="isSaving"
                                class="bg-interactivo text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:bg-gray-400">
                                {{ isSaving ? 'Guardando...' : 'Guardar' }}
                            </button>
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