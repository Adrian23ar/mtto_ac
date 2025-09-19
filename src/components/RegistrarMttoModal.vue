<script setup>
// src/components/RegistrarMttoModal.vue
import { ref, watch, watchEffect } from 'vue';
import { useToast } from 'vue-toastification';
import { getFirestore, doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { useAuth } from '../composables/useAuth'; // <-- Importa el composable

const props = defineProps({
    show: { type: Boolean, default: false },
    equipoId: { type: String, required: true },
    tareasDefinidas: { type: Object, required: true },
    mantenimientoExistente: { type: Object, default: null },
    programacionIdParaCompletar: { type: String, default: null }

});

const emit = defineEmits(['close']);
const { userProfile } = useAuth(); // <-- Obtén el perfil del usuario
const toast = useToast();
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

watchEffect(() => {
  if (props.show && props.mantenimientoExistente) {
    // Llenamos los campos que siempre existen o tienen un valor por defecto
    observaciones.value = props.mantenimientoExistente.observaciones_servicio || '';
    duracion.value = props.mantenimientoExistente.duracion_minutos || 30;

    // SOLO intentamos llenar los checkboxes si el objeto 'tareas_realizadas' existe
    if (props.mantenimientoExistente.tareas_realizadas) {
      const completadas = {};
      const todasLasTareas = [...props.tareasDefinidas.preventivas, ...props.tareasDefinidas.correctivas];

      todasLasTareas.forEach(tareaDefinida => {
        const preventivasExistentes = props.mantenimientoExistente.tareas_realizadas.preventivas || [];
        const correctivasExistentes = props.mantenimientoExistente.tareas_realizadas.correctivas || [];

        if (preventivasExistentes.includes(tareaDefinida.label) || correctivasExistentes.includes(tareaDefinida.label)) {
          completadas[tareaDefinida.key] = true;
        }
      });
      tareasCompletadas.value = completadas;
    }
  } else if (props.show) {
    // Si es un mantenimiento nuevo (no edición), reseteamos todo
    observaciones.value = '';
    duracion.value = 30;
    tareasCompletadas.value = {};
  }
});

const handleSubmit = async () => {
    const totalTareasSeleccionadas = Object.values(tareasCompletadas.value).filter(Boolean).length;
    const observacionEscrita = observaciones.value.trim() !== '';

    if (totalTareasSeleccionadas === 0 && !observacionEscrita) {
        toast.error('Debes seleccionar al menos una tarea o escribir una observación.');
        return;
    }

    if (isSaving.value) return;
    isSaving.value = true;

    try {
        const db = getFirestore();
        const user = auth.currentUser;
        const batch = writeBatch(db);
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

        if (props.mantenimientoExistente && props.mantenimientoExistente.id) {
            // CASO 1: Estamos EDITANDO un mantenimiento del HISTORIAL
            const mantenimientoRef = doc(db, 'mantenimientos', props.mantenimientoExistente.id);
            batch.update(mantenimientoRef, {
                duracion_minutos: duracion.value,
                observaciones_servicio: observaciones.value,
                tareas_realizadas: tareasRealizadas,
                tipo: tipoPrincipal
            });
            toast.success('¡Mantenimiento actualizado con éxito!');

        } else {
            // CASO 2: Estamos CREANDO un nuevo mantenimiento (ya sea desde cero o completando uno programado)
            const nuevoMantenimientoRef = doc(collection(db, 'mantenimientos'));
            batch.set(nuevoMantenimientoRef, {
                equipoId: props.equipoId,
                tipo: tipoPrincipal,
                duracion_minutos: duracion.value,
                observaciones_servicio: observaciones.value,
                tareas_realizadas: tareasRealizadas,
                fecha_realizado: serverTimestamp(),
                tecnico_uid: user.uid,
                tecnico_email: user.email,
                tecnico_nombre: userProfile.value?.nombre_completo || user.email
            });
            const equipoRef = doc(db, 'equipos', props.equipoId);
            const datosActualizacionEquipo = { ultimo_mantenimiento: serverTimestamp() };

            // Aquí actualizaremos solo las tareas que definimos como "críticas"
            const tareasCriticasKeys = ['cambio_baterias_termostato', 'cambio_rodamientos_condensador', 'cambio_rodamientos_motor_evaporador', 'lavado_unidad_evaporadora', 'lavado_unidad_condensadora', 'cambio_capacitor'];
            Object.keys(tareasCompletadas.value).forEach(key => {
                if (tareasCompletadas.value[key] && tareasCriticasKeys.includes(key)) {
                    datosActualizacionEquipo[`tareas_criticas.${key}`] = serverTimestamp();
                }
            });

            batch.update(equipoRef, datosActualizacionEquipo);

            if (props.programacionIdParaCompletar) {
                const programadoRef = doc(db, 'mantenimientos_programados', props.programacionIdParaCompletar);
                batch.update(programadoRef, { estado: 'Completado' });
            }

            toast.success('¡Mantenimiento registrado con éxito!');
        }
        
        
        await batch.commit();
        emit('close');

    } catch (error) {
        console.error("Error al guardar el mantenimiento: ", error);
        toast.error("Hubo un error al guardar. Intenta de nuevo.");
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div class="bg-fondo rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
            <form @submit.prevent="handleSubmit">
                <div class="p-4 border-b flex justify-between items-center">
                    <h2 class="text-xl font-bold text-texto-principal"> {{ mantenimientoExistente ? 'Actualizar Registro de Mantenimiento' : 'Registrar Nuevo Mantenimiento' }}
                    </h2>
                    <button @click="$emit('close')" type="button" class="text-gray-400 hover:text-gray-700">
                        <XMarkIcon class="h-6 w-6" />
                    </button>
                </div>

                <div class="p-6 grid grid-cols-1 gap-6">
                    <div class="space-y-3">
                        <div>
                            <button @click="toggleSection('preventivas')" type="button"
                                class="w-full flex justify-between items-center text-left p-3 bg-card hover:bg-card/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactivo transition-all">
                                <h3 class="font-semibold text-texto-principal">Mantenimiento Preventivo</h3>
                                <svg :class="{ 'rotate-180': openSection === 'preventivas' }"
                                    class="h-5 w-5 text-texto-secundario transition-transform duration-200"
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
                                        <input type="checkbox" :id="tarea.key" v-model="tareasCompletadas[tarea.key]"
                                            class="min-h-5 min-w-5 h-5 w-5 md:min-h-4 md:min-w-4 md:h-4 md:w-4 rounded border-borde text-interactivo focus:ring-interactivo">
                                        <label :for="tarea.key" class="ml-2 block text-sm text-texto-principal">{{
                                            tarea.label
                                        }}</label>
                                    </div>
                                </div>
                            </Transition>
                        </div>

                        <div>
                            <button @click="toggleSection('correctivas')" type="button"
                                class="w-full flex justify-between items-center text-left p-3 bg-card hover:bg-card/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactivo">
                                <h3 class="font-semibold text-texto-principal">Mantenimiento Correctivo</h3>
                                <svg :class="{ 'rotate-180': openSection === 'correctivas' }"
                                    class="h-5 w-5 text-texto-secundario transition-transform duration-200"
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
                                            class="h-4 w-4 rounded border-borde text-interactivo focus:ring-interactivo">
                                        <label :for="tarea.key" class="ml-2 block text-sm text-texto-principal">{{
                                            tarea.label
                                        }}</label>
                                    </div>
                                </div>
                            </Transition>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label for="duracion" class="block text-sm font-semibold text-texto-principal mb-1">Duración
                                (minutos)</label>
                            <input type="number" id="duracion" required min="1" v-model="duracion"
                                class="w-full p-2 border border-borde bg-fondo text-texto-principal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactivo rounded-md">
                        </div>
                        <div>
                            <label for="observaciones"
                                class="block text-sm font-semibold text-texto-principal mb-1">Observaciones del
                                Servicio</label>
                            <textarea id="observaciones" v-model="observaciones" rows="5"
                                class="w-full p-2 border border-borde bg-fondo text-texto-principal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-interactivo0. rounded-md"></textarea>
                        </div>
                    </div>
                </div>

                <div class="p-4 border-t border-borde flex justify-end gap-3">
                    <button @click="$emit('close')" type="button"
                        class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-texto-principal px-4 py-2 rounded-lg font-semibold text-sm transition-all">Cancelar</button>
                    <button type="submit" :disabled="isSaving"
                        class="bg-interactivo hover:bg-interactivo-dark text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:bg-gray-400 transition-all">{{
                            isSaving ? 'Guardando...' : (mantenimientoExistente ? 'Actualizar Registro' : 'Guardar Registro') }}</button>
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