<script setup>
import { computed } from 'vue';

const props = defineProps({
    width: { type: String, default: '100%' },
    height: { type: String, default: '1rem' }, // Altura por defecto de una línea de texto
    borderRadius: { type: String, default: '0.25rem' } // 4px por defecto
});

// Usamos una propiedad computada para pasar los estilos dinámicos al template
const styleObject = computed(() => ({
    width: props.width,
    height: props.height,
    borderRadius: props.borderRadius,
}));
</script>

<template>
    <div class="bg-gray-200 animate-pulse" :style="styleObject"></div>
</template>