<script setup>
import { ref, onMounted } from 'vue';
import { getFirestore, collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useToast } from 'vue-toastification';
import CrearUsuarioModal from '../../components/CrearUsuarioModal.vue';
import EditarUsuarioModal from '../../components/EditarUsuarioModal.vue';
import ConfirmacionModal from '../../components/ConfirmacionModal.vue';

//iconos para editar y desactivar/activar
import { PencilSquareIcon, PowerIcon, XMarkIcon } from '@heroicons/vue/24/solid';

const toast = useToast();
const db = getFirestore();
const usuarios = ref([]);
const cargando = ref(true);
const showCrearModal = ref(false);
const showEditarModal = ref(false);
const usuarioSeleccionado = ref(null);

const iniciarEdicion = (usuario) => {
  usuarioSeleccionado.value = usuario;
  showEditarModal.value = true;
};
const confirmacionState = ref({ show: false, titulo: '', mensaje: '', onConfirm: () => { } });


// Creamos una función para poder llamarla de nuevo cuando se cree un usuario
const fetchUsuarios = async () => {
  cargando.value = true;
  try {
    const q = query(collection(db, "usuarios"), orderBy("nombre_completo"));
    const querySnapshot = await getDocs(q);
    const usuariosTemp = [];
    querySnapshot.forEach((doc) => {
      usuariosTemp.push({ uid: doc.id, ...doc.data() });
    });
    usuarios.value = usuariosTemp;
  } catch (error) {
    toast.error("No se pudo cargar la lista de usuarios.");
  } finally {
    cargando.value = false;
  }
};

onMounted(fetchUsuarios);

// Función para iniciar la desactivación/reactivación
const toggleEstadoUsuario = (usuario) => {
  const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
  const accion = nuevoEstado === 'inactivo' ? 'desactivar' : 'reactivar';

  confirmacionState.value = {
    show: true,
    titulo: `Confirmar ${accion}`,
    mensaje: `¿Estás seguro de que quieres ${accion} al usuario ${usuario.nombre_completo}?`,
    onConfirm: async () => {
      try {
        const userDocRef = doc(db, 'usuarios', usuario.uid);
        await updateDoc(userDocRef, { estado: nuevoEstado });
        toast.success(`Usuario ${accion}do con éxito.`);
        fetchUsuarios(); // Refresca la lista
      } catch (error) {
        toast.error(`Error al ${accion} el usuario.`);
        console.error(error);
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

// Obtenemos la config de Firebase para pasarla al modal
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl font-bold text-texto-principal">Gestión de Usuarios</h1>
        <p class="text-texto-secundario text-sm">Aquí podrás crear, ver, editar y eliminar usuarios.</p>
      </div>
      <button @click="showCrearModal = true"
        class="bg-interactivo text-white text-sm md:text-base py-2 px-4 rounded-lg font-semibold">
        Crear Usuario
      </button>
    </div>

    <div v-if="cargando">Cargando...</div>
    <div v-else class="bg-card p-4 rounded-lg overflow-x-auto">
      <table class="w-full text-sm text-left ">
        <thead class="text-xs text-texto-secundario uppercase bg-fondo">
          <tr>
            <th class="px-6 py-3">Nombre Completo</th>
            <th class="px-6 py-3">Usuario</th>
            <th class="px-6 py-3">Rol</th>
            <th class="px-6 py-3">Estado</th>
            <th class="px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="usuario in usuarios" :key="usuario.uid" class="border-b border-borde">
            <td class="px-6 py-4 font-medium text-texto-principal">{{ usuario.nombre_completo }}</td>
            <td class="px-6 py-4 text-texto-secundario">{{ usuario.email.split('@')[0] }}</td>
            <td class="px-6 py-4 text-texto-secundario">{{ usuario.rol }}</td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 text-xs font-semibold rounded-full"
                :class="usuario.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'">
                {{ usuario.estado }}
              </span>
            </td>
            <td class="px-6 py-4 flex items-center gap-4">
              <button @click="iniciarEdicion(usuario)" class="font-medium text-interactivo hover:underline">
                <PencilSquareIcon class="h-5 w-5" />
              </button>
              <button @click="toggleEstadoUsuario(usuario)" class="font-medium"
                :class="usuario.estado === 'activo' ? 'text-status-rojo hover:underline' : 'text-status-verde hover:underline'">
                <PowerIcon class="h-5 w-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <CrearUsuarioModal :show="showCrearModal" :firebaseConfig="firebaseConfig" @close="showCrearModal = false"
    @usuarioCreado="fetchUsuarios" />
  <EditarUsuarioModal :show="showEditarModal" :usuario="usuarioSeleccionado" @close="showEditarModal = false"
    @usuarioActualizado="fetchUsuarios" />
  <ConfirmacionModal :show="confirmacionState.show" :titulo="confirmacionState.titulo"
    :mensaje="confirmacionState.mensaje" @close="confirmacionState.show = false" @confirm="manejarConfirmacion" />
</template>