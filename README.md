# Consulta de DNI

Aplicación web de uso interno para consultar **datos de identidad por DNI** mediante el servicio REST **RENIEC – PIDE**.

Incluye inicio de sesión, consulta individual, ficha con datos recibidos del servicio y visualización de fotografía JPG en Base64. No contiene datos de personas, respuestas simuladas ni contraseñas reales.

## 1. Requisitos

- Tener instalado **Node.js 20.11 o superior** y Git.
- Contar con autorización institucional y credenciales activas para consultar PIDE.
- Tener acceso de escritura a la carpeta del proyecto.

## 2. Descargar y preparar

Si tu compañero ya creó el repositorio, clónalo y coloca estos archivos dentro de la misma estructura; no es necesario crear otro repositorio.

```bash
git clone URL_DEL_REPOSITORIO
cd consulta-dni-institucional
npm install
```

Crea una copia local de la configuración:

- **Windows (Git Bash):** `cp .env.example .env`
- **Windows (PowerShell):** `Copy-Item .env.example .env`

Edita `.env` y escribe el nombre elegido para `USUARIO_ACCESO`. Déjalo sin espacios al comienzo y al final.

Para crear la contraseña del inicio de sesión, ejecuta:

```bash
npm run crear-clave
```

El programa pedirá una contraseña de al menos 12 caracteres, sin mostrarla en pantalla. Copia los valores generados de `CLAVE_ACCESO_HASH` y `CLAVE_SESION` en tu archivo `.env`.

## 3. Conectar RENIEC

Completa en `.env` los datos institucionales autorizados:

```dotenv
DNI_USUARIO_PIDE=
RUC_ENTIDAD_PIDE=
CLAVE_PIDE=
```

`DNI_USUARIO_PIDE` es el DNI del usuario de PIDE, `RUC_ENTIDAD_PIDE` es el RUC de la entidad y `CLAVE_PIDE` es la credencial actualizada de ese usuario. **No confundas estos datos con el usuario y contraseña de la página.**

Este sistema hace la consulta real mediante POST a `https://ws2.pide.gob.pe/Rest/RENIEC/Consultar?out=json`. No incluye modo de prueba ni resultados inventados. Sin credenciales válidas, el sistema mostrará un mensaje de configuración o el error real correspondiente.

## 4. Ejecutar

```bash
npm run iniciar
```

Abre `http://localhost:3000` en el navegador.

Para reiniciar al guardar cambios durante el desarrollo:

```bash
npm run desarrollar
```

## 5. Qué hace cada archivo

```text
consulta-dni-institucional/
├── paginas/
│   ├── login.html           Inicio de sesión
│   └── principal.html       Consulta y ficha de resultados
├── public/
│   ├── css/
│   │   └── estilos.css     Diseño adaptable
│   ├── js/
│   │   ├── login.js        Inicio y validación de acceso
│   │   ├── consulta.js     Búsqueda y presentación de datos
│   │   └── foto.js         Visualización de fotografía Base64
│   └── img/                Imágenes propias que agregue la entidad
├── servidor/
│   ├── app.js              Inicio y seguridad de la aplicación
│   ├── acceso.js           Acceso, sesión y salida
│   ├── consultas.js        Verificación del DNI y respuestas
│   └── reniec.js           Comunicación con PIDE
├── herramientas/
│   └── crear-clave.js      Creación de clave protegida
├── .env.example            Variables sin valores confidenciales
├── .gitignore              Archivos que Git no debe subir
├── package.json
└── README.md
```

## 6. Colaborar usando Git Bash

Antes de editar, trae los cambios de tu compañero:

```bash
git pull origin main
```

Al terminar y revisar los archivos, puedes subirlos:

```bash
git add .
git status
git commit -m "Agregar consulta de DNI y acceso al sistema"
git push origin main
```

Si el proyecto se desarrolla en ramas, usa la rama de trabajo acordada y abre una solicitud de cambios (pull request) en GitHub.

## 7. Reglas de uso

- `.env` **no se debe subir** a GitHub ni compartir por mensajes.
- No guardar ni publicar DNI consultados, fotografías, respuestas personales o claves de PIDE.
- El formulario consulta una persona por vez; no tiene consultas por lotes.
- La entidad debe comprobar que su permiso de RENIEC permita el uso concreto del sistema.
- De acuerdo con el contrato proporcionado, PIDE consulta solo DNI de personas mayores de edad, con límite de 1000 consultas diarias por usuario autorizado y caducidad de credencial cada 15 días.
- En un despliegue institucional, utilizar **HTTPS** y establecer `NODE_ENV=production`. Configurar `CONFIAR_PROXY` y `ORIGEN_APLICACION` únicamente con el administrador del servidor. Las cookies serán seguras en producción.
- Esta primera versión admite **una cuenta de inicio de sesión** configurada en `.env`. Para varias cuentas individuales con roles, se debe agregar gestión de usuarios y un registro institucional de consultas antes de su despliegue general.
- Las sesiones viven en la memoria de un único servidor (con vencimiento automático); al reiniciarlo se cerrarán. Si el sistema va a ejecutarse en varios servidores o requiere persistencia de sesiones, usar un almacenamiento de sesiones compartido administrado por la entidad.

## 8. Respuestas esperadas del servicio

La operación REST recibe `nuDniConsulta`, `nuDniUsuario`, `nuRucUsuario` y `password` en el objeto `PIDE`. Lee `consultarResponse.return`, incluyendo `coResultado`, `datosPersona` y `foto` (JPG en Base64 o arreglo de bytes). Los errores habituales informan DNI no encontrado, menor de edad, credencial inválida o vencida y límite diario agotado.

La conversión a la imagen se realiza internamente en `servidor/reniec.js` y `public/js/foto.js`, sin librería adicional.
