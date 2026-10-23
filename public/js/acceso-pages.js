'use strict';

const formulario = document.getElementById('formularioAcceso');
const campoUsuario = document.getElementById('usuario');
const campoClave = document.getElementById('clave');
const botonEntrar = document.getElementById('botonEntrar');
const botonMostrar = document.getElementById('mostrarClave');
const mensaje = document.getElementById('mensajeAcceso');
const urlApi = String(window.CONFIGURACION_CONSULTA?.urlApi || '').replace(/\/+$/, '');

function mostrarMensaje(texto) {
  mensaje.textContent = texto;
  mensaje.hidden = !texto;
}

async function leerRespuesta(respuesta) {
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo comprobar el acceso.');
  return datos;
}

botonMostrar.addEventListener('click', () => {
  const visible = campoClave.type === 'text';
  campoClave.type = visible ? 'password' : 'text';
  botonMostrar.textContent = visible ? 'Mostrar' : 'Ocultar';
  botonMostrar.setAttribute('aria-pressed', String(!visible));
  botonMostrar.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  mostrarMensaje('');
  const usuario = campoUsuario.value.trim();
  const clave = campoClave.value;
  if (!usuario || !clave) {
    mostrarMensaje('Escribe tu usuario y contraseña.');
    (!usuario ? campoUsuario : campoClave).focus();
    return;
  }
  if (!urlApi || !/^https:\/\//i.test(urlApi)) {
    mostrarMensaje('El acceso aún no está habilitado. Falta configurar la conexión segura del sistema.');
    return;
  }

  botonEntrar.disabled = true;
  botonEntrar.textContent = 'Comprobando acceso…';
  try {
    const respuesta = await fetch(`${urlApi}/api/acceso/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, clave }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000)
    });
    const datos = await leerRespuesta(respuesta);
    if (typeof datos.token !== 'string' || !datos.token) throw new Error('La respuesta del acceso no es válida.');
    sessionStorage.setItem('consultaDniToken', datos.token);
    sessionStorage.setItem('consultaDniUsuario', datos.usuario || usuario);
    window.location.assign('./consulta.html');
  } catch (error) {
    mostrarMensaje(error.name === 'TimeoutError'
      ? 'El servicio tardó demasiado en responder.'
      : error instanceof TypeError
        ? 'No se pudo conectar con el servicio de acceso.'
        : (error.message || 'No fue posible iniciar sesión.'));
  } finally {
    botonEntrar.disabled = false;
    botonEntrar.textContent = 'Iniciar sesión →';
    campoClave.value = '';
  }
});

// Una sesión ya existente sigue siendo validada por el servicio protegido.
(async () => {
  const token = sessionStorage.getItem('consultaDniToken');
  if (!token || !urlApi) return;
  try {
    const respuesta = await fetch(`${urlApi}/api/acceso/sesion`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
    });
    if (respuesta.ok) window.location.replace('./consulta.html');
    else { sessionStorage.removeItem('consultaDniToken'); sessionStorage.removeItem('consultaDniUsuario'); }
  } catch { /* No impide que el usuario vuelva a iniciar sesión. */ }
})();
