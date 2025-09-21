<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/vue/24/outline';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useToast } from 'vue-toastification';
import HistorialCard from '../components/HistorialCard.vue';

// ¡NUEVAS IMPORTACIONES PARA EXPORTAR!
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const toast = useToast();
const db = getFirestore();
const router = useRouter();
const fechaInicio = ref('');
const fechaFin = ref('');
const generando = ref(false);
const resultados = ref(null);
const detalles = ref(null);
const metricasAvanzadas = ref(null);

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
    detalles.value = null;
    metricasAvanzadas.value = null;

    try {
        const fechaInicioTimestamp = Timestamp.fromDate(new Date(fechaInicio.value));
        const fechaFinTimestamp = Timestamp.fromDate(new Date(fechaFin.value + 'T23:59:59'));

        const q = query(
            collection(db, "mantenimientos"),
            where("fecha_realizado", ">=", fechaInicioTimestamp),
            where("fecha_realizado", "<=", fechaFinTimestamp)
        );

        const querySnapshot = await getDocs(q);
        const mantenimientosDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (mantenimientosDocs.length === 0) {
            toast.info("No se encontraron mantenimientos en el rango de fechas seleccionado.");
            resultados.value = { preventivos: 0, correctivos: 0, total: 0 };
            return;
        }

        const mantenimientosPorEquipo = {};
        const equipoIds = new Set(mantenimientosDocs.map(m => m.equipoId));

        for (const id of equipoIds) {
            const equipoDocRef = doc(db, 'equipos', id);
            const equipoDocSnap = await getDoc(equipoDocRef);
            if (equipoDocSnap.exists()) {
                mantenimientosPorEquipo[id] = {
                    nombre_display: equipoDocSnap.data().nombre_display,
                    mantenimientos: mantenimientosDocs.filter(m => m.equipoId === id)
                };
            }
        }
        detalles.value = mantenimientosPorEquipo;

        let totalMinPreventivo = 0;
        let totalMinCorrectivo = 0;
        let conteoPreventivo = 0;
        let conteoCorrectivo = 0;
        const conteoTareas = {};

        mantenimientosDocs.forEach(mantenimiento => {
            if (mantenimiento.tipo === 'Preventivo') {
                totalMinPreventivo += mantenimiento.duracion_minutos;
                conteoPreventivo++;
            } else if (mantenimiento.tipo === 'Correctivo') {
                totalMinCorrectivo += mantenimiento.duracion_minutos;
                conteoCorrectivo++;
            }

            const tareas = mantenimiento.tareas_realizadas;
            [...(tareas.preventivas || []), ...(tareas.correctivas || [])].forEach(labelTarea => {
                conteoTareas[labelTarea] = (conteoTareas[labelTarea] || 0) + 1;
            });
        });

        const tareasMasComunes = Object.entries(conteoTareas)
            .map(([label, contador]) => ({ label, contador }))
            .sort((a, b) => b.contador - a.contador);

        metricasAvanzadas.value = {
            tiempoPromedio: {
                preventivo: conteoPreventivo > 0 ? Math.round(totalMinPreventivo / conteoPreventivo) : 0,
                correctivo: conteoCorrectivo > 0 ? Math.round(totalMinCorrectivo / conteoCorrectivo) : 0,
            },
            tareasMasComunes: tareasMasComunes
        };

        resultados.value = {
            preventivos: conteoPreventivo,
            correctivos: conteoCorrectivo,
            total: mantenimientosDocs.length
        };

    } catch (error) {
        console.error("Error generando el reporte:", error);
        toast.error("Hubo un error al generar el reporte.");
    } finally {
        generando.value = false;
    }
};

// --- ¡NUEVAS FUNCIONES PARA EXPORTAR! ---

const formatDateForExport = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('es-ES');
};

const exportarAPDF = () => {
    const doc = new jsPDF();
    const fechaReporte = `Reporte del ${fechaInicio.value} al ${fechaFin.value}`;

    doc.setFontSize(18);
    doc.text("Reporte de Mantenimiento", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(fechaReporte, 14, 29);

    // ¡CAMBIO EN LA FORMA DE LLAMAR A AUTOTABLE!
    autoTable(doc, {
        startY: 40,
        head: [['Métrica', 'Valor']],
        body: [
            ["Total de Servicios", resultados.value.total],
            ["Mantenimientos Preventivos", resultados.value.preventivos],
            ["Mantenimientos Correctivos", resultados.value.correctivos],
            [`Tiempo Promedio Preventivo`, `${metricasAvanzadas.value.tiempoPromedio.preventivo} min`],
            [`Tiempo Promedio Correctivo`, `${metricasAvanzadas.value.tiempoPromedio.correctivo} min`],
        ]
    });

    const bodyDetalles = [];
    for (const equipoId in detalles.value) {
        const equipo = detalles.value[equipoId];
        equipo.mantenimientos.forEach(mtto => {
             bodyDetalles.push([
                equipo.nombre_display,
                formatDateForExport(mtto.fecha_realizado),
                mtto.tipo,
                mtto.tecnico_nombre,
                mtto.duracion_minutos,
            ]);
        });
    }

    // ¡CAMBIO EN LA FORMA DE LLAMAR A AUTOTABLE!
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Equipo', 'Fecha', 'Tipo', 'Técnico', 'Duración (min)']],
        body: bodyDetalles
    });

    doc.save(`Reporte_Mantenimiento_${fechaInicio.value}_a_${fechaFin.value}.pdf`);
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
                <h2 class="text-lg font-bold text-texto-principal text-center mt-6 mb-4">Exportar reporte como:</h2>
                <div class="flex justify-center items-center gap-3">
                    <button @click="exportarAPDF"
                        class="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                        <DocumentArrowDownIcon class="h-5 w-5" />
                        PDF
                    </button>
                </div>
            </div>

            <div v-if="metricasAvanzadas" class="bg-card p-6 border border-borde rounded-lg shadow-sm">
                <h2 class="text-xl font-bold text-texto-principal mb-4">Métricas Avanzadas</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="md:col-span-1 space-y-4">
                        <h3 class="font-semibold text-texto-principal">Tiempo Promedio</h3>
                        <div class="bg-fondo p-4 rounded-lg">
                            <p class="text-2xl font-bold text-texto-principal">{{
                                metricasAvanzadas.tiempoPromedio.preventivo }} <span
                                    class="text-sm font-normal">min</span></p>
                            <p class="text-sm text-texto-secundario">Por Mantenimiento Preventivo</p>
                        </div>
                        <div class="bg-fondo p-4 rounded-lg">
                            <p class="text-2xl font-bold text-texto-principal">{{
                                metricasAvanzadas.tiempoPromedio.correctivo }} <span
                                    class="text-sm font-normal">min</span></p>
                            <p class="text-sm text-texto-secundario">Por Mantenimiento Correctivo</p>
                        </div>
                    </div>
                    <div class="md:col-span-2">
                        <h3 class="font-semibold text-texto-principal mb-4">Análisis de Frecuencia de Tareas</h3>
                        <div class="max-h-60 overflow-y-auto space-y-2 pr-2">
                            <div v-for="tarea in metricasAvanzadas.tareasMasComunes" :key="tarea.label" class="text-sm">
                                <div class="flex justify-between mb-1">
                                    <span class="text-texto-principal">{{ tarea.label }}</span>
                                    <span class="font-semibold text-texto-principal">{{ tarea.contador }}</span>
                                </div>
                                <div class="w-full bg-fondo rounded-full h-2.5">
                                    <div class="bg-interactivo h-2.5 rounded-full"
                                        :style="{ width: (tarea.contador / metricasAvanzadas.tareasMasComunes[0].contador * 100) + '%' }">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="detalles" class="bg-card p-6 border border-borde rounded-lg shadow-sm">
                <h2 class="text-xl font-bold text-texto-principal mb-4">Detalles por Equipo</h2>
                <div class="space-y-4">
                    <div v-for="(datosEquipo, equipoId) in detalles" :key="equipoId">
                        <h3 class="font-bold text-lg text-interactivo mb-2">{{ datosEquipo.nombre_display }}</h3>
                        <div class="space-y-3">
                            <HistorialCard v-for="mtto in datosEquipo.mantenimientos" :key="mtto.id"
                                :mantenimiento="mtto" :show-actions="false" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>