<script setup>
// src/views/Dashboard.vue
import { ref, onMounted, computed } from 'vue';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import EquipoCard from '../components/EquipoCard.vue';

const db = getFirestore();
const equipos = ref([]);
const searchTerm = ref('');
const activeFilter = ref('Todos');

// Función auxiliar para obtener el estado de un equipo (similar a la de EquipoCard)
const getEquipoStatus = (equipo) => {
  if (equipo.fuera_de_servicio) return 'Fuera de Servicio';
  if (!equipo.ultimo_mantenimiento) return 'Próximo'; // O el estado que prefieras para los nuevos

  const fechaUltimo = equipo.ultimo_mantenimiento.toDate();
  const fechaActual = new Date();
  const intervalo = equipo.intervalo_mantenimiento_dias || 90;
  const diasDesdeMantenimiento = (fechaActual - fechaUltimo) / (1000 * 60 * 60 * 24);

  if (diasDesdeMantenimiento > intervalo) return 'Vencido';
  if (diasDesdeMantenimiento > (intervalo * 0.8)) return 'Próximo';
  return 'Al Día';
};

const equiposFiltrados = computed(() => {
  let equiposTemp = equipos.value;

  // 1. Filtramos por estado (si no es 'Todos')
  if (activeFilter.value !== 'Todos') {
    equiposTemp = equiposTemp.filter(equipo => getEquipoStatus(equipo) === activeFilter.value);
  }

  // 2. Filtramos por búsqueda sobre el resultado anterior
  if (searchTerm.value) {
    const busquedaMinuscula = searchTerm.value.toLowerCase();
    equiposTemp = equiposTemp.filter(equipo => {
      const habitacion = equipo.numero_habitacion.toLowerCase();
      const ubicacion = (equipo.ubicacion_condensadora || '').toLowerCase();
      return habitacion.includes(busquedaMinuscula) || ubicacion.includes(busquedaMinuscula);
    });
  }

  return equiposTemp;
});

onMounted(() => {
  const q = query(collection(db, "equipos"), orderBy("numero_habitacion"));
  onSnapshot(q, (querySnapshot) => {
    const equiposTemp = [];
    querySnapshot.forEach((doc) => {
      equiposTemp.push({ id: doc.id, ...doc.data() });
    });
    equipos.value = equiposTemp;
  });
});
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Panel de Mantenimiento</h1>
      <p class="text-gray-500">Gestión de Aires Acondicionados</p>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
      <p class="font-semibold text-gray-700 mb-3">Buscar y Filtrar</p>
      <input v-model="searchTerm" type="text" placeholder="Buscar por número de habitación o ubicación..."
        class="w-full p-2 border rounded-md bg-gray-50 border-gray-200 focus:ring-2 focus:ring-interactivo focus-within:outline-none">
      <div class="flex flex-wrap gap-2 mt-3">
        <div class="flex flex-wrap gap-2 mt-3">
          <button @click="activeFilter = 'Todos'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Todos', 'bg-gray-200 text-gray-700': activeFilter !== 'Todos' }"
            class="px-3 py-1 text-sm rounded-full">
            Todos ({{ equipos.length }})
          </button>
          <button @click="activeFilter = 'Al Día'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Al Día', 'bg-gray-200 text-gray-700': activeFilter !== 'Al Día' }"
            class="px-3 py-1 text-sm rounded-full">
            Al Día
          </button>
          <button @click="activeFilter = 'Próximo'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Próximo', 'bg-gray-200 text-gray-700': activeFilter !== 'Próximo' }"
            class="px-3 py-1 text-sm rounded-full">
            Próximas
          </button>
          <button @click="activeFilter = 'Vencido'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Vencido', 'bg-gray-200 text-gray-700': activeFilter !== 'Vencido' }"
            class="px-3 py-1 text-sm rounded-full">
            Vencidas
          </button>
          <button @click="activeFilter = 'Fuera de Servicio'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Fuera de Servicio', 'bg-gray-200 text-gray-700': activeFilter !== 'Fuera de Servicio' }"
            class="px-3 py-1 text-sm rounded-full">
            Fuera de Servicio
          </button>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-gray-800">Habitaciones ({{ equiposFiltrados.length }})</h2>
      <span class="text-sm text-gray-500">Mostrando {{ equiposFiltrados.length }} de {{ equipos.length }}
        habitaciones</span>
    </div>

    <div v-if="equiposFiltrados.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <EquipoCard v-for="equipo in equiposFiltrados" :key="equipo.id" :equipo="equipo" />
    </div>
    <div v-else class="text-center text-gray-500 mt-8">
      <p>Cargando equipos...</p>
    </div>
  </div>
</template>