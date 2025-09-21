<script setup>
// src/views/admin/GestionEquipos.vue
import { ref, onMounted } from 'vue';
import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useToast } from 'vue-toastification';
import { PencilSquareIcon, PowerIcon } from '@heroicons/vue/24/solid';
import GestionEquipoModal from '../../components/GestionEquipoModal.vue';
import ConfirmacionModal from '../../components/ConfirmacionModal.vue';
import SkeletonLoader from '../../components/SkeletonLoader.vue';

const toast = useToast();
const db = getFirestore();
const equipos = ref([]);
const cargando = ref(true);

const showGestionModal = ref(false);
const equipoSeleccionado = ref(null);
const confirmacionState = ref({ show: false, titulo: '', mensaje: '', onConfirm: () => { } });

const fetchEquipos = async () => {
    cargando.value = true;
    try {
        const q = query(collection(db, "equipos"), orderBy("nombre_display"));
        const querySnapshot = await getDocs(q);
        const equiposTemp = [];
        querySnapshot.forEach((doc) => {
            equiposTemp.push({ id: doc.id, ...doc.data() });
        });
        equipos.value = equiposTemp;
    } catch (error) {
        toast.error("No se pudo cargar la lista de equipos.");
        console.error(error);
    } finally {
        cargando.value = false;
    }
};

onMounted(fetchEquipos);

const abrirModalCrear = () => {
    equipoSeleccionado.value = null;
    showGestionModal.value = true;
};

const abrirModalEditar = (equipo) => {
    equipoSeleccionado.value = equipo;
    showGestionModal.value = true;
};

const iniciarToggleEstado = (equipo) => {
    const nuevoEstado = equipo.estado === 'activo' ? 'inactivo' : 'activo';
    const accion = nuevoEstado === 'inactivo' ? 'desactivar' : 'reactivar';

    confirmacionState.value = {
        show: true,
        titulo: `Confirmar ${accion}`,
        mensaje: `¿Estás seguro de que quieres ${accion} el equipo  "${equipo.nombre_display}"?`,
        onConfirm: async () => {
            try {
                const docRef = doc(db, 'equipos', equipo.id);
                await updateDoc(docRef, { estado: nuevoEstado });
                toast.success(`Equipo ${accion}do con éxito.`);
                fetchEquipos(); // Refresca la lista
            } catch (error) {
                toast.error(`Error al ${accion} el equipo.`);
            }
        }
    };
};

const manejarConfirmacion = () => {
    if (typeof confirmacionState.value.onConfirm === 'function') {
        confirmacionState.value.onConfirm();
    }
    confirmacionState.value.show = false;
};
</script>

<template>
    <div>
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
                <h2 class="text-xl font-bold text-texto-principal">Gestión de Equipos</h2>
                <p class="text-texto-secundario text-sm">Crea, edita y desactiva las habitaciones y sus equipos.</p>
            </div>
            <button @click="abrirModalCrear"
                class="w-full sm:w-auto bg-interactivo text-sm md:text-base text-white py-2 px-4 rounded-lg font-semibold">
                Crear Equipo
            </button>
        </div>

        <div v-if="cargando" class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="text-xs text-texto-secundario uppercase bg-fondo">
                    <tr>
                        <th class="px-6 py-3 text-left">Equipo</th>
                        <th class="px-6 py-3 text-left">Capacidad</th>
                        <th class="px-6 py-3 text-left">Compresor</th>
                        <th class="px-6 py-3 text-left">Estado</th>
                        <th class="px-6 py-3 text-left">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="n in 5" :key="n" class="border-b border-borde">
                        <td class="px-6 py-4">
                            <SkeletonLoader width="120px" />
                        </td>
                        <td class="px-6 py-4">
                            <SkeletonLoader width="80px" />
                        </td>
                        <td class="px-6 py-4">
                            <SkeletonLoader width="60px" />
                        </td>
                        <td class="px-6 py-4">
                            <SkeletonLoader width="70px" height="24px" borderRadius="999px" />
                        </td>
                        <td class="px-6 py-4 flex items-center gap-4">
                            <SkeletonLoader width="20px" height="20px" />
                            <SkeletonLoader width="20px" height="20px" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div v-else>
            <div v-if="equipos.length === 0">
                <div class="text-center text-sm text-texto-secundario bg-fondo p-4 rounded-md">
                    <p>No hay equipos registrados.</p>
                </div>
            </div>
            <div v-else class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-texto-secundario uppercase bg-fondo">
                        <tr>
                            <th class="px-6 py-3">Habitación</th>
                            <th class="px-6 py-3">Capacidad</th>
                            <th class="px-6 py-3">Compresor</th>
                            <th class="px-6 py-3">Estado</th>
                            <th class="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="equipo in equipos" :key="equipo.id" class="border-b border-borde">
                            <td class="px-6 py-4 font-medium text-texto-principal">{{ equipo.nombre_display }}</td>
                            <td class="px-6 py-4 text-texto-secundario">{{ equipo.capacidad_btu }}</td>
                            <td class="px-6 py-4 text-texto-secundario">{{ equipo.estado_compresor }}</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 text-xs font-semibold rounded-full capitalize"
                                    :class="equipo.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'">
                                    {{ equipo.estado || 'activo' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 flex items-center gap-4">
                                <button @click="abrirModalEditar(equipo)"
                                    class="font-medium text-interactivo hover:underline">
                                    <PencilSquareIcon class="h-5 w-5" />

                                </button>
                                <button @click="iniciarToggleEstado(equipo)" class="font-medium"
                                    :class="equipo.estado === 'activo' ? 'text-status-rojo hover:underline' : 'text-status-verde hover:underline'">
                                    <PowerIcon class="h-5 w-5" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    </div>
    <GestionEquipoModal :show="showGestionModal" :equipo="equipoSeleccionado" @close="showGestionModal = false"
        @guardado="fetchEquipos" />
    <ConfirmacionModal :show="confirmacionState.show" :titulo="confirmacionState.titulo"
        :mensaje="confirmacionState.mensaje" @close="confirmacionState.show = false" @confirm="manejarConfirmacion" />
</template>