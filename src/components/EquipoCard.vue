<script setup>
// src/components/EquipoCard.vue
import { computed } from 'vue';

//icono de avertencia heroicons
import { ExclamationTriangleIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  equipo: { type: Object, required: true },
});

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

const estadoMantenimiento = computed(() => {
  if (props.equipo.fuera_de_servicio) {
    return { texto: 'Fuera de Servicio', claseBorde: 'border-t-status-gris', proximo: null };
  }
  if (!props.equipo.ultimo_mantenimiento) {
    return { texto: 'Sin Registro', claseBorde: 'border-t-status-amarillo', proximo: null };
  }

  const fechaUltimo = props.equipo.ultimo_mantenimiento.toDate();
  const fechaActual = new Date();
  const intervalo = props.equipo.intervalo_mantenimiento_dias || 90;
  const diasDesdeMantenimiento = (fechaActual - fechaUltimo) / (1000 * 60 * 60 * 24);

  const fechaProximo = new Date(fechaUltimo);
  fechaProximo.setDate(fechaProximo.getDate() + intervalo);

  if (diasDesdeMantenimiento > intervalo) {
    return { texto: 'Vencido', claseBorde: 'border-t-status-rojo', proximo: fechaProximo };
  }
  if (diasDesdeMantenimiento > (intervalo * 0.8)) {
    return { texto: 'Próximo', claseBorde: 'border-t-status-amarillo', proximo: fechaProximo };
  }
  return { texto: 'Al Día', claseBorde: 'border-t-status-verde', proximo: fechaProximo };
});
</script>

<template>
  <router-link :to="{ name: 'detalle-equipo', params: { id: equipo.id } }">
    <div :class="estadoMantenimiento.claseBorde"
      class="bg-white rounded-lg shadow-sm h-full border-t-4 hover:shadow-md transition-shadow">
      <div class="p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-gray-800">Habitación {{ equipo.numero_habitacion }}</h3>
          <span class="text-gray-400"> <WrenchScrewdriverIcon class="h-5 w-5" /> </span>
        </div>

        <div>
          <span class="text-xs font-semibold px-2 py-1 rounded-full"
            :class="estadoMantenimiento.claseBorde.replace('border-t', 'bg').replace('-gris', '-200').replace('-rojo', '-100').replace('-amarillo', '-100').replace('-verde', '-100') + ' ' + estadoMantenimiento.claseBorde.replace('border-t', 'text').replace('-200', '-800').replace('-100', '-800')">
            {{ estadoMantenimiento.texto }}
          </span>
          <p class="text-sm text-gray-600 mt-2">{{ equipo.ubicacion_condensadora || 'Sin ubicación' }}</p>
          <p class="text-lg font-bold text-gray-800 mt-1">{{ equipo.capacidad_btu }}</p>
        </div>

        <div class="border-t mt-3 pt-3 flex justify-between text-xs text-gray-500">
          <div>
            <p>Último</p>
            <p class="font-semibold">{{ formatDate(equipo.ultimo_mantenimiento) }}</p>
          </div>
          <div>
            <p>Próximo</p>
            <p class="font-semibold">{{ formatDate(estadoMantenimiento.proximo) }}</p>
          </div>
        </div>

        <div v-if="equipo.observaciones_permanentes" class="mt-2 text-yellow-600 text-xs flex items-center gap-1">
          <ExclamationTriangleIcon class="h-5 w-5" />
          <span>{{ equipo.observaciones_permanentes }}</span>
        </div>
      </div>
    </div>
  </router-link>
</template>