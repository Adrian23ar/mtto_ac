<script setup>
// src/components/ProgramarMttoModal.vue
import { ref, watchEffect } from 'vue';
import { useToast } from 'vue-toastification';
import { getFirestore, collection, addDoc, serverTimestamp, updateDoc, doc  } from 'firebase/firestore';
import { useAuth } from '../composables/useAuth';

const props = defineProps({
    show: { type: Boolean, default: false },
    equipoId: { type: String, required: true },
    numeroHabitacion: { type: String, required: true },
    programacionExistente: { type: Object, default: null }
});
const emit = defineEmits(['close']);

const toast = useToast();
const { userProfile } = useAuth();
const db = getFirestore();

const fechaProgramada = ref('');
const notas = ref('');
const isSaving = ref(false);

// Resetea el formulario cuando se abre el modal
watchEffect(() => {
    if (props.show) {
        if (props.programacionExistente) {
            // MODO EDICIÓN: Pre-llenamos el formulario
            const fecha = props.programacionExistente.fecha_programada.toDate();
            fechaProgramada.value = fecha.toISOString().split('T')[0];
            notas.value = props.programacionExistente.notas;
        } else {
            // MODO CREACIÓN: Reseteamos el formulario
            fechaProgramada.value = new Date().toISOString().split('T')[0];
            notas.value = '';
        }
        isSaving.value = false;
    }
});

const handleSubmit = async () => {
    // Validación
    if (!fechaProgramada.value) {
        toast.error('Debes seleccionar una fecha para la programación.');
        return;
    }
    if (new Date(fechaProgramada.value) < new Date().setHours(0, 0, 0, 0)) {
        toast.error('No puedes programar un mantenimiento en una fecha pasada.');
        return;
    }

    isSaving.value = true;
    try {
        if (props.programacionExistente) {
            // MODO EDICIÓN: Actualizamos el documento
            const docRef = doc(db, 'mantenimientos_programados', props.programacionExistente.id);
            await updateDoc(docRef, {
                fecha_programada: new Date(`${fechaProgramada.value}T12:00:00`),
                notas: notas.value
            });
            toast.success('¡Programación actualizada con éxito!');
        } else {
            await addDoc(collection(db, 'mantenimientos_programados'), {
                equipoId: props.equipoId,
                numero_habitacion: props.numeroHabitacion,
                fecha_programada: new Date(`${fechaProgramada.value}T12:00:00`),
                notas: notas.value,
                estado: 'Programado', // Estados pueden ser: Programado, Completado, Cancelado
                creado_por_uid: userProfile.value.uid,
                creado_por_nombre: userProfile.value.nombre_completo,
                fecha_creacion: serverTimestamp(),
            });

            toast.success(`Mantenimiento para la habitación ${props.numeroHabitacion} programado con éxito.`);
        }
        emit('close');
    } catch (error) {
        console.error("Error al guardar programación:", error);
        toast.error("Hubo un error al guardar la programación.");
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <Transition name="modal-fade">
        <div v-if="show" class="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div class="bg-card rounded-lg shadow-xl w-full max-w-lg transform transition-all">
                <form @submit.prevent="handleSubmit">
                    <div class="p-4 border-b border-borde">
                        <h2 class="text-xl font-bold text-texto-principal">
                            {{ programacionExistente ? 'Editar Programación' : 'Programar Mantenimiento' }}

                        </h2>
                    </div>

                    <div class="p-6 space-y-4">
                        <div>
                            <label for="fecha-programada"
                                class="block text-sm font-semibold text-texto-principal mb-1">Fecha Programada</label>
                            <input type="date" id="fecha-programada" v-model="fechaProgramada" required
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal">
                        </div>
                        <div>
                            <label for="notas-programacion"
                                class="block text-sm font-semibold text-texto-principal mb-1">Notas (Opcional)</label>
                            <textarea id="notas-programacion" v-model="notas" rows="4"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal"
                                placeholder="Ej: Revisar ruido en el ventilador..."></textarea>
                        </div>
                    </div>

                    <div class="p-4 bg-fondo flex justify-end gap-3 rounded-b-lg">
                        <button @click="$emit('close')" type="button"
                            class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-texto-principal px-4 py-2 rounded-lg font-semibold text-sm transition-all">Cancelar</button>
                        <button type="submit" :disabled="isSaving"
                            class="bg-interactivo hover:bg-interactivo-dark text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:bg-gray-400 transition-all">
                            {{ isSaving ? 'Guardando...' : (programacionExistente ? 'Actualizar' : 'Programar') }}

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