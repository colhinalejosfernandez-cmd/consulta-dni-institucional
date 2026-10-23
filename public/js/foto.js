// Esta función recibe los bytes JPG codificados en Base64 desde nuestro servidor.
// No se necesita ninguna biblioteca para que el navegador muestre la fotografía.
function mostrarFotografia(base64) {
  const imagen = document.getElementById('fotoPersona');
  const aviso = document.getElementById('sinFoto');
  imagen.removeAttribute('src');
  imagen.hidden = true;
  aviso.hidden = false;

  if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return;

  imagen.onload = () => {
    aviso.hidden = true;
    imagen.hidden = false;
  };
  imagen.onerror = () => {
    imagen.hidden = true;
    aviso.hidden = false;
    imagen.removeAttribute('src');
  };
  imagen.src = `data:image/jpeg;base64,${base64}`;
}

window.mostrarFotografia = mostrarFotografia;
