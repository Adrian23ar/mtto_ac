<script setup>
import { ref, watchEffect } from 'vue';
import { useToast } from 'vue-toastification';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const props = defineProps({
    show: { type: Boolean, default: false },
    equipo: { type: Object, default: null } // Si pasamos un equipo, estamos en modo edición
});
const emit = defineEmits(['close', 'guardado']);

const toast = useToast();
const db = getFirestore();
const formData = ref({});
const isSaving = ref(false);

const opcionesCapacidad = ['12,000 BTU', '18,000 BTU', '24,000 BTU', '36,000 BTU', '48,000 BTU', '5 Toneladas', '7.5 Toneladas', '10 Toneladas'];
const opcionesCompresor = ['Bueno', 'Regular', 'Deficiente'];

// Este 'watchEffect' se ejecuta cada vez que el modal se abre.
// Pre-llena el formulario si estamos editando, o lo resetea si estamos creando.
watchEffect(() => {
    if (props.show) {
        if (props.equipo) {
            // MODO EDICIÓN: Copiamos los datos del equipo existente
            formData.value = { ...props.equipo };
        } else {
            // MODO CREACIÓN: Establecemos valores por defecto
            formData.value = {
                numero_habitacion: '',
                ubicacion_condensadora: '',
                capacidad_btu: '12,000 BTU',
                estado_compresor: 'Bueno',
                intervalo_mantenimiento_dias: 90,
                observaciones_permanentes: '',
                estado: 'activo' // Todos los equipos nuevos se crean como 'activos'
            };
        }
    }
});

const handleSubmit = async () => {
    const numHabitacion = formData.value.numero_habitacion?.trim();
    if (!numHabitacion) {
        return toast.error('El número de habitación es obligatorio.');
    }

    isSaving.value = true;
    try {
        const docRef = doc(db, 'equipos', numHabitacion);

        if (props.equipo) {
            // MODO EDICIÓN: Simplemente actualizamos el documento
            await updateDoc(docRef, formData.value);
            toast.success(`Habitación ${numHabitacion} actualizada con éxito.`);
        } else {
            // MODO CREACIÓN: Primero verificamos si el documento ya existe
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                toast.error(`La habitación ${numHabitacion} ya existe. No se puede duplicar.`);
                return; // Detenemos la ejecución
            }
            // Si no existe, creamos el nuevo documento
            await setDoc(docRef, formData.value);
            toast.success(`Habitación ${numHabitacion} creada con éxito.`);
        }
        emit('guardado');
        emit('close');
    } catch (error) {
        toast.error('Ocurrió un error al guardar el equipo.');
        console.error(error);
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
    <Transition name="modal-fade">
        <div v-if="show" class="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div class="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
                <form @submit.prevent="handleSubmit">
                    <div class="p-4 border-b border-borde">
                        <h2 class="text-xl font-bold text-texto-principal">{{ equipo ? 'Editar Equipo' : 'Crear Nuevo Equipo' }}</h2>
                    </div>
                    <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Número de
                                Habitación</label>
                            <input v-model="formData.numero_habitacion" type="text" required :disabled="!!equipo"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-secundario disabled:bg-gray-200 dark:disabled:bg-gray-700">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Ubicación
                                Condensadora</label>
                            <input v-model="formData.ubicacion_condensadora" type="text"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Capacidad</label>
                            <select v-model="formData.capacidad_btu"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal">
                                <option v-for="op in opcionesCapacidad" :key="op" :value="op">{{ op }}</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Estado del
                                Compresor</label>
                            <select v-model="formData.estado_compresor"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal">
                                <option v-for="op in opcionesCompresor" :key="op" :value="op">{{ op }}</option>
                            </select>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Intervalo de
                                Mantenimiento (días)</label>
                            <input v-model="formData.intervalo_mantenimiento_dias" type="number" min="1" required
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Observaciones
                                Permanentes</label>
                            <textarea v-model="formData.observaciones_permanentes" rows="3"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal"></textarea>
                        </div>
                    </div>
                    <div class="p-4 bg-fondo flex justify-end gap-3 rounded-b-lg">
                        <button @click="$emit('close')" type="button" class="bg-gray-200 dark:bg-gray-700 text-texto-principal px-4 py-2 rounded-lg font-semibold text-sm">Cancelar</button>
                        <button type="submit" :disabled="isSaving" class="bg-interactivo text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:bg-gray-400">{{ isSaving ? 'Guardando...' : 'Guardar'
                            }}</button>
                    </div>
                </form>
            </div>
        </div>
    </Transition>
</template>
<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: all 0.2s ease-out;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
    transform: scale(0.95);
}
</style>