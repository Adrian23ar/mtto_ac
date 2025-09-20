<script setup>
import { ref, onMounted, computed } from 'vue';
import { getFirestore, collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import EquipoCard from '../components/EquipoCard.vue';
import SkeletonLoader from '../components/SkeletonLoader.vue';
import 'v-calendar/style.css';
import { Calendar } from 'v-calendar';
import { useTheme } from '../composables/useTheme';

const db = getFirestore();
const equipos = ref([]);
const mantenimientosProgramados = ref([]);
const searchTerm = ref('');
const activeFilter = ref('Todos');
const cargando = ref(true);
const { theme } = useTheme();

const calendarioAttrs = computed(() => {
  const eventos = [];

  // 1. Primero, creamos un Set con los IDs de los equipos que ya tienen una programación.
  // Un Set es muy rápido para hacer búsquedas.
  const equiposConProgramacion = new Set(
    mantenimientosProgramados.value.map(p => p.equipoId)
  );

  // 2. Procesamos los mantenimientos programados como siempre.
  mantenimientosProgramados.value.forEach(prog => {
    eventos.push({
      key: prog.id,
      customData: {
        titulo: prog.nombre_display_equipo,
        tipo: 'Programado'
      },
      dates: prog.fecha_programada.toDate(),
      dot: 'purple',
      popover: true,
    });
  });

  // 3. Al procesar los equipos por ciclo, añadimos una condición.
  equipos.value.forEach(equipo => {
    // ¡CONDICIÓN CLAVE! Si el equipo ya tiene una programación, lo saltamos.
    if (equiposConProgramacion.has(equipo.id)) {
      return;
    }

    if (equipo.ultimo_mantenimiento) {
      const fechaUltimo = equipo.ultimo_mantenimiento.toDate();
      const fechaProximo = new Date(fechaUltimo);
      fechaProximo.setDate(fechaProximo.getDate() + (equipo.intervalo_mantenimiento_dias || 90));

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      eventos.push({
        key: equipo.id,
        customData: {
          titulo: equipo.nombre_display,
          tipo: fechaProximo < hoy ? 'Vencido' : 'Por Ciclo'
        },
        dates: fechaProximo,
        dot: fechaProximo < hoy ? 'red' : 'blue',
        popover: true,
      });
    }
  });

  return eventos;
});


// --- El resto del script se mantiene exactamente igual ---
const getEquipoStatus = (equipo) => {
  if (equipo.fuera_de_servicio) return 'Fuera de Servicio';
  if (!equipo.ultimo_mantenimiento) return 'Próximo';

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

  if (activeFilter.value !== 'Todos') {
    equiposTemp = equiposTemp.filter(equipo => getEquipoStatus(equipo) === activeFilter.value);
  }

  if (searchTerm.value) {
    const busquedaMinuscula = searchTerm.value.toLowerCase();
    equiposTemp = equiposTemp.filter(equipo => {
      const nombre = equipo.nombre_display.toLowerCase();
      const ubicacion = (equipo.ubicacion_condensadora || '').toLowerCase();
      return nombre.includes(busquedaMinuscula) || ubicacion.includes(busquedaMinuscula);
    });
  }

  return equiposTemp;
});

const conteoFiltros = computed(() => {
  const conteos = {
    'Todos': equipos.value.length,
    'Al Día': 0,
    'Próximo': 0,
    'Vencido': 0,
    'Fuera de Servicio': 0
  };

  for (const equipo of equipos.value) {
    const estado = getEquipoStatus(equipo);
    if (conteos[estado] !== undefined) {
      conteos[estado]++;
    }
  }
  return conteos;
});

onMounted(() => {
  const q = query(
    collection(db, "equipos"),
    where("estado", "==", "activo"),
    orderBy("nombre_display")
  );
  onSnapshot(q, (querySnapshot) => {
    const equiposTemp = [];
    querySnapshot.forEach((doc) => {
      equiposTemp.push({ id: doc.id, ...doc.data() });
    });
    equipos.value = equiposTemp;
    cargando.value = false;
  });

  const qProgramados = query(collection(db, "mantenimientos_programados"), where("estado", "==", "Programado"));
  onSnapshot(qProgramados, (snapshot) => {
    const programadosTemp = [];
    snapshot.forEach((doc) => {
      programadosTemp.push({ id: doc.id, ...doc.data() });
    });
    mantenimientosProgramados.value = programadosTemp;
  });
});
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-texto-principal">Panel de Mantenimiento</h1>
      <p class="text-texto-secundario">Gestión de Aires Acondicionados</p>
    </div>

    <div class="bg-card p-4 rounded-lg shadow-sm mb-6">
      <h2 class="font-semibold text-texto-principal mb-3">Calendario de Mantenimientos</h2>
      <Calendar is-expanded :attributes="calendarioAttrs" :is-dark="theme === 'dark'" color="teal"
        title-position="left">
        <template #day-popover="{ attributes }">
          <div class="p-2 text-sm bg-card text-texto-principal">
            <p class="font-bold mb-2">Mantenimientos del Día</p>
            <ul>
              <li v-for="attr in attributes" :key="attr.key" class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full" :class="`bg-${attr.dot}-500`"></span>
                <span>{{ attr.customData.titulo }} ({{ attr.customData.tipo }})</span>
              </li>
            </ul>
          </div>
        </template>
      </Calendar>
    </div>

    <div class="bg-card dark:bg-negro_card p-4 rounded-lg shadow-sm mb-6">
      <p class="font-semibold text-texto-principal mb-3">Buscar y Filtrar</p>
      <input v-model="searchTerm" type="text" placeholder="Buscar por habitación, área o ubicación..."
        class="w-full p-2 border rounded-md bg-fondo border-borde focus:ring-2 focus:ring-interactivo focus-within:outline-none">
      <div class="flex flex-wrap gap-2 mt-3">
        <div class="flex flex-wrap gap-2 mt-3">
          <button @click="activeFilter = 'Todos'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Todos', 'bg-fondo text-texto-principal border border-borde': activeFilter !== 'Todos' }"
            class="px-3 py-1 text-sm rounded-full">
            Todos ({{ conteoFiltros['Todos'] }})
          </button>
          <button @click="activeFilter = 'Al Día'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Al Día', 'bg-fondo text-texto-principal border border-borde': activeFilter !== 'Al Día' }"
            class="px-3 py-1 text-sm rounded-full">
            Al Día ({{ conteoFiltros['Al Día'] }})
          </button>
          <button @click="activeFilter = 'Próximo'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Próximo', 'bg-fondo text-texto-principal border border-borde': activeFilter !== 'Próximo' }"
            class="px-3 py-1 text-sm rounded-full">
            Próximas ({{ conteoFiltros['Próximo'] }})
          </button>
          <button @click="activeFilter = 'Vencido'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Vencido', 'bg-fondo text-texto-principal border border-borde': activeFilter !== 'Vencido' }"
            class="px-3 py-1 text-sm rounded-full">
            Vencidas ({{ conteoFiltros['Vencido'] }})
          </button>
          <button @click="activeFilter = 'Fuera de Servicio'"
            :class="{ 'bg-interactivo text-white': activeFilter === 'Fuera de Servicio', 'bg-fondo text-texto-principal border border-borde': activeFilter !== 'Fuera de Servicio' }"
            class="px-3 py-1 text-sm rounded-full">
            Fuera de Servicio ({{ conteoFiltros['Fuera de Servicio'] }})
          </button>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-texto-principal">Equipos ({{ equiposFiltrados.length }})</h2>
      <span class="text-sm text-texto-secundario">Mostrando {{ equiposFiltrados.length }} de {{ equipos.length }}
        equipos</span>
    </div>

    <div v-if="cargando" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="n in 8" :key="n" class="bg-gray-100 dark:bg-gray-800 rounded-lg shadow h-full p-4 space-y-3">
        <SkeletonLoader height="2rem" width="60%" borderRadius="0.5rem" />
        <SkeletonLoader height="1rem" width="40%" />
        <SkeletonLoader height="1.25rem" width="50%" />
        <div class="border-t border-borde mt-3 pt-3">
          <SkeletonLoader height="1rem" width="100%" />
        </div>
      </div>
    </div>

    <div v-else-if="equiposFiltrados.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <EquipoCard v-for="equipo in equiposFiltrados" :key="equipo.id" :equipo="equipo"
        :programado="mantenimientosProgramados.find(p => p.equipoId === equipo.id)" />
    </div>
    <div v-else class="text-center text-gray-500 mt-8">
      <p>No se encontraron equipos.</p>
    </div>
  </div>
</template>