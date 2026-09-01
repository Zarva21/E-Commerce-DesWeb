const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../index.js");
const config = require("../../../config/auth.config");

const User = db.user;
const Role = db.role;

exports.signup = async ({ email, password, roleName = "customer" }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const error = new Error("Ese correo ya está registrado.");
    error.status = 409;
    throw error;
  }

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    const error = new Error(`El rol "${roleName}" no existe.`);
    error.status = 400;
    throw error;
  }

  const password_hash = bcrypt.hashSync(password, 8);
  const user = await User.create({ email, password_hash, role_id: role.id });

  return { id: user.id, email: user.email, role_id: user.role_id };
};

exports.signin = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    const error = new Error("Usuario no encontrado.");
    error.status = 404;
    throw error;
  }

  const passwordIsValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordIsValid) {
    const error = new Error("Contraseña incorrecta.");
    error.status = 401;
    throw error;
  }

  const token = jwt.sign({ id: user.id, role_id: user.role_id }, config.secret, {
    expiresIn: config.expiresIn
  });

  return { id: user.id, email: user.email, accessToken: token, expiresIn: config.expiresIn };
};
