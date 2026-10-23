'use strict';

const urlApi = String(window.CONFIGURACION_CONSULTA?.urlApi || '').replace(/\/+$/, '');
const formulario = document.getElementById('formularioConsulta');
const campoDni = document.getElementById('dni');
const botonConsultar = document.getElementById('botonConsultar');
const botonLimpiar = document.getElementById('botonLimpiar');
const botonSalir = document.getElementById('botonSalir');
const aviso = document.getElementById('mensajeConsulta');
const estadoInicial = document.getElementById('estadoInicial');
const contenidoResultado = document.getElementById('contenidoResultado');
const etiquetaResultado = document.getElementById('etiquetaResultado');
let consultaActual = null;

function tokenActual() { return sessionStorage.getItem('consultaDniToken'); }
function cerrarSesion() {
  sessionStorage.removeItem('consultaDniToken');
  sessionStorage.removeItem('consultaDniUsuario');
  window.location.replace('./index.html');
}
function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.hidden = !texto;
}
function ponerTexto(id, valor) {
  document.getElementById(id).textContent = typeof valor === 'string' && valor.trim() ? valor.trim() : 'No disponible';
}
function ocultarResultado() {
  contenidoResultado.hidden = true;
  etiquetaResultado.hidden = true;
  estadoInicial.hidden = false;
  window.mostrarFotografia(null);
}
function completarResultado(datos) {
  const nombre = [datos.nombres, datos.apellidoPaterno, datos.apellidoMaterno].filter(Boolean).join(' ');
  ponerTexto('nombreCompleto', nombre);
  ponerTexto('resultadoDni', datos.dni);
  ponerTexto('resultadoNombres', datos.nombres);
  ponerTexto('resultadoPaterno', datos.apellidoPaterno);
  ponerTexto('resultadoMaterno', datos.apellidoMaterno);
  ponerTexto('resultadoEstadoCivil', datos.estadoCivil);
  ponerTexto('resultadoDireccion', datos.direccion);
  ponerTexto('resultadoUbigeo', datos.ubigeo);
  ponerTexto('resultadoRestriccion', datos.restriccion);
  window.mostrarFotografia(datos.foto);
  estadoInicial.hidden = true;
  contenidoResultado.hidden = false;
  etiquetaResultado.hidden = false;
}

campoDni.addEventListener('input', () => {
  campoDni.value = campoDni.value.replace(/\D/g, '').slice(0, 8);
  mostrarAviso('');
});

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  mostrarAviso('');
  ocultarResultado();
  const dni = campoDni.value.trim();
  if (!/^\d{8}$/.test(dni)) {
    mostrarAviso('El DNI debe tener exactamente ocho números.');
    campoDni.focus();
    return;
  }
  if (!urlApi || !/^https:\/\//i.test(urlApi)) {
    mostrarAviso('Las consultas todavía no están habilitadas. Falta configurar el servicio institucional.');
    return;
  }
  const token = tokenActual();
  if (!token) return cerrarSesion();

  if (consultaActual) consultaActual.abort();
  const controlador = new AbortController();
  consultaActual = controlador;
  botonConsultar.disabled = true;
  botonConsultar.textContent = 'Consultando RENIEC…';
  const tiempoMaximo = setTimeout(() => controlador.abort(), 20000);
  try {
    const respuesta = await fetch(`${urlApi}/api/consultas/dni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dni }),
      cache: 'no-store',
      signal: controlador.signal
    });
    if (respuesta.status === 401) return cerrarSesion();
    const contenido = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(contenido.mensaje || 'No se pudo completar la consulta.');
    if (!contenido.datos || contenido.datos.dni !== dni) throw new Error('La respuesta recibida no es válida.');
    completarResultado(contenido.datos);
  } catch (error) {
    if (consultaActual === controlador) mostrarAviso(error.name === 'AbortError'
      ? 'La consulta tardó demasiado en responder.'
      : (error.message || 'No fue posible comunicarse con el servicio.'));
  } finally {
    clearTimeout(tiempoMaximo);
    if (consultaActual === controlador) {
      consultaActual = null;
      botonConsultar.disabled = false;
      botonConsultar.textContent = 'Consultar DNI →';
    }
  }
});

botonLimpiar.addEventListener('click', () => {
  if (consultaActual) consultaActual.abort();
  consultaActual = null;
  botonConsultar.disabled = false;
  botonConsultar.textContent = 'Consultar DNI →';
  formulario.reset();
  mostrarAviso('');
  ocultarResultado();
  campoDni.focus();
});

botonSalir.addEventListener('click', () => {
  if (consultaActual) consultaActual.abort();
  cerrarSesion();
});

ocultarResultado();
(async () => {
  const token = tokenActual();
  if (!token) return cerrarSesion();
  if (!urlApi || !/^https:\/\//i.test(urlApi)) {
    mostrarAviso('La conexión del sistema aún no está configurada.');
    return;
  }
  try {
    const respuesta = await fetch(`${urlApi}/api/acceso/sesion`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
    });
    if (!respuesta.ok) return cerrarSesion();
    const sesion = await respuesta.json();
    document.getElementById('nombreUsuario').textContent = sesion.usuario || 'Personal autorizado';
  } catch {
    mostrarAviso('No se pudo verificar tu sesión. Revisa la conexión e inténtalo nuevamente.');
  }
})();
