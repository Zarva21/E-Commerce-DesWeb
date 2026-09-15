// supplier.service.js — Proveedores: quién nos distribuye cada producto.

const db = require("../../index.js");
const { Op } = require("sequelize");

const Supplier = db.supplier;
const Product = db.product;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.getAll = ({ q } = {}) => {
  const where = {};
  if (q) where.name = { [Op.iLike]: `%${q}%` };
  return Supplier.findAll({ where, order: [["name", "ASC"]] });
};

exports.getById = async (id) => {
  const supplier = await Supplier.findByPk(id);
  if (!supplier) throw httpError("Proveedor no encontrado.", 404);
  return supplier;
};

/** Productos que distribuye este proveedor (útil para el módulo de Inventory). */
exports.getProducts = async (id) => {
  await exports.getById(id);
  return Product.findAll({ where: { supplier_id: id }, order: [["name", "ASC"]] });
};

exports.create = async ({ name, contact_email, phone }) => {
  if (!name) throw httpError("El nombre del proveedor es obligatorio.", 400);

  const existing = await Supplier.findOne({ where: { name } });
  if (existing) throw httpError(`Ya existe un proveedor llamado "${name}".`, 409);

  return Supplier.create({ name, contact_email, phone });
};

exports.update = async (id, { name, contact_email, phone }) => {
  const supplier = await exports.getById(id);

  if (name && name !== supplier.name) {
    const existing = await Supplier.findOne({ where: { name } });
    if (existing) throw httpError(`Ya existe un proveedor llamado "${name}".`, 409);
  }

  return supplier.update({ name, contact_email, phone });
};

exports.remove = async (id) => {
  const supplier = await exports.getById(id);

  const productsCount = await Product.count({ where: { supplier_id: id } });
  if (productsCount > 0) {
    throw httpError(
      `No se puede eliminar: el proveedor tiene ${productsCount} producto(s) asociado(s).`,
      409
    );
  }

  await supplier.destroy(); // soft delete
};
