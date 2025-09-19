<script setup>
import { ref, watchEffect, computed } from 'vue';
import { useToast } from 'vue-toastification';
// ¡Importante! Añadimos addDoc y collection
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';

const props = defineProps({
    show: { type: Boolean, default: false },
    equipo: { type: Object, default: null }
});
const emit = defineEmits(['close', 'guardado']);

const toast = useToast();
const db = getFirestore();
const formData = ref({});
const isSaving = ref(false);

const opcionesCapacidad = ['12,000 BTU', '18,000 BTU', '24,000 BTU', '36,000 BTU', '48,000 BTU', '5 Toneladas', '7.5 Toneladas', '10 Toneladas'];
const opcionesCompresor = ['Bueno', 'Regular', 'Deficiente'];

// Un 'computed' para cambiar la etiqueta del campo dinámicamente
const labelIdentificador = computed(() => {
    return formData.value.tipo === 'habitacion' ? 'Número de Habitación' : 'Nombre del Área';
});

watchEffect(() => {
    if (props.show) {
        if (props.equipo) {
            // MODO EDICIÓN: Copiamos los datos del equipo existente
            formData.value = { ...props.equipo };
        } else {
            // MODO CREACIÓN: Establecemos valores por defecto con la nueva estructura
            formData.value = {
                tipo: 'habitacion', // Por defecto será 'habitación'
                identificador: '',
                nombre_display: '',
                ubicacion_condensadora: '',
                capacidad_btu: '12,000 BTU',
                estado_compresor: 'Bueno',
                intervalo_mantenimiento_dias: 90,
                observaciones_permanentes: '',
                estado: 'activo'
            };
        }
    }
});

const handleSubmit = async () => {
    const identificador = formData.value.identificador?.trim();
    if (!identificador) {
        return toast.error(`El campo "${labelIdentificador.value}" es obligatorio.`);
    }

    isSaving.value = true;
    try {
        // Generamos el nombre para mostrar
        if (formData.value.tipo === 'habitacion') {
            formData.value.nombre_display = `Habitación ${identificador}`;
        } else {
            formData.value.nombre_display = identificador;
        }

        if (props.equipo) {
            // MODO EDICIÓN: Actualizamos el documento existente usando su ID automático
            const docRef = doc(db, 'equipos', props.equipo.id);
            await updateDoc(docRef, formData.value);
            toast.success(`Equipo "${formData.value.nombre_display}" actualizado con éxito.`);
        } else {
            // MODO CREACIÓN: Usamos addDoc para crear un nuevo documento con ID automático
            await addDoc(collection(db, 'equipos'), formData.value);
            toast.success(`Equipo "${formData.value.nombre_display}" creado con éxito.`);
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
                            <label class="block text-sm font-semibold text-texto-principal mb-1">Tipo de Área</label>
                            <select v-model="formData.tipo" :disabled="!!equipo"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal disabled:bg-gray-200 dark:disabled:bg-gray-700">
                                <option value="habitacion">Habitación</option>
                                <option value="area_comun">Área Común</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-texto-principal mb-1">{{ labelIdentificador
                                }}</label>
                            <input v-model="formData.identificador" type="text" required :disabled="!!equipo"
                                class="w-full p-2 border rounded-md bg-fondo border-borde text-texto-principal disabled:bg-gray-200 dark:disabled:bg-gray-700">
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
                        <div>
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
                        <button @click="$emit('close')" type="button"
                            class="bg-gray-200 dark:bg-gray-700 text-texto-principal px-4 py-2 rounded-lg font-semibold text-sm">Cancelar</button>
                        <button type="submit" :disabled="isSaving"
                            class="bg-interactivo text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:bg-gray-400">{{
                                isSaving ? 'Guardando...' : 'Guardar'
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