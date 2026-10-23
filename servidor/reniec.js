const SERVICIO_RENIEC = 'https://ws2.pide.gob.pe/Rest/RENIEC/Consultar?out=json';

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function prepararFotografia(valor) {
  if (!valor) return null;

  let base64 = '';
  if (typeof valor === 'string') {
    base64 = valor.replace(/^data:image\/jpeg;base64,/i, '').replace(/\s/g, '');
  } else if (Array.isArray(valor) && valor.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
    base64 = Buffer.from(valor).toString('base64');
  } else if (valor?.type === 'Buffer' && Array.isArray(valor.data)) {
    base64 = Buffer.from(valor.data).toString('base64');
  }

  if (!base64 || base64.length > 4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;

  // La ficha indica que la fotografía tiene formato JPG.
  const encabezado = Buffer.from(base64.slice(0, 12), 'base64');
  if (encabezado.length < 3 || encabezado[0] !== 0xff || encabezado[1] !== 0xd8 || encabezado[2] !== 0xff) {
    return null;
  }
  return base64;
}

function prepararDatos(persona) {
  return {
    nombres: texto(persona.prenombres),
    apellidoPaterno: texto(persona.apPrimer),
    apellidoMaterno: texto(persona.apSegundo),
    estadoCivil: texto(persona.estadoCivil),
    direccion: texto(persona.direccion),
    ubigeo: texto(persona.ubigeo),
    restriccion: texto(persona.restriccion),
    foto: prepararFotografia(persona.foto)
  };
}

async function consultarDni(dni) {
  const dniUsuario = process.env.DNI_USUARIO_PIDE;
  const rucEntidad = process.env.RUC_ENTIDAD_PIDE;
  const clave = process.env.CLAVE_PIDE;

  if (!/^\d{8}$/.test(dniUsuario || '') || !/^\d{11}$/.test(rucEntidad || '') || !clave) {
    const error = new Error('El acceso a PIDE todavía no está configurado.');
    error.tipo = 'CONFIGURACION';
    throw error;
  }

  const respuesta = await fetch(SERVICIO_RENIEC, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      PIDE: {
        nuDniConsulta: dni,
        nuDniUsuario: dniUsuario,
        nuRucUsuario: rucEntidad,
        password: clave
      }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!respuesta.ok) throw new Error(`Respuesta HTTP ${respuesta.status} de PIDE.`);

  let contenido;
  try {
    contenido = await respuesta.json();
  } catch {
    throw new Error('PIDE no devolvió información JSON válida.');
  }

  // Estructura mostrada en el contrato: consultarResponse.return.
  const resultado = contenido?.consultarResponse?.return ?? contenido?.return;
  if (!resultado || typeof resultado !== 'object' || resultado.coResultado == null) {
    throw new Error('La estructura recibida de PIDE no coincide con el contrato.');
  }

  const codigo = String(resultado.coResultado).padStart(4, '0');
  if (codigo !== '0000') return { codigo, datos: null };
  if (!resultado.datosPersona || typeof resultado.datosPersona !== 'object') {
    throw new Error('PIDE informó éxito, pero no entregó datos de la persona.');
  }

  return { codigo, datos: prepararDatos(resultado.datosPersona) };
}

module.exports = { consultarDni };
