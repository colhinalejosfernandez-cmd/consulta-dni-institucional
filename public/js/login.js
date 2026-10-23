const formulario = document.getElementById('formularioAcceso');
const campoUsuario = document.getElementById('usuario');
const campoClave = document.getElementById('clave');
const botonEntrar = document.getElementById('botonEntrar');
const botonMostrar = document.getElementById('mostrarClave');
const mensaje = document.getElementById('mensajeAcceso');

function mostrarMensaje(texto) {
  mensaje.textContent = texto;
  mensaje.hidden = !texto;
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
    mostrarMensaje('Completa el usuario y la contraseña.');
    (!usuario ? campoUsuario : campoClave).focus();
    return;
  }

  botonEntrar.disabled = true;
  botonEntrar.textContent = 'Comprobando acceso…';
  try {
    const respuesta = await fetch('/api/acceso/entrar', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Solicitud-Interna': 'consulta-dni' },
      body: JSON.stringify({ usuario, clave })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.mensaje || 'No fue posible iniciar sesión.');
    window.location.assign('/consulta');
  } catch (error) {
    mostrarMensaje(error.message || 'No fue posible conectar con el servidor.');
  } finally {
    botonEntrar.disabled = false;
    botonEntrar.textContent = 'Iniciar sesión →';
  }
});
