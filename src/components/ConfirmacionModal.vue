<script setup>
defineProps({
    show: { type: Boolean, required: true },
    titulo: { type: String, default: 'Confirmar Acción' },
    mensaje: { type: String, required: true },
    textoConfirmar: { type: String, default: 'Confirmar' }
});

defineEmits(['close', 'confirm']);
</script>

<template>
    <Transition name="modal-fade">
        <div v-if="show" class="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">

            <div class="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
                <div class="p-4 border-b">
                    <h3 class="text-lg font-bold text-gray-900">{{ titulo }}</h3>
                </div>

                <div class="p-6">
                    <p class="text-sm text-gray-600">{{ mensaje }}</p>
                </div>

                <div class="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                    <button @click="$emit('close')" type="button"
                        class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button @click="$emit('confirm')" type="button"
                        class="bg-status-rojo text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors">
                        {{ textoConfirmar }}
                    </button>
                </div>
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
}

.modal-fade-enter-from .transform,
.modal-fade-leave-to .transform {
    transform: scale(0.95);
}
</style>