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

// Pre-llena el formulario si estamos editando, o lo resetea si estamos creando
watchEffect(() => {
    if (props.show) {
        if (props.equipo) {
            formData.value = { ...props.equipo };
        } else {
            formData.value = {
                numero_habitacion: '',
                capacidad_btu: '12,000 BTU',
                estado_compresor: 'Bueno',
                intervalo_mantenimiento_dias: 90,
                estado: 'activo'
            };
        }
    }
});

const handleSubmit = async () => {
    if (!formData.value.numero_habitacion?.trim()) {
        return toast.error('El número de habitación es obligatorio.');
    }
    isSaving.value = true;
    try {
        const docId = formData.value.numero_habitacion.trim();
        const docRef = doc(db, 'equipos', docId);

        if (props.equipo) {
            // MODO EDICIÓN
            await updateDoc(docRef, formData.value);
            toast.success('Equipo actualizado con éxito.');
        } else {
            // MODO CREACIÓN
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                toast.error(`La habitación ${docId} ya existe.`);
                return;
            }
            await setDoc(docRef, formData.value);
            toast.success('Equipo creado con éxito.');
        }
        emit('guardado');
        emit('close');
    } catch (error) {
        toast.error('Error al guardar el equipo.');
        console.error(error);
    } finally {
        isSaving.value = false;
    }
};
</script>

<template>
</template>