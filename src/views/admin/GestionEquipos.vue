<script setup>
import { ref, onMounted } from 'vue';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from 'vue-toastification';

const toast = useToast();
const db = getFirestore();
const equipos = ref([]);
const cargando = ref(true);

const fetchEquipos = async () => {
    cargando.value = true;
    try {
        const q = query(collection(db, "equipos"), orderBy("numero_habitacion"));
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
</script>

<template>
    <div>
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-xl font-bold text-texto-principal">Gestión de Equipos</h2>
                <p class="text-texto-secundario text-sm">Crea, edita y desactiva las habitaciones y sus equipos.</p>
            </div>
            <button class="bg-interactivo text-sm md:text-base text-white py-2 px-4 rounded-lg font-semibold">
                Crear Equipo
            </button>
        </div>

        <div v-if="cargando">Cargando equipos...</div>
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
                        <td class="px-6 py-4 font-medium text-texto-principal">{{ equipo.numero_habitacion }}</td>
                        <td class="px-6 py-4 text-texto-secundario">{{ equipo.capacidad_btu }}</td>
                        <td class="px-6 py-4 text-texto-secundario">{{ equipo.estado_compresor }}</td>
                        <td class="px-6 py-4">
                        </td>
                        <td class="px-6 py-4 flex items-center gap-4">
                            <button class="font-medium text-interactivo hover:underline">Editar</button>
                            <button class="font-medium text-status-rojo hover:underline">Desactivar</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>