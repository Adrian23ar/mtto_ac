<script setup>
// src/views/DetalleEquipo.vue
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import RegistrarMttoModal from '../components/RegistrarMttoModal.vue';
import HistorialCard from '../components/HistorialCard.vue';
import ConfirmacionModal from '../components/ConfirmacionModal.vue';

import { PencilSquareIcon, CheckIcon, XMarkIcon, Cog6ToothIcon, DocumentTextIcon, CalendarDaysIcon } from '@heroicons/vue/24/outline';

// --- (refs existentes) ---
const toast = useToast();
const route = useRoute();
const router = useRouter();
const equipo = ref(null);
const cargando = ref(true);
const showModal = ref(false);
const db = getFirestore();
const equipoId = route.params.id;
const showConfirmModal = ref(false);


// --- 2. NUEVAS VARIABLES DE ESTADO PARA LA EDICIÓN ---
const isEditingInfo = ref(false);
const isEditingObservaciones = ref(false);
const isEditingProgramacion = ref(false);

// Objeto temporal para guardar los datos del formulario mientras se edita
const formData = ref({});

const historialMantenimientos = ref([]);

onMounted(() => {
    // --- Esta parte para obtener los datos del equipo se mantiene igual ---
    const docRef = doc(db, 'equipos', equipoId);
    onSnapshot(docRef, (docSnap) => { // Usamos onSnapshot para que los datos del equipo también se actualicen en tiempo real
        if (docSnap.exists()) {
            equipo.value = { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No se encontró el documento!");
        }
        cargando.value = false;
    });

    // --- 3. NUEVA CONSULTA PARA OBTENER EL HISTORIAL ---
    // Creamos una consulta a la colección 'mantenimientos'
    const historialQuery = query(
        collection(db, "mantenimientos"),
        where("equipoId", "==", equipoId), // donde el equipoId coincida
        orderBy("fecha_realizado", "desc") // ordenado por fecha, el más reciente primero
    );

    // Usamos onSnapshot para escuchar los cambios en el historial en tiempo real
    onSnapshot(historialQuery, (querySnapshot) => {
        const historicoTemp = [];
        querySnapshot.forEach((doc) => {
            historicoTemp.push({ id: doc.id, ...doc.data() });
        });
        historialMantenimientos.value = historicoTemp;
    });
});

const startEditing = (section) => {
    // Creamos una copia de los datos actuales para no modificar el original directamente
    formData.value = { ...equipo.value };

    if (section === 'info') isEditingInfo.value = true;
    if (section === 'observaciones') isEditingObservaciones.value = true;
    if (section === 'programacion') isEditingProgramacion.value = true;
};
const cancelEditing = () => {
    isEditingInfo.value = false;
    isEditingObservaciones.value = false;
    isEditingProgramacion.value = false;
    formData.value = {}; // Limpiamos los datos temporales
};
const saveChanges = async () => {
    if (!formData.value.ubicacion_condensadora || formData.value.ubicacion_condensadora.trim() === '') {
        toast.error('El campo "Ubicación" no puede estar vacío.');
        return;
    }
    if (!formData.value.intervalo_mantenimiento_dias || formData.value.intervalo_mantenimiento_dias <= 0) {
        toast.error('El intervalo de mantenimiento debe ser un número mayor a 0.');
        return;
    }
    try {
        const docRef = doc(db, 'equipos', equipoId);
        await updateDoc(docRef, formData.value);
        equipo.value = { ...formData.value };
        cancelEditing();
        toast.success('¡Equipo actualizado con éxito!'); // <-- REEMPLAZO
    } catch (error) {
        console.error("Error al actualizar el equipo: ", error);
        toast.error("Hubo un error al guardar los cambios."); // <-- REEMPLAZO
    }
};

const toggleFueraDeServicio = () => {
    if (!equipo.value) return;
    showConfirmModal.value = true;
};

// 4. Crea una NUEVA función que contenga la lógica de guardado.
//    Esta función será llamada por el modal cuando el usuario confirme.
const ejecutarToggleFueraDeServicio = async () => {
    showConfirmModal.value = false; // Cerramos el modal
    try {
        const docRef = doc(db, 'equipos', equipoId);
        const nuevoEstado = !equipo.value.fuera_de_servicio;
        await updateDoc(docRef, { fuera_de_servicio: nuevoEstado });
        toast.success('Estado de servicio actualizado.');
    } catch (error) {
        console.error("Error al actualizar el estado de servicio:", error);
        toast.error("Hubo un error al actualizar el estado.");
    }
};

const tareasDefinidas = ref({
    preventivas: [
        { key: 'lavado_serpentin_evaporador', label: 'Lavado de serpentin evaporador' },
        { key: 'limpieza_filtros_aire', label: 'Limpieza de filtros de aire' },
        { key: 'limpieza_bandeja_drenaje', label: 'Limpieza de bandeja de drenaje' },
        { key: 'limpieza_tuberia_drenaje', label: 'Soplado o limpieza de tubería de drenaje' },
        { key: 'mantenimiento_motor_evaporador', label: 'Mantenimiento al motor del evaporador (Limpieza)' },
        { key: 'limpieza_carcasa_rejillas', label: 'Limpieza de carcasa y rejillas' },
        { key: 'lavado_serpentin_condensador', label: 'Lavado de serpentin condensador' },
        { key: 'mantenimiento_motor_condensador', label: 'Mantenimiento al motor del condensador' },
        { key: 'ajuste_conexiones_electricas', label: 'Revisión y ajuste de conexiones eléctricas' },
        { key: 'medicion_amperaje_compresor', label: 'Medición de amperaje del compresor' },
        { key: 'medicion_amperaje_motor_evaporador', label: 'Medición de amperaje del Motor Evaporador' },
        { key: 'medicion_amperaje_motor_condensador', label: 'Medición de amperaje del Motor Condensador' },
        { key: 'verificacion_presiones_gas', label: 'Verificación de presiones de gas (Baja/Alta)' },
    ],
    correctivas: [

        { key: 'correccion_fuga_gas', label: 'Corrección de fuga de gas' },
        { key: 'recarga_gas', label: 'Recarga de gas refrigerante' },
        { key: 'cambio_capacitor_arranque', label: 'Cambio de capacitor de arranque/marcha' },
        { key: 'cambio_capacitor_ventilador', label: 'Cambio de capacitor del ventilador' },
        { key: 'reemplazo_contactor', label: 'Reemplazo de contactor o relé' },
        { key: 'reemplazo_protector_termico', label: 'Reemplazo de protector térmico' },
        { key: 'reemplazo_motor_evaporador', label: 'Reemplazo de motor del evaporador' },
        { key: 'reemplazo_motor_condensador', label: 'Reemplazo de motor del condensador' },
        { key: 'reemplazo_rodamientos', label: 'Reemplazo de rodamientos de motor' },
    ]
});

const opcionesCapacidad = ref([
    '12,000 BTU',
    '18,000 BTU',
    '24,000 BTU',
    '36,000 BTU',
    '48,000 BTU',
    '5 Toneladas',
    '7.5 Toneladas',
    '10 Toneladas'
]);
const formatDate = (dateInput) => {
    // Si no hay fecha de entrada, devolvemos 'N/A'
    if (!dateInput) return 'N/A';

    let date; // Esta variable guardará un objeto de fecha estándar de JS

    // Comprobamos si el input es un Timestamp de Firebase (si tiene el método .toDate)
    if (typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
    } else {
        // Si no, asumimos que ya es un objeto de fecha estándar
        date = dateInput;
    }

    // El resto de la función es igual
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
};

const estadoGeneral = computed(() => {
    if (!equipo.value) return { texto: 'Cargando...', proximo: null };
    if (equipo.value.fuera_de_servicio) return { texto: 'Fuera de Servicio', proximo: null };
    if (!equipo.value.ultimo_mantenimiento) return { texto: 'Mantenimiento Pendiente', proximo: null };

    const fechaUltimo = equipo.value.ultimo_mantenimiento.toDate();
    const fechaActual = new Date();
    const intervalo = equipo.value.intervalo_mantenimiento_dias || 90;
    const diasDesdeMantenimiento = (fechaActual - fechaUltimo) / (1000 * 60 * 60 * 24);

    const fechaProximo = new Date(fechaUltimo);
    fechaProximo.setDate(fechaProximo.getDate() + intervalo);

    if (diasDesdeMantenimiento > intervalo) return { texto: 'Mantenimiento Vencido', proximo: fechaProximo };
    if (diasDesdeMantenimiento > (intervalo * 0.8)) return { texto: 'Mantenimiento Próximo', proximo: fechaProximo };
    return { texto: 'Mantenimiento al Día', proximo: fechaProximo };
});


onMounted(async () => {
    const docRef = doc(db, 'equipos', equipoId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        equipo.value = { id: docSnap.id, ...docSnap.data() };
    }
    cargando.value = false;
});
</script>

<template>
    <div v-if="cargando" class="text-center">Cargando...</div>

    <div v-else-if="equipo" class="pb-24 px-2">
        <div class="space-y-6">
            <div class="flex items-center gap-3">
                <button @click="router.back()"
                    class="text-gray-600 hover:text-gray-900 text-2xl font-bold">&larr;</button>
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Habitación {{ equipo.numero_habitacion }}</h1>
                    <p class="text-sm text-gray-500">{{ estadoGeneral.texto }}</p>
                </div>
            </div>

            <div class="bg-white p-4 rounded-lg shadow-sm">
                <div class="flex justify-between items-center">
                    <h2 class="font-semibold text-gray-700">Estado de Servicio</h2>
                    <button @click="toggleFueraDeServicio" class="text-sm px-3 py-1 rounded-md transition-colors"
                        :class="equipo.fuera_de_servicio ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
                        {{ equipo.fuera_de_servicio ? 'Quitar Fuera de Servicio' : 'Poner Fuera de Servicio' }}
                    </button>
                </div>
                <p v-if="equipo.fuera_de_servicio" class="text-sm text-red-600 mt-2">
                    Este equipo se encuentra actualmente <span class="font-semibold">Fuera de Servicio</span>.
                </p>
                <p v-else class="text-sm text-gray-500 mt-2">
                    El equipo se encuentra operativo.
                </p>
            </div>

            <div class="bg-white p-4 rounded-lg shadow-sm">
                <div v-if="!isEditingInfo">
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                            <Cog6ToothIcon class="h-5 w-5 text-gray-500" />
                            Información del Equipo
                        </h2>
                        <button @click="startEditing('info')" class="text-gray-400 hover:text-gray-600 p-1">
                            <PencilSquareIcon class="h-5 w-5" />
                        </button>
                    </div>
                    <div class="text-sm space-y-2 text-gray-600">
                        <p><span class="font-semibold text-gray-800">Ubicación:</span> {{ equipo.ubicacion_condensadora
                            }}
                        </p>
                        <p><span class="font-semibold text-gray-800">Capacidad:</span> {{ equipo.capacidad_btu }}</p>
                        <p><span class="font-semibold text-gray-800">Compresor:</span> {{ equipo.estado_compresor }}</p>
                    </div>
                </div>

                <div v-else>
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                            <Cog6ToothIcon class="h-5 w-5 text-gray-500" />
                            Información del Equipo
                        </h2>
                        <div class="flex gap-2">
                            <button @click="saveChanges" class="text-green-500 hover:text-green-700 p-1">
                                <CheckIcon class="h-5 w-5" />
                            </button>
                            <button @click="cancelEditing" class="text-red-500 hover:text-red-700 p-1">
                                <XMarkIcon class="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div class="text-sm space-y-3">
                        <div>
                            <label class="font-semibold text-gray-800">Ubicación</label>
                            <input v-model="formData.ubicacion_condensadora" type="text" required
                                class="w-full p-2 mt-1 border rounded-md">
                        </div>
                        <div>
                            <label class="font-semibold text-gray-800">Capacidad</label>
                            <select v-model="formData.capacidad_btu" required class="w-full p-2 mt-1 border rounded-md">
                                <option v-for="opcion in opcionesCapacidad" :key="opcion" :value="opcion">
                                    {{ opcion }}
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="font-semibold text-gray-800">Compresor</label>
                            <select v-model="formData.estado_compresor" class="w-full p-2 mt-1 border rounded-md">
                                <option>Bueno</option>
                                <option>Regular</option>
                                <option>Deficiente</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-4 rounded-lg shadow-sm">
                <div v-if="!isEditingObservaciones">
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                            <DocumentTextIcon class="h-5 w-5" />
                            Observaciones Permanentes
                        </h2>
                        <button @click="startEditing('observaciones')" class="text-gray-400 hover:text-gray-600 p-1">
                            <PencilSquareIcon class="h-5 w-5" />
                        </button>
                    </div>
                    <p class="text-sm text-gray-600">{{ equipo.observaciones_permanentes || 'No hay observaciones permanentes registradas.' }}</p>
                </div>

                <div v-else>
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                            <DocumentTextIcon class="h-5 w-5" />
                            Editando Observaciones
                        </h2>
                        <div class="flex gap-2">
                            <button @click="saveChanges" class="text-green-500 hover:text-green-700 p-1">
                                <CheckIcon class="h-5 w-5" />
                            </button>
                            <button @click="cancelEditing" class="text-red-500 hover:text-red-700 p-1">
                                <XMarkIcon class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <textarea v-model="formData.observaciones_permanentes" rows="4"
                        class="w-full p-2 mt-1 border rounded-md text-sm"></textarea>
                </div>
            </div>

            <div class="bg-white p-4 rounded-lg shadow-sm">
                <div v-if="!isEditingProgramacion">
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                            <CalendarDaysIcon class="h-5 w-5" />
                            Programación de Mantenimiento
                        </h2>
                        <button @click="startEditing('programacion')" class="text-gray-400 hover:text-gray-600 p-1">
                            <PencilSquareIcon class="h-5 w-5" />
                        </button>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p class="text-gray-500">Intervalo</p>
                            <p class="font-semibold text-gray-800">{{ equipo.intervalo_mantenimiento_dias }} días</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Último Mantenimiento</p>
                            <p class="font-semibold text-gray-800">{{ formatDate(equipo.ultimo_mantenimiento) }}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Próximo Mantenimiento</p>
                            <p class="font-semibold text-gray-800">{{ formatDate(estadoGeneral.proximo) }}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Estado Actual</p>
                            <p class="font-semibold text-gray-800">{{ estadoGeneral.texto }}</p>
                        </div>
                    </div>
                </div>

                <div v-else>
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="font-semibold text-gray-700 flex items-center gap-2">
                            <CalendarDaysIcon class="h-5 w-5" />
                            Editando Programación
                        </h2>
                        <div class="flex gap-2">
                            <button @click="saveChanges" class="text-green-500 hover:text-green-700 p-1">
                                <CheckIcon class="h-5 w-5" />
                            </button>
                            <button @click="cancelEditing" class="text-red-500 hover:text-red-700 p-1">
                                <XMarkIcon class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div class="text-sm">
                        <label class="font-semibold text-gray-800">Intervalo de Mantenimiento (días)</label>
                        <input v-model="formData.intervalo_mantenimiento_dias" type="number" required
                            class="w-full p-2 mt-1 border rounded-md">
                        <p class="text-xs text-gray-500 mt-2">Número de días entre mantenimientos preventivos</p>
                    </div>
                </div>
            </div>

            <div class="bg-white p-2 rounded-lg shadow-sm">
                <h2 class="font-semibold text-gray-700 mb-4">Historial de Mantenimiento</h2>

                <div v-if="historialMantenimientos.length === 0" class="text-center text-gray-500 py-8">
                    <p>No hay historial de mantenimiento registrado.</p>
                    <p class="text-xs">Las tareas completadas aparecerán aquí.</p>
                </div>

                <div v-else class="space-y-4">
                    <HistorialCard v-for="mtto in historialMantenimientos" :key="mtto.id" :mantenimiento="mtto" />
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg flex gap-3">
                <button @click="showModal = true"
                    class="w-full bg-interactivo text-white py-3 rounded-lg font-semibold">Registrar
                    Mantenimiento</button>
                <button class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold">Programar
                    Mantenimiento</button>
            </div>
        </div>

        <ConfirmacionModal :show="showConfirmModal" titulo="Confirmar Cambio de Estado"
            :mensaje="`¿Estás seguro de que quieres poner este equipo como '${equipo.fuera_de_servicio ? 'En Servicio' : 'Fuera de Servicio'}'?`"
            textoConfirmar="Sí, cambiar estado" @close="showConfirmModal = false"
            @confirm="ejecutarToggleFueraDeServicio" />
    </div>

    <RegistrarMttoModal v-if="showModal" :show="showModal" :equipoId="equipoId" :tareasDefinidas="tareasDefinidas"
        @close="showModal = false" />


</template>