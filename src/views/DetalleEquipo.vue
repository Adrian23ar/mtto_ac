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
import { CheckCircleIcon, NoSymbolIcon } from '@heroicons/vue/24/solid';

// --- (refs existentes) ---
const toast = useToast();
const route = useRoute();
const router = useRouter();
const equipo = ref(null);
const cargando = ref(true);
const db = getFirestore();
const equipoId = route.params.id;

const activeTab = ref('informacion'); // Pestaña activa por defecto
const showModal = ref(false);
const showProgramarModal = ref(false);
const mantenimientosProgramados = ref([]);
const historialMantenimientos = ref([]);
const mantenimientoAEditar = ref(null);
const programacionAEditar = ref(null);
const programacionACompletarId = ref(null);
const formData = ref({});

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

const progresoCiclo = computed(() => {
    if (!equipo.value || !equipo.value.ultimo_mantenimiento || equipo.value.fuera_de_servicio) {
        return { diasTranscurridos: 0, totalDias: equipo.value?.intervalo_mantenimiento_dias || 90, porcentaje: 0 };
    }
    const fechaUltimo = equipo.value.ultimo_mantenimiento.toDate();
    const hoy = new Date();
    const totalDias = equipo.value.intervalo_mantenimiento_dias || 90;

    // Asegurarse de que no contamos días negativos si el último mtto es en el futuro (poco probable)
    const diasTranscurridos = Math.max(0, (hoy - fechaUltimo) / (1000 * 60 * 60 * 24));

    // El progreso no puede ser mayor a 100%
    const porcentaje = Math.min(100, (diasTranscurridos / totalDias) * 100);

    return {
        diasTranscurridos: Math.floor(diasTranscurridos),
        totalDias: totalDias,
        porcentaje: Math.floor(porcentaje)
    };
});


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
        async () => {
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
    const fechaProgramada = programacion.fecha_programada.toDate();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaProgramada > hoy) {
        toast.info('No se puede completar un mantenimiento programado para una fecha futura.');
        return;
    }

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
    if (!dateInput) return 'N/A';

    let date;

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

                <div
                    class="bg-card p-4 rounded-lg shadow-sm mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div class="flex items-center gap-4 ps-4 sm:ps-0">
                        <template v-if="equipo.fuera_de_servicio">
                            <NoSymbolIcon class="h-10 w-10 text-status-rojo flex-shrink-0" />
                            <div>
                                <h2 class="font-bold text-texto-principal">Fuera de Servicio</h2>
                                <p class="text-sm text-texto-secundario">El equipo no está operativo.</p>
                            </div>
                        </template>
                        <template v-else>
                            <CheckCircleIcon class="h-10 w-10 text-status-verde flex-shrink-0" />
                            <div>
                                <h2 class="font-bold text-texto-principal">Operativo</h2>
                                <p class="text-sm text-texto-secundario">El equipo se encuentra operativo.</p>
                            </div>
                        </template>
                    </div>
                    <button @click="toggleFueraDeServicio"
                        class="w-full sm:w-auto text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        :class="equipo.fuera_de_servicio
                            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200'">
                        {{ equipo.fuera_de_servicio ? 'Poner Operativo' : 'Poner Fuera de Servicio' }}
                    </button>
                </div>

                <div class="border-b border-borde mb-6">
                    <nav class="flex justify-around items-center space-x-4">
                        <button @click="activeTab = 'informacion'"
                            :class="[activeTab === 'informacion' ? 'border-interactivo text-interactivo' : 'border-transparent text-texto-secundario hover:text-texto-principal']"
                            class="w-full sm:w-3/4 py-2 px-1 border-b-2 font-medium text-sm transition-colors">Información</button>
                        <button @click="activeTab = 'mantenimiento'"
                            :class="[activeTab === 'mantenimiento' ? 'border-interactivo text-interactivo' : 'border-transparent text-texto-secundario hover:text-texto-principal']"
                            class="w-full sm:w-3/4 py-2 px-1 border-b-2 font-medium text-sm transition-colors">Mantenimiento</button>
                        <button @click="activeTab = 'historial'"
                            :class="[activeTab === 'historial' ? 'border-interactivo text-interactivo' : 'border-transparent text-texto-secundario hover:text-texto-principal']"
                            class="w-full sm:w-3/4 py-2 px-1 border-b-2 font-medium text-sm transition-colors">Historial</button>
                    </nav>
                </div>

                <div v-if="activeTab === 'informacion'" class="space-y-6">
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
                </div>


                <div v-if="activeTab === 'mantenimiento'" class="space-y-6">
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
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
                                <div>
                                    <p class="text-sm text-texto-secundario">Intervalo</p>
                                    <p class="text-2xl font-bold text-texto-principal">{{ equipo.intervalo_mantenimiento_dias }} días</p>
                                </div>
                                <div>
                                    <p class="text-sm text-texto-secundario">Último Mtto.</p>
                                    <p class="text-2xl font-bold text-texto-principal">{{ formatDate(equipo.ultimo_mantenimiento) }}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-texto-secundario">Próximo Mtto.</p>
                                    <p class="text-2xl font-bold text-texto-principal">{{ formatDate(estadoGeneral.proximo) }}</p>
                                </div>
                            </div>
                            <div class="mt-6">
                                <div class="flex justify-between mb-1">
                                    <span class="text-sm font-medium text-texto-principal">Progreso del ciclo</span>
                                    <span class="text-sm font-medium text-texto-principal">{{ progresoCiclo.porcentaje
                                        }}%</span>
                                </div>
                                <div class="w-full bg-fondo rounded-full h-2.5">
                                    <div class="bg-interactivo h-2.5 rounded-full"
                                        :style="{ width: progresoCiclo.porcentaje + '%' }">
                                    </div>
                                </div>
                                <p class="text-xs text-texto-secundario text-right mt-1">{{
                                    progresoCiclo.diasTranscurridos }} de {{
                                    progresoCiclo.totalDias }} días transcurridos</p>
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
                                <label class="font-semibold text-texto-principal">Intervalo de Mantenimiento
                                    (días)</label>
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
                            <ProgramacionCard v-for="prog in mantenimientosProgramados" :key="prog.id"
                                :programacion="prog" @cancelar="iniciarCancelacion(prog, 'mantenimientos_programados')"
                                @editar="iniciarEdicionProgramacion(prog)" @completar="iniciarCompletado(prog)" />
                        </div>

                        <div v-else class="text-center text-texto-secundario text-sm py-4">
                            <p>No hay mantenimientos programados para este equipo.</p>
                        </div>
                    </div>
                </div>


                <div v-if="activeTab === 'historial'" class="space-y-6">
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
            <RegistrarMttoModal :show="showModal" :equipoId="equipoId" :mantenimientoExistente="mantenimientoAEditar"
                @close="cerrarModalRegistro" />

            <ProgramarMttoModal :show="showProgramarModal" :equipoId="equipoId" :nombreDisplay="equipo.nombre_display"
                :programacionExistente="programacionAEditar" @close="cerrarModalProgramacion" />
        </div>

    </div>


</template>