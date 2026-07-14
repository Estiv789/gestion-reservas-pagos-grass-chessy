const test = require('node:test');
const assert = require('node:assert/strict');
const passwordService = require('../src/services/passwordService');

test('PasswordService cifra y compara contraseñas', () => {
  const hash = passwordService.cifrar('clave123');
  assert.notEqual(hash, 'clave123');
  assert.equal(passwordService.comparar('clave123', hash), true);
  assert.equal(passwordService.comparar('incorrecta', hash), false);
});
