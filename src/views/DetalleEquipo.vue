<script setup>
// src/views/DetalleEquipo.vue
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { getFirestore, doc, updateDoc, collection, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import RegistrarMttoModal from '../components/RegistrarMttoModal.vue';
import HistorialCard from '../components/HistorialCard.vue';
import ConfirmacionModal from '../components/ConfirmacionModal.vue';
import SkeletonLoader from '../components/SkeletonLoader.vue';
import ProgramarMttoModal from '../components/ProgramarMttoModal.vue';
import ProgramacionCard from '../components/ProgramacionCard.vue';

import { PencilSquareIcon, CheckIcon, XMarkIcon, Cog6ToothIcon, DocumentTextIcon, CalendarDaysIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline';

// --- (refs existentes) ---
const toast = useToast();
const route = useRoute();
const router = useRouter();
const equipo = ref(null);
const cargando = ref(true);
const showModal = ref(false);
const db = getFirestore();
const equipoId = route.params.id;
const showProgramarModal = ref(false);
const mantenimientosProgramados = ref([]);
const historialMantenimientos = ref([]);
const mantenimientoAEditar = ref(null);
const programacionAEditar = ref(null);
const programacionACompletarId = ref(null);

const confirmacionState = ref({
    show: false,
    titulo: '',
    mensaje: '',
    onConfirm: () => { } // Aquí guardaremos la función a ejecutar
});

// --- 2. NUEVAS VARIABLES DE ESTADO PARA LA EDICIÓN ---
const isEditingInfo = ref(false);
const isEditingObservaciones = ref(false);
const isEditingProgramacion = ref(false);

// Objeto temporal para guardar los datos del formulario mientras se edita
const formData = ref({});

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

const programadosQuery = query(
  collection(db, "mantenimientos_programados"),
  where("equipoId", "==", equipoId),
  where("estado", "in", ["Programado", "Cancelado"]),
  orderBy("fecha_programada", "desc")
);

    onSnapshot(programadosQuery, (querySnapshot) => {
        const programadosTemp = [];
        querySnapshot.forEach((doc) => {
            programadosTemp.push({ id: doc.id, ...doc.data() });
        });
        mantenimientosProgramados.value = programadosTemp;
    });
});

const iniciarEdicionProgramacion = (programacion) => {
    programacionAEditar.value = programacion;
    showProgramarModal.value = true;
};

const cerrarModalProgramacion = () => {
    showProgramarModal.value = false;
    programacionAEditar.value = null;
};

const abrirConfirmacion = (titulo, mensaje, accionConfirmar) => {
    confirmacionState.value = {
        show: true,
        titulo,
        mensaje,
        onConfirm: accionConfirmar
    };
};

const manejarConfirmacion = () => {
    if (typeof confirmacionState.value.onConfirm === 'function') {
        confirmacionState.value.onConfirm();
    }
    cerrarConfirmacion();
};

const cerrarConfirmacion = () => {
    confirmacionState.value.show = false;
};

const toggleFueraDeServicio = () => {
    if (!equipo.value) return;
    const nuevoEstadoTexto = equipo.value.fuera_de_servicio ? 'En Servicio' : 'Fuera de Servicio';

    abrirConfirmacion(
        'Confirmar Cambio de Estado',
        `¿Estás seguro de que quieres poner este equipo como '${nuevoEstadoTexto}'?`,
        async () => { // La lógica de la acción va aquí, como una función anónima
            try {
                const docRef = doc(db, 'equipos', equipoId);
                const nuevoEstado = !equipo.value.fuera_de_servicio;
                await updateDoc(docRef, { fuera_de_servicio: nuevoEstado });
                toast.success('Estado de servicio actualizado.');
            } catch (error) {
                console.error("Error al actualizar estado:", error);
                toast.error("Hubo un error al actualizar el estado.");
            }
        }
    );
};

const iniciarCancelacion = (item) => {
  abrirConfirmacion(
    'Confirmar Cancelación',
    '¿Estás seguro de que quieres cancelar esta programación?',
    async () => {
      try {
        const docRef = doc(db, 'mantenimientos_programados', item.id);
        await updateDoc(docRef, { estado: 'Cancelado' }); // <-- Cambiamos a updateDoc
        toast.success('Programación cancelada.');
      } catch (error) {
        toast.error("Hubo un error al cancelar.");
      }
    }
  );
};

// Esta función es para eliminar un registro del HISTORIAL de mantenimientos
const iniciarBorradoHistorial = (item) => {
  abrirConfirmacion(
    'Confirmar Eliminación',
    '¿Estás seguro de que quieres eliminar este registro de mantenimiento del historial? Esta acción no se puede deshacer.',
    async () => { // La lógica de borrado va aquí
      try {
        const docRef = doc(db, 'mantenimientos', item.id);
        await deleteDoc(docRef);
        toast.success('Registro de historial eliminado con éxito.');
      } catch (error) {
        console.error("Error al eliminar el historial:", error);
        toast.error("Hubo un error al eliminar el registro.");
      }
    }
  );
};

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

// 2. Crea la función que abre el modal en modo edición
const iniciarEdicion = (mantenimiento) => {
    mantenimientoAEditar.value = mantenimiento; // Guarda el mantenimiento a editar
    showModal.value = true; // Abre el modal de registro
};

const iniciarCompletado = (programacion) => {
    // --- NUEVA VALIDACIÓN DE FECHA ---
    const fechaProgramada = programacion.fecha_programada.toDate();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaProgramada > hoy) {
        toast.info('No se puede completar un mantenimiento programado para una fecha futura.');
        return; // Detenemos la ejecución
    }
    // --- FIN DE LA VALIDACIÓN ---

    // El resto de la función se mantiene igual
    const prellenado = {
        observaciones_servicio: programacion.notas,
    };
    mantenimientoAEditar.value = prellenado;
    programacionACompletarId.value = programacion.id;
    showModal.value = true;
};

// 3. Modifica el @close del modal de registro para limpiar la variable de edición
const cerrarModalRegistro = () => {
    showModal.value = false;
    mantenimientoAEditar.value = null;
    programacionACompletarId.value = null; // Limpiamos el ID al cerrar
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
        { key: 'reemplazo_protector_electrico', label: 'Reemplazo de protector eléctrico' },
        { key: 'reemplazo_protector_termico', label: 'Reemplazo de protector térmico' },
        { key: 'reemplazo_motor_evaporador', label: 'Reemplazo de motor del evaporador' },
        { key: 'reemplazo_motor_condensador', label: 'Reemplazo de motor del condensador' },
        { key: 'reemplazo_rodamientos_evaporador', label: 'Reemplazo de rodamientos de motor evaporador' },
        { key: 'reemplazo_rodamientos_condensador', label: 'Reemplazo de rodamientos de motor condensador' },
        { key: 'reemplazo_compresor', label: 'Reemplazo de Compresor' },
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
    if (mantenimientosProgramados.value.length > 0) {
        // Asumimos que el más cercano es el primero de la lista ordenada
        const proximoProgramado = mantenimientosProgramados.value[0].fecha_programada;
        return {
            texto: 'Mantenimiento Programado',
            proximo: proximoProgramado.toDate()
        };
    }
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
</script>

<template>
    <div>
        <div v-if="cargando" class="space-y-6 pb-24 px-2">
            <div class="flex items-center gap-3">
                <SkeletonLoader width="30px" height="30px" borderRadius="100%" />
                <div>
                    <SkeletonLoader width="200px" height="1.75rem" borderRadius="0.5rem" />
                    <SkeletonLoader width="150px" height="1rem" borderRadius="0.5rem" class="mt-2" />
                </div>
            </div>
            <div v-for="n in 3" :key="n" class="bg-card p-4 border border-borde rounded-lg shadow-sm space-y-3">
                <SkeletonLoader width="40%" height="1.25rem" borderRadius="0.5rem" />
                <SkeletonLoader width="80%" height="1rem" />
                <SkeletonLoader width="60%" height="1rem" />
            </div>
        </div>

        <div v-else-if="equipo" class="pb-24 px-2">
            <div class="space-y-6">
                <div class="flex items-center gap-3">
                    <button @click="router.back()" class="text-texto-secundario hover:text-gray-900 text-2xl font-bold">
                        <ArrowLeftIcon class="h-6 w-6" />
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-texto-principal">{{ equipo.nombre_display }}</h1>
                        <p class="text-sm text-texto-secundario">{{ estadoGeneral.texto }}</p>
                    </div>
                </div>

                <div class="bg-card p-4 border border-borde rounded-lg shadow-sm">
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="font-semibold text-texto-principal">Estado de Servicio</h2>
                        <button @click="toggleFueraDeServicio" class="text-sm px-3 py-1 rounded-md transition-colors"
                            :class="equipo.fuera_de_servicio ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-100' : 'bg-gray-200 dark:bg-gray-700 text-texto-principal hover:bg-gray-300 dark:hover:bg-gray-600'">
                            {{ equipo.fuera_de_servicio ? 'Quitar Fuera de Servicio' : 'Poner Fuera de Servicio' }}
                        </button>
                    </div>
                    <p v-if="equipo.fuera_de_servicio" class="text-sm text-red-600 dark:text-red-500 mt-2">
                        Este equipo se encuentra actualmente <span class="font-semibold">Fuera de Servicio</span>.
                    </p>
                    <p v-else class="text-sm text-texto-secundario mt-2">
                        El equipo se encuentra operativo.
                    </p>
                </div>

                <div class="bg-card p-4 border border-borde rounded-lg shadow-sm">
                    <div v-if="!isEditingInfo">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="font-semibold text-texto-principal flex items-center gap-2">
                                <Cog6ToothIcon class="h-5 w-5 text-texto-secundario" />
                                Información del Equipo
                            </h2>
                            <button @click="startEditing('info')"
                                class="text-gray-400/80 hover:text-texto-secundario p-1">
                                <PencilSquareIcon class="h-5 w-5" />
                            </button>
                        </div>
                        <div class="text-sm space-y-2 text-texto-secundario">
                            <p><span class="font-semibold text-texto-principal">Ubicación:</span> {{
                                equipo.ubicacion_condensadora
                            }}
                            </p>
                            <p><span class="font-semibold text-texto-principal">Capacidad:</span> {{
                                equipo.capacidad_btu }}
                            </p>
                            <p><span class="font-semibold text-texto-principal">Compresor:</span> {{
                                equipo.estado_compresor }}
                            </p>
                        </div>
                    </div>

                    <div v-else>
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="font-semibold text-texto-principal flex items-center gap-2">
                                <Cog6ToothIcon class="h-5 w-5 text-texto-secundario" />
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
                                <label class="font-semibold text-texto-principal">Ubicación</label>
                                <input v-model="formData.ubicacion_condensadora" type="text" required
                                    class="w-full p-2 mt-1 border border-borde rounded-md bg-fondo text-texto-secundario ">
                            </div>
                            <div>
                                <label class="font-semibold text-texto-principal">Capacidad</label>
                                <select v-model="formData.capacidad_btu" required
                                    class="w-full p-2 mt-1 border border-borde rounded-md bg-fondo text-texto-secundario ">
                                    <option v-for="opcion in opcionesCapacidad" :key="opcion" :value="opcion">
                                        {{ opcion }}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label class="font-semibold text-texto-principal">Compresor</label>
                                <select v-model="formData.estado_compresor"
                                    class="w-full p-2 mt-1 border border-borde rounded-md bg-fondo text-texto-secundario ">
                                    <option>Bueno</option>
                                    <option>Regular</option>
                                    <option>Deficiente</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-card p-4 border border-borde rounded-lg shadow-sm">
                    <div v-if="!isEditingObservaciones">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="font-semibold text-texto-principal flex items-center gap-2">
                                <DocumentTextIcon class="h-5 w-5" />
                                Observaciones Permanentes
                            </h2>
                            <button @click="startEditing('observaciones')"
                                class="text-gray-400/80 hover:text-texto-secundario p-1">
                                <PencilSquareIcon class="h-5 w-5" />
                            </button>
                        </div>
                        <p class="text-sm text-texto-secundario">{{ equipo.observaciones_permanentes || 'No hay observaciones permanentes registradas.' }}</p>
                    </div>

                    <div v-else>
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="font-semibold text-texto-principal flex items-center gap-2">
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
                            class="w-full p-2 mt-1 border border-borde rounded-md bg-fondo text-texto-secundario  text-sm"></textarea>
                    </div>
                </div>

                <div class="bg-card p-4 border border-borde rounded-lg shadow-sm">
                    <div v-if="!isEditingProgramacion">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="font-semibold text-texto-principal flex items-center gap-2">
                                <CalendarDaysIcon class="h-5 w-5" />
                                Ciclo de Mantenimiento
                            </h2>
                            <button @click="startEditing('programacion')"
                                class="text-gray-400/80 hover:text-texto-secundario p-1">
                                <PencilSquareIcon class="h-5 w-5" />
                            </button>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 text-sm">
                            <div>
                                <p class="text-texto-secundario">Intervalo</p>
                                <p class="font-semibold text-texto-principal">{{ equipo.intervalo_mantenimiento_dias }}
                                    días
                                </p>
                            </div>
                            <div>
                                <p class="text-texto-secundario">Último Mantenimiento</p>
                                <p class="font-semibold text-texto-principal">{{ formatDate(equipo.ultimo_mantenimiento)
                                    }}</p>
                            </div>
                            <div>
                                <p class="text-texto-secundario">Próximo Mantenimiento</p>
                                <p class="font-semibold text-texto-principal">{{ formatDate(estadoGeneral.proximo) }}
                                </p>
                            </div>
                            <div>
                                <p class="text-texto-secundario">Estado Actual</p>
                                <p class="font-semibold text-texto-principal">{{ estadoGeneral.texto }}</p>
                            </div>
                        </div>
                    </div>

                    <div v-else>
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="font-semibold text-texto-principal flex items-center gap-2">
                                <CalendarDaysIcon class="h-5 w-5" />
                                Editando Ciclo de Mantenimiento
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
                            <label class="font-semibold text-texto-principal">Intervalo de Mantenimiento (días)</label>
                            <input v-model="formData.intervalo_mantenimiento_dias" type="number" required
                                class="w-full p-2 mt-1 border border-borde rounded-md bg-fondo text-texto-secundario ">
                            <p class="text-xs text-texto-secundario mt-2">Número de días entre mantenimientos
                                preventivos</p>
                        </div>
                    </div>
                </div>

                <div class="bg-card p-4 border border-borde rounded-lg shadow-sm">
                    <h2 class="font-semibold text-texto-principal mb-4">Mantenimientos Programados</h2>

                    <div v-if="mantenimientosProgramados.length > 0" class="space-y-3">
                        <ProgramacionCard v-for="prog in mantenimientosProgramados" :key="prog.id" :programacion="prog"
                            @cancelar="iniciarCancelacion(prog, 'mantenimientos_programados')"
                            @editar="iniciarEdicionProgramacion(prog)" @completar="iniciarCompletado(prog)" />
                    </div>

                    <div v-else class="text-center text-texto-secundario text-sm py-4">
                        <p>No hay mantenimientos programados para este equipo.</p>
                    </div>
                </div>

                <div class="bg-card p-4 border border-borde rounded-lg shadow-sm">
                    <h2 class="font-semibold text-texto-principal mb-4">Historial de Mantenimiento</h2>

                    <div v-if="historialMantenimientos.length === 0" class="text-center text-texto-secundario py-8">
                        <p>No hay historial de mantenimiento registrado.</p>
                        <p class="text-xs">Las tareas completadas aparecerán aquí.</p>
                    </div>

                    <div v-else class="space-y-4">
                        <HistorialCard v-for="mtto in historialMantenimientos" :key="mtto.id" :mantenimiento="mtto"
                            @borrar="iniciarBorradoHistorial(mtto)" @editar="iniciarEdicion(mtto)" />
                    </div>
                </div>

                <div class="fixed bottom-0 left-0 right-0 bg-card p-4 border border-borde border-t shadow-lg">
                    <div class="w-full sm:w-4/5 md:w-2/3 lg:w-1/2 mx-auto flex gap-3">
                        <button @click="showModal = true"
                            class="w-full bg-interactivo text-sm text-white py-3 px-2 rounded-lg font-semibold hover:bg-interactivo-dark transition-all">Registrar
                            Mantenimiento</button>
                        <button @click="showProgramarModal = true"
                            class="w-full bg-gray-200 text-sm text-gray-700 py-3 px-2 rounded-lg font-semibold hover:bg-gray-300 transition-all">Programar
                            Mantenimiento</button>
                    </div>


                </div>
            </div>

            <ConfirmacionModal :show="confirmacionState.show" :titulo="confirmacionState.titulo"
                :mensaje="confirmacionState.mensaje" textoConfirmar="Sí, confirmar" @close="cerrarConfirmacion"
                @confirm="manejarConfirmacion" />
        </div>

        <RegistrarMttoModal v-if="showModal" :show="showModal" :equipoId="equipoId" :tareasDefinidas="tareasDefinidas"
            :mantenimientoExistente="mantenimientoAEditar" @close="cerrarModalRegistro" />

        <ProgramarMttoModal v-if="showProgramarModal" :show="showProgramarModal" :equipoId="equipoId"
            :numeroHabitacion="equipo.numero_habitacion" :programacionExistente="programacionAEditar"
            @close="cerrarModalProgramacion" />

    </div>


</template>