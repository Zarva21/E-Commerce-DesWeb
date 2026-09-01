// user.service.js — lógica GENÉRICA de cuentas (email + password + rol).
// employees.service y customers.service llaman a createAccount() primero,
// y luego crean su propio perfil (employee/customer) apuntando al user_id.

const bcrypt = require("bcryptjs");
const db = require("../../index.js");

const User = db.user;
const Role = db.role;

exports.createAccount = async ({ email, password, roleName }, transaction) => {
  const existing = await User.findOne({ where: { email }, transaction });
  if (existing) {
    const error = new Error("Ese correo ya está registrado.");
    error.status = 409;
    throw error;
  }

  const role = await Role.findOne({ where: { name: roleName }, transaction });
  if (!role) {
    const error = new Error(`El rol "${roleName}" no existe.`);
    error.status = 400;
    throw error;
  }

  const password_hash = bcrypt.hashSync(password, 8);
  return User.create({ email, password_hash, role_id: role.id }, { transaction });
};

exports.findById = async (id) => {
  const user = await User.findByPk(id, { attributes: { exclude: ["password_hash"] } });
  if (!user) {
    const error = new Error("Usuario no encontrado.");
    error.status = 404;
    throw error;
  }
  return user;
};

exports.changePassword = async (id, oldPassword, newPassword) => {
  const user = await User.findByPk(id);
  if (!user) {
    const error = new Error("Usuario no encontrado.");
    error.status = 404;
    throw error;
  }

  const isValid = bcrypt.compareSync(oldPassword, user.password_hash);
  if (!isValid) {
    const error = new Error("La contraseña actual es incorrecta.");
    error.status = 401;
    throw error;
  }

  user.password_hash = bcrypt.hashSync(newPassword, 8);
  await user.save();
};

exports.deactivate = async (id) => {
  const user = await exports.findById(id);
  await User.update({ is_active: false }, { where: { id } });
  return user;
};
