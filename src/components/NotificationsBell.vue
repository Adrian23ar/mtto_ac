<script setup>
import { ref } from 'vue';
import { useNotifications } from '../composables/useNotifications';
import { BellIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';
import { useRouter } from 'vue-router';

const { notificaciones, notificacionesNoLeidas, marcarTodasComoLeidas } = useNotifications();
const router = useRouter();
const isOpen = ref(false);

const toggleDropdown = () => {
    isOpen.value = !isOpen.value;
    if (isOpen.value && notificacionesNoLeidas.value > 0) {
        marcarTodasComoLeidas();
    }
};

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const irAEquipo = (equipoId) => {
    router.push({ name: 'detalle-equipo', params: { id: equipoId } });
    isOpen.value = false;
};
</script>

<template>
    <div class="relative">
        <button @click="toggleDropdown"
            class="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <BellIcon class="h-6 w-6" />
            <span v-if="notificacionesNoLeidas.value > 0" class="absolute top-1 right-1 flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
        </button>

        <Transition name="fade">
            <div v-if="isOpen">
                <div class="fixed inset-0 z-20" @click="isOpen = false"></div>

                <div class="fixed top-80 left-4 right-4 rounded-lg shadow-xl z-30
                    md:absolute md:top-full md:mt-2 md:left-auto md:w-80 md:right-0
                    bg-card border border-borde">
                    <div class="p-3 border-b border-borde">
                        <h3 class="font-semibold text-texto-principal">Notificaciones</h3>
                    </div>
                    <div class="max-h-96 overflow-y-auto">
                        <div v-if="notificaciones.length === 0" class="text-center text-texto-secundario text-sm p-6">
                            <CheckCircleIcon class="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>No tienes notificaciones.</p>
                        </div>
                        <ul v-else>
                            <li v-for="notif in notificaciones" :key="notif.id" @click="irAEquipo(notif.equipoId)"
                                class="p-3 hover:bg-fondo cursor-pointer border-b border-borde last:border-b-0"
                                :class="{ 'font-semibold': !notif.leida, 'text-texto-secundario': notif.leida }">
                                <p class="text-sm text-texto-principal">{{ notif.mensaje }}</p>
                                <p class="text-xs text-texto-secundario mt-1">{{ formatDate(notif.fecha_evento) }}</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease-out;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>