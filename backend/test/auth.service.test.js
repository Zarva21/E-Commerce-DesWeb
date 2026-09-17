// Casos de negocio de autenticación usando dobles en memoria.
process.env.JWT_SECRET = "test-secret";

const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../src/modules");
const authService = require("../src/modules/users/auth/auth.service");

const originalUser = { ...db.user };
const originalRole = { ...db.role };

afterEach(() => {
  Object.assign(db.user, originalUser);
  Object.assign(db.role, originalRole);
});

test("signup no permite un correo ya registrado", async () => {
  db.user.findOne = async () => ({ id: 1 });

  await assert.rejects(
    authService.signup({ email: "repetido@ejemplo.com", password: "secreto" }),
    { message: "Ese correo ya está registrado.", status: 409 }
  );
});

test("signup exige un rol que exista", async () => {
  db.user.findOne = async () => null;
  db.role.findOne = async () => null;

  await assert.rejects(
    authService.signup({ email: "nuevo@ejemplo.com", password: "secreto", roleName: "inventado" }),
    { message: 'El rol "inventado" no existe.', status: 400 }
  );
});

test("signin no revela que un invitado no tiene contraseña", async () => {
  db.user.findOne = async () => ({ id: 5, email: "guest@ejemplo.com", password_hash: null });

  await assert.rejects(
    authService.signin({ email: "guest@ejemplo.com", password: "cualquiera" }),
    { message: "Correo o contraseña incorrectos.", status: 401 }
  );
});

test("signin devuelve un JWT válido con credenciales correctas", async () => {
  const password = "secreto-seguro";
  db.user.findOne = async () => ({
    id: 7,
    email: "cliente@ejemplo.com",
    role_id: 3,
    password_hash: bcrypt.hashSync(password, 8)
  });

  const result = await authService.signin({ email: "cliente@ejemplo.com", password });
  const payload = jwt.verify(result.accessToken, process.env.JWT_SECRET);

  assert.equal(result.email, "cliente@ejemplo.com");
  assert.equal(payload.id, 7);
  assert.equal(payload.role_id, 3);
});
