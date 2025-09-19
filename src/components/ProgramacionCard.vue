<script setup>
// src/components/ProgramacionCard.vue
import { CalendarDaysIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';
import { useAuth } from '../composables/useAuth';

const { userProfile } = useAuth();

const props = defineProps({
    programacion: { type: Object, required: true }
});

const emit = defineEmits(['cancelar', 'editar', 'completar']); // <-- Añadimos 'completar'

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
            <div class="flex items-center gap-4">
                <span v-if="programacion.estado === 'Programado'"
                    class="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-800">Programado</span>
                <span v-if="programacion.estado === 'Cancelado'"
                    class="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800">Cancelado</span>

                <div v-if="puedeModificar && programacion.estado === 'Programado'" class="flex items-center gap-3">
                    <button @click.prevent="emit('completar')" class="text-texto-secundario hover:text-status-verde"
                        title="Marcar como Completado">
                        <CheckCircleIcon class="h-6 w-6" />
                    </button>
                    <button @click.prevent="emit('editar')" class="text-texto-secundario hover:text-interactivo"
                        title="Editar">
                        <PencilIcon class="h-5 w-5" />
                    </button>
                    <button @click.prevent="emit('cancelar')" class="text-texto-secundario hover:text-status-rojo"
                        title="Cancelar Programación">
                        <TrashIcon class="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
        <p v-if="programacion.notas" class="text-sm text-texto-secundario mt-2 border-t border-borde pt-2">
            {{ programacion.notas }}
        </p>
    </div>
</template>