const formulario = document.getElementById('formularioConsulta');
const campoDni = document.getElementById('dni');
const botonConsultar = document.getElementById('botonConsultar');
const botonLimpiar = document.getElementById('botonLimpiar');
const botonSalir = document.getElementById('botonSalir');
const avisoConsulta = document.getElementById('mensajeConsulta');
const estadoInicial = document.getElementById('estadoInicial');
const contenidoResultado = document.getElementById('contenidoResultado');
const etiquetaResultado = document.getElementById('etiquetaResultado');
let consultaActual = null;

function textoDe(campo, valor) {
  document.getElementById(campo).textContent = typeof valor === 'string' && valor.trim() ? valor.trim() : 'No disponible';
}

function mostrarAviso(texto) {
  avisoConsulta.textContent = texto;
  avisoConsulta.hidden = !texto;
}

function ocultarResultado() {
  contenidoResultado.hidden = true;
  etiquetaResultado.hidden = true;
  estadoInicial.hidden = false;
  window.mostrarFotografia(null);
}

function completarResultado(datos) {
  const nombre = [datos.nombres, datos.apellidoPaterno, datos.apellidoMaterno].filter(Boolean).join(' ');
  textoDe('nombreCompleto', nombre);
  textoDe('resultadoDni', datos.dni);
  textoDe('resultadoNombres', datos.nombres);
  textoDe('resultadoPaterno', datos.apellidoPaterno);
  textoDe('resultadoMaterno', datos.apellidoMaterno);
  textoDe('resultadoEstadoCivil', datos.estadoCivil);
  textoDe('resultadoDireccion', datos.direccion);
  textoDe('resultadoUbigeo', datos.ubigeo);
  textoDe('resultadoRestriccion', datos.restriccion);
  window.mostrarFotografia(datos.foto);
  estadoInicial.hidden = true;
  contenidoResultado.hidden = false;
  etiquetaResultado.hidden = false;
}

// Comprueba la sesión antes de mostrar el nombre del trabajador.
async function cargarSesion() {
  try {
    const respuesta = await fetch('/api/acceso/sesion', { cache: 'no-store', credentials: 'same-origin' });
    if (!respuesta.ok) throw new Error();
    const sesion = await respuesta.json();
    if (!sesion.autenticado) return window.location.replace('/login');
    document.getElementById('nombreUsuario').textContent = sesion.usuario;
  } catch {
    mostrarAviso('No pudimos comprobar tu sesión. Actualiza la página.');
  }
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
    mostrarAviso('El DNI debe tener exactamente 8 números.');
    campoDni.focus();
    return;
  }

  if (consultaActual) consultaActual.abort();
  const controlador = new AbortController();
  consultaActual = controlador;
  botonConsultar.disabled = true;
  botonConsultar.textContent = 'Consultando RENIEC…';
  try {
    const respuesta = await fetch('/api/consultas/dni', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Solicitud-Interna': 'consulta-dni' },
      body: JSON.stringify({ dni }),
      signal: controlador.signal
    });
    if (respuesta.status === 401) return window.location.replace('/login');
    const contenido = await respuesta.json();
    if (!respuesta.ok) throw new Error(contenido.mensaje || 'No se pudo completar la consulta.');
    if (!contenido.datos || contenido.datos.dni !== dni) throw new Error('La respuesta recibida no es válida.');
    completarResultado(contenido.datos);
  } catch (error) {
    if (error.name !== 'AbortError') {
      mostrarAviso(error.message || 'No se pudo conectar con el servidor.');
    }
  } finally {
    if (consultaActual === controlador) {
      consultaActual = null;
      botonConsultar.disabled = false;
      botonConsultar.textContent = 'Consultar DNI →';
    }
  }
});

botonLimpiar.addEventListener('click', () => {
  if (consultaActual) {
    consultaActual.abort();
    consultaActual = null;
    botonConsultar.disabled = false;
    botonConsultar.textContent = 'Consultar DNI →';
  }
  formulario.reset();
  mostrarAviso('');
  ocultarResultado();
  campoDni.focus();
});

botonSalir.addEventListener('click', async () => {
  botonSalir.disabled = true;
  try {
    const respuesta = await fetch('/api/acceso/salir', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Solicitud-Interna': 'consulta-dni' },
      body: '{}'
    });
    if (!respuesta.ok) throw new Error();
    window.location.replace('/login');
  } catch {
    mostrarAviso('No pudimos cerrar tu sesión. Inténtalo nuevamente.');
    botonSalir.disabled = false;
  }
});

ocultarResultado();
cargarSesion();
