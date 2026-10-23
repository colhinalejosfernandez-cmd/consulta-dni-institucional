const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { consultarDni } = require('./reniec');

const rutas = express.Router();

const limitarConsultas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { mensaje: 'Has realizado muchas consultas. Inténtalo más tarde.' }
});

const mensajesPorCodigo = {
  '0001': { estado: 400, mensaje: 'Este DNI corresponde a una persona menor de edad.' },
  '0999': { estado: 404, mensaje: 'No se encontró información para el DNI ingresado.' },
  '1000': { estado: 400, mensaje: 'Los datos de la consulta no son válidos.' },
  '1001': { estado: 502, mensaje: 'Las credenciales de RENIEC no son válidas. Comunícalo al responsable.' },
  '1002': { estado: 502, mensaje: 'La contraseña de RENIEC venció. Comunícalo al responsable.' },
  '1003': { estado: 429, mensaje: 'Se alcanzó el límite diario de consultas de RENIEC.' }
};

rutas.post('/dni', limitarConsultas, async (req, res) => {
  const dni = typeof req.body?.dni === 'string' ? req.body.dni.trim() : '';
  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ mensaje: 'El DNI debe tener exactamente 8 números.' });
  }

  try {
    const resultado = await consultarDni(dni);
    if (resultado.codigo !== '0000') {
      const detalle = mensajesPorCodigo[resultado.codigo] || {
        estado: 502,
        mensaje: 'RENIEC no pudo completar la consulta. Inténtalo nuevamente.'
      };
      return res.status(detalle.estado).json({ mensaje: detalle.mensaje });
    }

    res.set('Cache-Control', 'no-store');
    return res.json({ datos: { dni, ...resultado.datos } });
  } catch (error) {
    // No escribir en los registros: DNI, fotos, contraseñas ni respuestas personales.
    if (error.tipo === 'CONFIGURACION') {
      return res.status(503).json({ mensaje: 'El acceso a RENIEC todavía no está configurado. Comunícalo al responsable.' });
    }
    console.error('Error durante la comunicación con PIDE:', error.name || 'Error');
    return res.status(502).json({ mensaje: 'No se pudo completar la consulta con RENIEC. Inténtalo más tarde.' });
  }
});

module.exports = rutas;
