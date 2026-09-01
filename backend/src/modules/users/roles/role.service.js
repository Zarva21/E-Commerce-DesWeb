const db = require("../../index.js");
const Role = db.role;

exports.getAll = () => Role.findAll();

exports.getById = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) {
    const error = new Error("Rol no encontrado.");
    error.status = 404;
    throw error;
  }
  return role;
};

exports.create = ({ name, description }) => Role.create({ name, description });

exports.update = async (id, data) => {
  const role = await exports.getById(id); // valida que exista (lanza 404 si no)
  return role.update(data);
};

exports.remove = async (id) => {
  const role = await exports.getById(id);
  await role.destroy(); // paranoid: true -> soft delete (llena deleted_at)
};
