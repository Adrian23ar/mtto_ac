<script setup>
import { CalendarDaysIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';
import { useAuth } from '../composables/useAuth';

const { userProfile } = useAuth();

const props = defineProps({
    programacion: { type: Object, required: true }
});

const emit = defineEmits(['borrar', 'editar']); // <-- AÑADE 'editar'

const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha no disponible';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
};

const puedeModificar = computed(() => {
    if (!userProfile.value) return false;
    return userProfile.value.rol === 'admin' || userProfile.value.uid === props.programacion.creado_por_uid;
});
</script>

<template>
    <div class="bg-car border border-borde rounded-lg p-3">
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
                <CalendarDaysIcon class="h-6 w-6 text-interactivo" />
                <div>
                    <p class="font-bold text-texto-principal">{{ formatDate(programacion.fecha_programada) }}</p>
                    <p class="text-xs text-texto-secundario">Programado por: {{ programacion.creado_por_nombre }}</p>
                </div>
            </div>
            <span
                class="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                Programado
            </span>
            <div v-if="puedeModificar" class="flex items-center gap-2">
            <button @click.prevent="emit('editar')" class="text-texto-secundario hover:text-interactivo" title="Editar">
                <PencilIcon class="h-4 w-4" />
            </button>
            <button @click.prevent="emit('borrar')" class="text-texto-secundario hover:text-status-rojo" title="Eliminar">
                <TrashIcon class="h-4 w-4" />
            </button>
        </div>
        </div>
        <p v-if="programacion.notas" class="text-sm text-texto-secundario mt-2 border-t border-borde pt-2">
            {{ programacion.notas }}
        </p>
    </div>
</template>