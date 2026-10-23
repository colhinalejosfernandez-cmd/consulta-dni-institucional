const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

function pedirClaveOculta() {
  return new Promise((resolver, rechazar) => {
    if (!process.stdin.isTTY) {
      rechazar(new Error('Abre una terminal para escribir la clave de manera privada.'));
      return;
    }

    let clave = '';
    process.stdout.write('Escribe la contraseña del usuario de la página: ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function terminar() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', recibir);
      process.stdout.write('\n');
    }
    function recibir(tecla) {
      if (tecla === '\u0003') {
        terminar();
        rechazar(new Error('Operación cancelada.'));
      } else if (tecla === '\r' || tecla === '\n') {
        terminar();
        resolver(clave);
      } else if (tecla === '\u007f' || tecla === '\b') {
        if (clave.length) {
          clave = clave.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (!tecla.startsWith('\u001b') && !tecla.includes('\u0000')) {
        clave += tecla;
        process.stdout.write('*');
      }
    }
    process.stdin.on('data', recibir);
  });
}

(async () => {
  try {
    const clave = await pedirClaveOculta();
    if (clave.length < 12) {
      console.error('Utiliza una contraseña de al menos 12 caracteres.');
      process.exitCode = 1;
      return;
    }
    console.log('\nCopia estos dos valores en tu archivo .env (no en GitHub):\n');
    console.log(`CLAVE_ACCESO_HASH=${await bcrypt.hash(clave, 12)}`);
    console.log(`CLAVE_SESION=${crypto.randomBytes(32).toString('hex')}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
})();
