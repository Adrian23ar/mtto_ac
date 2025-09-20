// src/composables/useNotifications.js
import { ref, watch } from 'vue';
import { getFirestore, collection, onSnapshot, query, where, writeBatch, Timestamp, getDocs, doc, orderBy } from 'firebase/firestore';
import { useAuth } from './useAuth';

const notificaciones = ref([]);
const notificacionesNoLeidas = ref(0);
// Para evitar que la generación se ejecute en cada recarga de página, solo en el inicio de sesión.
let haGeneradoNotificaciones = false;

export function useNotifications() {
    const { userProfile } = useAuth();
    const db = getFirestore();
    let listener = null;

    const generarNotificacionesPendientes = async () => {
        if (!userProfile.value || haGeneradoNotificaciones) return;
        haGeneradoNotificaciones = true; // Marcamos para que no se repita en esta sesión.

        const batch = writeBatch(db);
        const hoy = new Date();
        const limiteDias = 7; // Notificar con 7 días de antelación
        const fechaLimite = new Date(hoy);
        fechaLimite.setDate(hoy.getDate() + limiteDias);

        // 1. Obtener notificaciones existentes para no duplicar
        const notificacionesActualesRef = collection(db, 'usuarios', userProfile.value.uid, 'notificaciones');
        const notificacionesSnapshot = await getDocs(notificacionesActualesRef);
        const notificacionesExistentes = new Set();
        notificacionesSnapshot.forEach(doc => {
            // Creamos una clave única para cada notificación potencial
            const data = doc.data();
            const fechaEvento = data.fecha_evento.toDate();
            const key = `${data.equipoId}_${fechaEvento.toISOString().split('T')[0]}`;
            notificacionesExistentes.add(key);
        });

        // 2. Obtener todos los equipos y programaciones
        const equiposRef = collection(db, 'equipos');
        const programadosRef = collection(db, 'mantenimientos_programados');
        const [equiposSnapshot, programadosSnapshot] = await Promise.all([
            getDocs(query(equiposRef, where("estado", "==", "activo"))),
            getDocs(query(programadosRef, where("estado", "==", "Programado"), where("fecha_programada", "<=", Timestamp.fromDate(fechaLimite))))
        ]);

        // 3. Procesar mantenimientos por CICLO
        equiposSnapshot.forEach(equipoDoc => {
            const equipo = { id: equipoDoc.id, ...equipoDoc.data() };
            if (!equipo.ultimo_mantenimiento) return;

            const fechaProximo = equipo.ultimo_mantenimiento.toDate();
            fechaProximo.setDate(fechaProximo.getDate() + equipo.intervalo_mantenimiento_dias);

            if (fechaProximo >= hoy && fechaProximo <= fechaLimite) {
                const key = `${equipo.id}_${fechaProximo.toISOString().split('T')[0]}`;
                if (!notificacionesExistentes.has(key)) {
                    const nuevaNotifRef = doc(collection(db, 'usuarios', userProfile.value.uid, 'notificaciones'));
                    batch.set(nuevaNotifRef, {
                        mensaje: `Mantenimiento por ciclo para "${equipo.nombre_display}" está próximo.`,
                        equipoId: equipo.id,
                        leida: false,
                        fecha_evento: Timestamp.fromDate(fechaProximo),
                        createdAt: Timestamp.now()
                    });
                }
            }
        });

        // 4. Procesar mantenimientos PROGRAMADOS
        programadosSnapshot.forEach(progDoc => {
            const prog = { id: progDoc.id, ...progDoc.data() };
            const fechaProgramada = prog.fecha_programada.toDate();
            const key = `${prog.equipoId}_${fechaProgramada.toISOString().split('T')[0]}`;

            // Reglas de visibilidad
            const esAdmin = userProfile.value.rol === 'admin';
            const esCreador = prog.creado_por_uid === userProfile.value.uid;

            if ((esAdmin || esCreador) && !notificacionesExistentes.has(key)) {
                const nuevaNotifRef = doc(collection(db, 'usuarios', userProfile.value.uid, 'notificaciones'));
                batch.set(nuevaNotifRef, {
                    mensaje: `Hay un mantenimiento programado para "${prog.nombre_display_equipo}".`,
                    equipoId: prog.equipoId,
                    leida: false,
                    fecha_evento: prog.fecha_programada,
                    createdAt: Timestamp.now()
                });
            }
        });

        await batch.commit();
    };

    const iniciarListenerNotificaciones = () => {
        if (!userProfile.value) return;
        const notificacionesRef = collection(db, 'usuarios', userProfile.value.uid, 'notificaciones');
        const q = query(notificacionesRef, orderBy('createdAt', 'desc'));
        if (listener) listener();
        listener = onSnapshot(q, (snapshot) => {
            const tempNotificaciones = [];
            let contadorNoLeidas = 0;
            snapshot.forEach(doc => {
                const notificacion = { id: doc.id, ...doc.data() };
                tempNotificaciones.push(notificacion);
                if (!notificacion.leida) contadorNoLeidas++;
            });
            notificaciones.value = tempNotificaciones;
            notificacionesNoLeidas.value = contadorNoLeidas;
        });
    };

    const detenerListenerNotificaciones = () => {
        if (listener) listener();
        listener = null;
        notificaciones.value = [];
        notificacionesNoLeidas.value = 0;
        haGeneradoNotificaciones = false; // Permitir regenerar en el próximo inicio de sesión
    };

    const marcarTodasComoLeidas = async () => {
        if (!userProfile.value || notificacionesNoLeidas.value === 0) return;
        const batch = writeBatch(db);
        notificaciones.value.forEach(notif => {
            if (!notif.leida) {
                const notifRef = doc(db, 'usuarios', userProfile.value.uid, 'notificaciones', notif.id);
                batch.update(notifRef, { leida: true });
            }
        });
        await batch.commit();
    };

    watch(userProfile, (newUser, oldUser) => {
        if (newUser && !oldUser) {
            iniciarListenerNotificaciones();
            generarNotificacionesPendientes(); // Generamos al iniciar sesión
        } else if (!newUser && oldUser) {
            detenerListenerNotificaciones();
        }
    }, { immediate: true }); // immediate: true para que se ejecute al cargar la app si ya hay un usuario

    return {
        notificaciones,
        notificacionesNoLeidas,
        marcarTodasComoLeidas
    };
}