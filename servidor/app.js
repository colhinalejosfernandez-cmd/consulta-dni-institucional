require('dotenv').config();

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MemoriaSesiones = require('memorystore')(session);
const acceso = require('./acceso');
const consultas = require('./consultas');

const aplicacion = express();
const produccion = process.env.NODE_ENV === 'production';
const puerto = Number(process.env.PUERTO || 3000);

if (!process.env.USUARIO_ACCESO || !process.env.CLAVE_ACCESO_HASH) {
  throw new Error('Configura USUARIO_ACCESO y CLAVE_ACCESO_HASH en tu archivo .env.');
}
if (!process.env.CLAVE_SESION || process.env.CLAVE_SESION.length < 32) {
  throw new Error('Configura CLAVE_SESION con al menos 32 caracteres. Ejecuta npm run crear-clave.');
}
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('PUERTO no es válido.');
}

aplicacion.disable('x-powered-by');
if (process.env.CONFIAR_PROXY === 'true') aplicacion.set('trust proxy', 1);

aplicacion.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

aplicacion.use(express.json({ limit: '12kb', type: 'application/json' }));

// Protege los POST de formularios de otros sitios.
aplicacion.use((req, res, siguiente) => {
  if (req.method !== 'POST') return siguiente();
  if (req.get('x-solicitud-interna') !== 'consulta-dni') {
    return res.status(403).json({ mensaje: 'La solicitud no está permitida.' });
  }
  const origen = req.get('origin');
  if (origen) {
    try {
      const esperado = process.env.ORIGEN_APLICACION || `${req.protocol}://${req.get('host')}`;
      if (new URL(origen).origin !== new URL(esperado).origin) {
        return res.status(403).json({ mensaje: 'El origen de la solicitud no está permitido.' });
      }
    } catch {
      return res.status(403).json({ mensaje: 'El origen de la solicitud no es válido.' });
    }
  }
  siguiente();
});

aplicacion.use(session({
  name: 'sesion_consulta_dni',
  secret: process.env.CLAVE_SESION,
  store: new MemoriaSesiones({ checkPeriod: 60 * 60 * 1000, max: 500 }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: produccion,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

aplicacion.use('/public', express.static(path.join(__dirname, '../public')));
aplicacion.use((req, res, siguiente) => {
  res.set('Cache-Control', 'no-store');
  siguiente();
});

aplicacion.get('/', (req, res) => {
  res.redirect(req.session?.usuario ? '/consulta' : '/login');
});
aplicacion.get('/login', (req, res) => {
  if (req.session?.usuario) return res.redirect('/consulta');
  return res.sendFile(path.join(__dirname, '../paginas/login.html'));
});
aplicacion.get('/consulta', acceso.exigirSesion, (req, res) => {
  res.sendFile(path.join(__dirname, '../paginas/principal.html'));
});

aplicacion.use('/api/acceso', acceso.rutas);
aplicacion.use('/api/consultas', acceso.exigirSesion, consultas);
aplicacion.use('/api', (req, res) => res.status(404).json({ mensaje: 'Esta opción no existe.' }));
aplicacion.use((req, res) => res.redirect('/'));

aplicacion.use((error, req, res, siguiente) => {
  if (res.headersSent) return siguiente(error);
  console.error('Problema del servidor:', error.name || 'Error');
  return res.status(500).json({ mensaje: 'Ocurrió un problema en el sistema. Inténtalo nuevamente.' });
});

aplicacion.listen(puerto, () => {
  console.log(`Sistema disponible en http://localhost:${puerto}`);
  console.log('Las consultas usan exclusivamente el servicio real de PIDE.');
});
