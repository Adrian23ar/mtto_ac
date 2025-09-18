<script setup>
import { computed } from 'vue';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  NoSymbolIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  equipo: { type: Object, required: true },
});

const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date;
  if (typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else {
    date = dateInput;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// Propiedad computada mejorada que devuelve un objeto con todos los estilos
const estado = computed(() => {
  if (props.equipo.fuera_de_servicio) {
    return {
      texto: 'Fuera de Servicio',
      claseHeader: 'bg-status-gris text-white',
      clasePill: 'bg-gray-200 text-gray-800',
      IconoHeader: ExclamationTriangleIcon,
      proximo: null
    };
  }

  if (!props.equipo.ultimo_mantenimiento) {
    const proximoCalculado = new Date(); // Asumimos hoy si no hay registro
    proximoCalculado.setDate(proximoCalculado.getDate() + (props.equipo.intervalo_mantenimiento_dias || 90));
    return {
      texto: 'Sin Registro',
      claseHeader: 'bg-status-amarillo text-white',
      clasePill: 'bg-yellow-100 text-yellow-800',
      IconoHeader: CalendarDaysIcon,
      proximo: proximoCalculado
    };
  }

  const fechaUltimo = props.equipo.ultimo_mantenimiento.toDate();
  const fechaActual = new Date();
  const intervalo = props.equipo.intervalo_mantenimiento_dias || 90;
  const diasDesdeMantenimiento = (fechaActual - fechaUltimo) / (1000 * 60 * 60 * 24);

  const fechaProximo = new Date(fechaUltimo);
  fechaProximo.setDate(fechaProximo.getDate() + intervalo);

  if (diasDesdeMantenimiento > intervalo) {
    return {
      texto: 'Vencido',
      claseHeader: 'bg-status-rojo text-white',
      clasePill: 'bg-red-100 text-red-800',
      IconoHeader: ExclamationTriangleIcon,
      proximo: fechaProximo
    };
  }
  if (diasDesdeMantenimiento > (intervalo * 0.8)) {
    return {
      texto: 'Próximo',
      claseHeader: 'bg-status-amarillo text-white',
      clasePill: 'bg-yellow-100 text-yellow-800',
      IconoHeader: CalendarDaysIcon,
      proximo: fechaProximo
    };
  }
  return {
    texto: 'Al Día',
    claseHeader: 'bg-status-verde text-white',
    clasePill: 'bg-green-100 text-green-800',
    IconoHeader: CalendarDaysIcon,
    proximo: fechaProximo
  };
});
</script>

<template>
  <router-link :to="{ name: 'detalle-equipo', params: { id: equipo.id } }" class="block h-full">
    <div class="bg-gray-50 rounded-lg shadow h-full flex flex-col hover:shadow-lg hover:scale-[101%] transition-all">

      <div :class="estado.claseHeader" class="flex justify-between items-center p-3 rounded-t-lg">
        <div class="flex items-center gap-2">
          <component :is="estado.IconoHeader" class="h-5 w-5" />
          <h3 class="font-bold">Habitación {{ equipo.numero_habitacion }}</h3>
        </div>
        <NoSymbolIcon v-if="equipo.fuera_de_servicio" class="h-6 w-6" />
      </div>

      <div class="p-4 flex-grow flex flex-col">
        <div class="flex justify-between items-center">
          <span :class="estado.clasePill" class="text-xs font-semibold px-2 py-1 rounded-full">
            {{ estado.texto }}
          </span>
          <WrenchScrewdriverIcon class="h-5 w-5 text-gray-400" />
        </div>

        <div class="mt-2 text-sm text-gray-600 flex items-center gap-2">
          <MapPinIcon class="h-4 w-4" />
          <span>{{ equipo.ubicacion_condensadora || 'Sin ubicación' }}</span>
        </div>

        <p class="text-lg font-bold text-gray-800 mt-1">{{ equipo.capacidad_btu }}</p>

        <div class="flex-grow"></div>
        <div class="border-t mt-3 pt-3 flex justify-between text-xs text-gray-500">
          <div>
            <p>Último:</p>
            <p class="font-semibold">{{ formatDate(equipo.ultimo_mantenimiento) }}</p>
          </div>
          <div>
            <p>Próximo:</p>
            <p class="font-semibold">{{ formatDate(estado.proximo) }}</p>
          </div>
        </div>

        <div v-if="equipo.observaciones_permanentes" class="mt-2 text-yellow-600 text-xs flex items-center gap-1">
          <ExclamationTriangleIcon class="h-4 w-4" />
          <span>Observaciones permanentes</span>
        </div>
      </div>

    </div>
  </router-link>
</template>