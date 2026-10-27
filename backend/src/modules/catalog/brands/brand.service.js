// brand.service.js — Toda la lógica de negocio y las consultas a BD de "brands".
// Regla de arquitectura: el controller NUNCA habla con Sequelize; solo llama aquí.

const db = require("../../index.js");
const { Op } = require("sequelize");

const Brand = db.brand;
const Product = db.product;

/**
 * Helper para lanzar errores con status HTTP.
 * El controller lo lee con err.status y el paracaídas global hace el resto.
 */
const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.getAll = ({ q } = {}) => {
  const where = {};
  if (q) where.name = { [Op.iLike]: `%${q}%` };

  return Brand.findAll({ where, order: [["name", "ASC"]] });
};

exports.getById = async (id) => {
  const brand = await Brand.findByPk(id);
  if (!brand) throw httpError("Marca no encontrada.", 404);
  return brand;
};

exports.create = async ({ name, description, logo_url }) => {
  if (!name) throw httpError("El nombre de la marca es obligatorio.", 400);

  // unique: true en el modelo ya protege a nivel BD, pero devolvemos un 409 legible
  const existing = await Brand.findOne({ where: { name } });
  if (existing) throw httpError(`Ya existe una marca con el nombre "${name}".`, 409);

  return Brand.create({ name, description, logo_url });
};

exports.update = async (id, { name, description, logo_url }) => {
  const brand = await exports.getById(id);

  if (name && name !== brand.name) {
    const existing = await Brand.findOne({ where: { name } });
    if (existing) throw httpError(`Ya existe una marca con el nombre "${name}".`, 409);
  }

  return brand.update({ name, description, logo_url });
};

exports.remove = async (id) => {
  const brand = await exports.getById(id);

  // No dejamos huérfanos: si la marca tiene productos vivos, no se desactiva.
  const productsCount = await Product.count({ where: { brand_id: id } });
  if (productsCount > 0) {
    throw httpError(
      `No se puede eliminar: la marca tiene ${productsCount} producto(s) asociado(s).`,
      409
    );
  }

  await brand.destroy(); // paranoid: true -> soft delete, llena deleted_at
};
