<script setup>
// src/components/RegistrarMttoModal.vue
import { ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { getFirestore, doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase/config';

const props = defineProps({
    show: { type: Boolean, default: false },
    equipoId: { type: String, required: true },
    tareasDefinidas: { type: Object, required: true }
});
const emit = defineEmits(['close']);

const toast = useToast();
const tipoMantenimiento = ref('Preventivo');
const duracion = ref(30);
const observaciones = ref('');
const tareasCompletadas = ref({});
const isSaving = ref(false);
const openSection = ref('preventivas'); // Esta ya la tienes

const toggleSection = (section) => {
    // Si la sección clickeada ya está abierta, la cerramos. Si no, la abrimos.
    openSection.value = openSection.value === section ? null : section;
};

watch(() => props.show, (newValue) => {
    if (newValue) {
        tareasCompletadas.value = {};
        isSaving.value = false;
    }
});

const handleSubmit = async () => {
    // --- NUEVO BLOQUE DE VALIDACIÓN ---
    const totalTareasSeleccionadas = Object.values(tareasCompletadas.value).filter(Boolean).length;
    const observacionEscrita = observaciones.value.trim() !== '';

    if (totalTareasSeleccionadas === 0 && !observacionEscrita) {
        toast.error('Debes seleccionar al menos una tarea o escribir una observación.');
        return; // Detiene la ejecución de la función aquí
    }
    // --- FIN DEL BLOQUE DE VALIDACIÓN ---

    if (isSaving.value) return;
    isSaving.value = true;

    try {
        const db = getFirestore();
        const user = auth.currentUser;
        const batch = writeBatch(db);

        const mantenimientoRef = doc(collection(db, 'mantenimientos'));

        // Construimos el nuevo objeto de tareas realizadas
        const tareasRealizadas = {
            preventivas: props.tareasDefinidas.preventivas
                .filter(t => tareasCompletadas.value[t.key])
                .map(t => t.label),
            correctivas: props.tareasDefinidas.correctivas
                .filter(t => tareasCompletadas.value[t.key])
                .map(t => t.label)
        };

        // Determinamos el tipo principal basado en las tareas realizadas
        let tipoPrincipal = 'Preventivo';
        if (tareasRealizadas.correctivas.length > 0) {
            tipoPrincipal = 'Correctivo';
        }

        batch.set(mantenimientoRef, {
            equipoId: props.equipoId,
            tipo: tipoPrincipal, // Guardamos un tipo principal para el resumen
            duracion_minutos: duracion.value,
            observaciones_servicio: observaciones.value,
            tareas_realizadas: tareasRealizadas, // Guardamos el objeto completo
            fecha_realizado: serverTimestamp(),
            tecnico_uid: user.uid,
            tecnico_email: user.email
        });

        const equipoRef = doc(db, 'equipos', props.equipoId);
        const datosActualizacionEquipo = {
            ultimo_mantenimiento: serverTimestamp(),
        };

        // Aquí actualizaremos solo las tareas que definimos como "críticas"
        const tareasCriticasKeys = ['cambio_baterias_termostato', 'cambio_rodamientos_condensador', 'cambio_rodamientos_motor_evaporador', 'lavado_unidad_evaporadora', 'lavado_unidad_condensadora', 'cambio_capacitor'];
        Object.keys(tareasCompletadas.value).forEach(key => {
            if (tareasCompletadas.value[key] && tareasCriticasKeys.includes(key)) {
                datosActualizacionEquipo[`tareas_criticas.${key}`] = serverTimestamp();
            }
        });

        batch.update(equipoRef, datosActualizacionEquipo);

        await batch.commit();
        toast.success('¡Mantenimiento registrado con éxito!'); // <-- REEMPLAZO
        emit('close');

    } catch (error) {
        console.error("Error al guardar el mantenimiento: ", error);
        toast.error("Hubo un error al guardar. Intenta de nuevo."); // <-- REEMPLAZO
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
            <form @submit.prevent="handleSubmit">
                <div class="p-4 border-b flex justify-between items-center">
                    <h2 class="text-xl font-bold text-gray-800">Registrar Nuevo Mantenimiento</h2>
                    <button @click="$emit('close')" type="button"
                        class="text-gray-400 hover:text-gray-700">&times;</button>
                </div>

                <div class="p-6 grid grid-cols-1 gap-6">
                    <div class="space-y-3">
                        <div>
                            <button @click="toggleSection('preventivas')" type="button"
                                class="w-full flex justify-between items-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactivo">
                                <h3 class="font-semibold text-gray-800">Mantenimiento Preventivo</h3>
                                <svg :class="{ 'rotate-180': openSection === 'preventivas' }"
                                    class="h-5 w-5 text-gray-600 transition-transform duration-200"
                                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clip-rule="evenodd" />
                                </svg>
                            </button>

                            <Transition name="accordion">
                                <div v-if="openSection === 'preventivas'" class="py-3 px-2 space-y-2">
                                    <div v-for="tarea in tareasDefinidas.preventivas" :key="tarea.key"
                                        class="flex items-center">
                                        <input type="checkbox" :id="tarea.key" v-model="tareasCompletadas[tarea.key] "
                                            class="h-4 w-4 rounded border-gray-300 text-interactivo focus:ring-interactivo">
                                        <label :for="tarea.key" class="ml-2 block text-sm text-gray-900">{{ tarea.label
                                            }}</label>
                                    </div>
                                </div>
                            </Transition>
                        </div>

                        <div>
                            <button @click="toggleSection('correctivas')" type="button"
                                class="w-full flex justify-between items-center text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactivo">
                                <h3 class="font-semibold text-gray-800">Mantenimiento Correctivo</h3>
                                <svg :class="{ 'rotate-180': openSection === 'correctivas' }"
                                    class="h-5 w-5 text-gray-600 transition-transform duration-200"
                                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clip-rule="evenodd" />
                                </svg>
                            </button>

                            <Transition name="accordion">
                                <div v-if="openSection === 'correctivas'" class="py-3 px-2 space-y-2">
                                    <div v-for="tarea in tareasDefinidas.correctivas" :key="tarea.key"
                                        class="flex items-center">
                                        <input type="checkbox" :id="tarea.key" v-model="tareasCompletadas[tarea.key]"
                                            class="h-4 w-4 rounded border-gray-300 text-interactivo focus:ring-interactivo">
                                        <label :for="tarea.key" class="ml-2 block text-sm text-gray-900">{{ tarea.label
                                        }}</label>
                                    </div>
                                </div>
                            </Transition>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label for="duracion" class="block text-sm font-semibold text-gray-700 mb-1">Duración
                                (minutos)</label>
                            <input type="number" id="duracion" required min="1" v-model="duracion" class="w-full p-2 border rounded-md">
                        </div>
                        <div>
                            <label for="observaciones"
                                class="block text-sm font-semibold text-gray-700 mb-1">Observaciones del
                                Servicio</label>
                            <textarea id="observaciones" v-model="observaciones" rows="8"
                                class="w-full p-2 border rounded-md"></textarea>
                        </div>
                    </div>
                </div>

                <div class="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button @click="$emit('close')" type="button"
                        class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm">Cancelar</button>
                    <button type="submit" :disabled="isSaving"
                        class="bg-interactivo text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:bg-gray-400">{{
                            isSaving ? 'Guardando...' : 'Guardar Registro' }}</button>
                </div>
            </form>
        </div>
    </div>
</template>

<style>
/* Define la duración y el tipo de transición para entrar y salir */
.accordion-enter-active,
.accordion-leave-active {
    transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out;
}

/* Estado inicial (cerrado): altura 0 y transparente */
.accordion-enter-from,
.accordion-leave-to {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
}

/* Estado final (abierto): altura máxima y opaco */
.accordion-enter-to,
.accordion-leave-from {
    /* Un valor suficientemente grande para que quepa todo tu contenido */
    max-height: 500px;
    opacity: 1;
    overflow: hidden;
}
</style>