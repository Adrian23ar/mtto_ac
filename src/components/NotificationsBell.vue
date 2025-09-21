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
    // Ahora no marcamos como leídas al abrir, el usuario lo hará con el botón.
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
            <span v-if="notificacionesNoLeidas > 0" class="absolute top-1 right-1.5 flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
        </button>

        <Transition name="fade">
            <div v-if="isOpen">
                <div class="fixed inset-0 z-20" @click="isOpen = false"></div>

                <div class="fixed top-[18.8rem] left-4 right-4 rounded-lg shadow-xl z-30
                    md:absolute md:top-full md:mt-2 md:left-auto md:w-80 md:right-0
                    bg-card border border-borde">

                    <div class="p-3 border-b border-borde flex justify-between items-center">
                        <h3 class="font-semibold text-texto-principal">Notificaciones</h3>
                        <button v-if="notificacionesNoLeidas > 0" @click="marcarTodasComoLeidas"
                            class="text-xs text-interactivo hover:underline font-semibold">
                            Marcar todas como leídas
                        </button>
                    </div>

                    <div class="max-h-96 overflow-y-auto">
                        <div v-if="notificaciones.length === 0" class="text-center text-texto-secundario text-sm p-6">
                            <CheckCircleIcon class="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p>No tienes notificaciones.</p>
                        </div>
                        <ul v-else>
                            <li v-for="notif in notificaciones" :key="notif.id" @click="irAEquipo(notif.equipoId)"
                                class="p-3 hover:bg-fondo cursor-pointer border-b border-borde last:border-b-0 flex items-center gap-3">

                                <div class="w-2 h-2">
                                    <span v-if="!notif.leida" class="block h-2 w-2 rounded-full bg-red-500"></span>
                                </div>

                                <div class="flex-1">
                                    <p class="text-sm text-texto-principal" :class="{ 'font-semibold': !notif.leida }">
                                        {{ notif.mensaje }}</p>
                                    <p class="text-xs text-texto-secundario mt-1">{{ formatDate(notif.fecha_evento) }}
                                    </p>
                                </div>
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