const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');

const rutas = express.Router();
// Comparación alternativa para que los usuarios desconocidos no sean mucho más rápidos.
const hashAlternativo = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 12);

// En desarrollo local se permiten nuevos intentos sin un bloqueo de 15 minutos.
// En producción se mantiene la protección para evitar intentos automatizados.
const limitarIntentos = process.env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 6,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { mensaje: 'Demasiados intentos. Vuelve a probar en 15 minutos.' }
    })
  : (req, res, siguiente) => siguiente();

function exigirSesion(req, res, siguiente) {
  if (req.session?.usuario) return siguiente();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ mensaje: 'Tu sesión terminó. Vuelve a iniciar sesión.' });
  }
  return res.redirect('/login');
}

rutas.post('/entrar', limitarIntentos, async (req, res, siguiente) => {
  try {
    const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
    const clave = typeof req.body?.clave === 'string' ? req.body.clave : '';

    if (!usuario || !clave || usuario.length > 60 || clave.length > 200) {
      return res.status(400).json({ mensaje: 'Ingresa tu usuario y contraseña.' });
    }

    const configurado = process.env.USUARIO_ACCESO;
    const mismoUsuario = usuario.toLowerCase() === configurado.toLowerCase();
    const claveCorrecta = await bcrypt.compare(clave, mismoUsuario ? process.env.CLAVE_ACCESO_HASH : hashAlternativo);
    if (!mismoUsuario || !claveCorrecta) {
      return res.status(401).json({ mensaje: 'El usuario o la contraseña no son correctos.' });
    }

    req.session.regenerate(error => {
      if (error) return siguiente(error);
      req.session.usuario = configurado;
      req.session.save(errorGuardado => {
        if (errorGuardado) return siguiente(errorGuardado);
        return res.json({ mensaje: 'Inicio de sesión correcto.' });
      });
    });
  } catch (error) {
    siguiente(error);
  }
});

rutas.get('/sesion', (req, res) => {
  res.json({
    autenticado: Boolean(req.session?.usuario),
    usuario: req.session?.usuario || null
  });
});

rutas.post('/salir', (req, res, siguiente) => {
  req.session.destroy(error => {
    if (error) return siguiente(error);
    res.clearCookie('sesion_consulta_dni', { path: '/' });
    return res.json({ mensaje: 'Sesión cerrada.' });
  });
});

module.exports = { rutas, exigirSesion };
