<script setup>
const props = defineProps({
    mantenimiento: { type: Object, required: true }
});

const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha no disponible';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
};
</script>

<template>
    <div class="bg-fondo border border-borde rounded-lg p-4">
        <div class="flex justify-between flex-wrap items-start border-b border-borde pb-2 mb-3">
            <div>
                <p class="font-bold text-texto-principal">{{ formatDate(mantenimiento.fecha_realizado) }}</p>
                <p class="text-sm text-texto-secundario mb-1 sm:mb-0">Técnico: {{ mantenimiento.tecnico_email }}</p>
            </div>

            <div class="flex items-end gap-2">
                <span
                    v-if="mantenimiento.tareas_realizadas.preventivas && mantenimiento.tareas_realizadas.preventivas.length > 0"
                    class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                    Preventivo
                </span>
                <span
                    v-if="mantenimiento.tareas_realizadas.correctivas && mantenimiento.tareas_realizadas.correctivas.length > 0"
                    class="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
                    Correctivo
                </span>
            </div>
        </div>

        <div class="text-sm space-y-3">
            <p class="text-texto-secundario">{{ mantenimiento.observaciones_servicio || 'Sin observaciones.' }}</p>

            <div
                v-if="mantenimiento.tareas_realizadas.preventivas && mantenimiento.tareas_realizadas.preventivas.length > 0">
                <p class="font-semibold text-texto-principal/90">Tareas Preventivas:</p>
                <ul class="list-disc list-inside text-texto-secundario space-y-1 mt-1">
                    <li v-for="tarea in mantenimiento.tareas_realizadas.preventivas" :key="tarea">{{ tarea }}</li>
                </ul>
            </div>

            <div
                v-if="mantenimiento.tareas_realizadas.correctivas && mantenimiento.tareas_realizadas.correctivas.length > 0">
                <p class="font-semibold text-texto-principal/90">Tareas Correctivas:</p>
                <ul class="list-disc list-inside text-texto-secundario space-y-1 mt-1">
                    <li v-for="tarea in mantenimiento.tareas_realizadas.correctivas" :key="tarea">{{ tarea }}</li>
                </ul>
            </div>
        </div>
    </div>
</template>