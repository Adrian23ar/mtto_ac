<script setup>
// src/views/Reportes.vue
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from 'vue-toastification';
import HistorialCard from '../components/HistorialCard.vue'; // <-- 1. Importa el HistorialCard

const toast = useToast();
const db = getFirestore();
const router = useRouter();
const fechaInicio = ref('');
const fechaFin = ref('');
const generando = ref(false);
const resultados = ref(null); // Guardará los totales
const detalles = ref([]);     // Guardará los datos agrupados

const generarReporte = async () => {
    if (!fechaInicio.value || !fechaFin.value) {
        toast.error('Por favor, selecciona una fecha de inicio y una fecha de fin.');
        return;
    }

    if (new Date(fechaFin.value) < new Date(fechaInicio.value)) {
        toast.error('La fecha de fin no puede ser anterior a la fecha de inicio.');
        return;
    }

    generando.value = true;
    resultados.value = null;
    detalles.value = [];

    try {
        const fechaInicioTimestamp = Timestamp.fromDate(new Date(fechaInicio.value));
        const fechaFinTimestamp = Timestamp.fromDate(new Date(fechaFin.value + 'T23:59:59'));

        const q = query(
            collection(db, "mantenimientos"),
            where("fecha_realizado", ">=", fechaInicioTimestamp),
            where("fecha_realizado", "<=", fechaFinTimestamp)
        );

        const querySnapshot = await getDocs(q);

        // Objeto temporal para agrupar los mantenimientos por habitación
        const mantenimientosPorHabitacion = {};

        querySnapshot.forEach((doc) => {
            const mantenimiento = { id: doc.id, ...doc.data() };
            const habitacionId = mantenimiento.equipoId;

            if (!mantenimientosPorHabitacion[habitacionId]) {
                // Si es la primera vez que vemos esta habitación, la inicializamos
                mantenimientosPorHabitacion[habitacionId] = [];
            }
            // Añadimos el mantenimiento a la lista de la habitación
            mantenimientosPorHabitacion[habitacionId].push(mantenimiento);
        });

        // Guardamos los detalles agrupados
        detalles.value = mantenimientosPorHabitacion;

        // Calculamos los totales (como antes)
        let conteoPreventivo = 0;
        let conteoCorrectivo = 0;
        querySnapshot.forEach((doc) => {
            const mantenimiento = doc.data();
            if (mantenimiento.tipo === 'Preventivo') conteoPreventivo++;
            else if (mantenimiento.tipo === 'Correctivo') conteoCorrectivo++;
        });

        resultados.value = {
            preventivos: conteoPreventivo,
            correctivos: conteoCorrectivo,
            total: querySnapshot.size
        };

    } catch (error) {
        console.error("Error generando el reporte:", error);
        toast.error("Hubo un error al generar el reporte.");
    } finally {
        generando.value = false;
    }
};
</script>

<template>
    <div class="space-y-6">
        <div class="flex items-center gap-3">
            <button @click="router.back()" class="text-texto-secundario hover:text-gray-900 text-2xl font-bold">
                <ArrowLeftIcon class="h-6 w-6" />
            </button>
            <h1 class="text-2xl font-bold text-texto-principal">Reportes de Mantenimiento</h1>
        </div>
        <p class="text-texto-secundario">Genera un resumen de la actividad por rango de fechas.</p>

        <div class="bg-card p-4 border border-borde rounded-lg shadow-sm">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label for="fecha-inicio" class="block text-sm font-semibold text-texto-principal mb-1">Fecha de
                        Inicio</label>
                    <input type="date" id="fecha-inicio" v-model="fechaInicio"
                        class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario">
                </div>
                <div>
                    <label for="fecha-fin" class="block text-sm font-semibold text-texto-principal mb-1">Fecha de
                        Fin</label>
                    <input type="date" id="fecha-fin" v-model="fechaFin"
                        class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario">
                </div>
                <button @click="generarReporte" :disabled="generando"
                    class="w-full bg-interactivo text-white py-2 px-4 rounded-lg font-semibold disabled:bg-gray-400">
                    {{ generando ? 'Generando...' : 'Generar Reporte' }}
                </button>
            </div>
        </div>

        <div v-if="resultados" class="space-y-6">
            <div class="bg-card p-6 border border-borde rounded-lg shadow-sm">
                <h2 class="text-xl font-bold text-texto-principal mb-4">Resumen de Totales</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div class="bg-blue-100 dark:bg-blue-800/50 p-4 rounded-lg">
                        <p class="text-3xl font-bold text-blue-800 dark:text-blue-200">{{ resultados.preventivos }}</p>
                        <p class="text-sm font-semibold text-blue-700 dark:text-blue-300">Mantenimientos Preventivos</p>
                    </div>
                    <div class="bg-orange-100 dark:bg-orange-800/50 p-4 rounded-lg">
                        <p class="text-3xl font-bold text-orange-800 dark:text-orange-200">{{ resultados.correctivos }}
                        </p>
                        <p class="text-sm font-semibold text-orange-700 dark:text-orange-300">Mantenimientos Correctivos
                        </p>
                    </div>
                    <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                        <p class="text-3xl font-bold text-texto-principal">{{ resultados.total }}</p>
                        <p class="text-sm font-semibold text-texto-secundario">Total de Servicios</p>
                    </div>
                </div>
            </div>

            <div class="bg-card p-6 border border-borde rounded-lg shadow-sm">
                <h2 class="text-xl font-bold text-texto-principal mb-4">Detalles por Habitación</h2>
                <div class="space-y-4">
                    <div v-for="(mantenimientos, habitacionId) in detalles" :key="habitacionId">
                        <h3 class="font-bold text-lg text-interactivo mb-2">Habitación {{ habitacionId }}</h3>
                        <div class="space-y-3">
                            <HistorialCard v-for="mtto in mantenimientos" :key="mtto.id" :mantenimiento="mtto" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>