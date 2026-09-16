const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../index.js");
const config = require("../../../config/auth.config");

const User = db.user;
const Role = db.role;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.signup = async ({ email, password, roleName = "customer" }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw httpError("Ese correo ya está registrado.", 409);

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) throw httpError(`El rol "${roleName}" no existe.`, 400);

  const password_hash = bcrypt.hashSync(password, 8);
  const user = await User.create({ email, password_hash, role_id: role.id, is_guest: false });

  return { id: user.id, email: user.email, role_id: user.role_id };
};

exports.signin = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw httpError("Usuario no encontrado.", 404);

  // Guard OBLIGATORIO desde que existe el Shadow User: un invitado tiene
  // password_hash = null. bcrypt.compareSync(password, null) lanza una
  // excepción real (no devuelve false), así que hay que cortarlo antes.
  // Mensaje genérico a propósito: no revelamos que es una cuenta invitada,
  // eso sería fuga de información para quien intenta enumerar correos.
  if (!user.password_hash) {
    throw httpError("Correo o contraseña incorrectos.", 401);
  }

  const passwordIsValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordIsValid) throw httpError("Correo o contraseña incorrectos.", 401);

  const token = jwt.sign({ id: user.id, role_id: user.role_id }, config.secret, {
    expiresIn: config.expiresIn
  });

  return { id: user.id, email: user.email, accessToken: token, expiresIn: config.expiresIn };
};

/**
 * True Shadow User -> cuenta completa.
 * Se llama desde la pantalla "Gracias por tu compra, crea una contraseña
 * para rastrear tu pedido". No migra nada: como el user_id ya existía desde
 * la compra de invitado, todo su historial (orders, invoices) queda
 * automáticamente vinculado — solo se le agrega contraseña real.
 */
exports.convertGuestToAccount = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw httpError("No se encontró ninguna compra de invitado con ese correo.", 404);

  if (!user.is_guest) {
    throw httpError("Esta cuenta ya está registrada y activa. Inicia sesión normalmente.", 409);
  }

  user.password_hash = bcrypt.hashSync(password, 8);
  user.is_guest = false;
  await user.save();

  const token = jwt.sign({ id: user.id, role_id: user.role_id }, config.secret, {
    expiresIn: config.expiresIn
  });

  return {
    id: user.id,
    email: user.email,
    accessToken: token,
    expiresIn: config.expiresIn,
    message: "Cuenta creada correctamente. Tu historial de compras como invitado ya está vinculado."
  };
};
