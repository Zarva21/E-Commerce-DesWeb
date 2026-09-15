// category.service.js — Lógica de categorías.
// Las categorías son auto-referenciadas (parent_category_id): "Hombre" -> "Zapatillas".
// Eso permite filtrar por género y luego por tipo de prenda.

const db = require("../../index.js");
const { Op } = require("sequelize");

const Category = db.category;
const Product = db.product;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.getAll = ({ q, parent_category_id } = {}) => {
  const where = {};
  if (q) where.name = { [Op.iLike]: `%${q}%` };

  // ?parent_category_id=null trae solo las raíces (los "géneros")
  if (parent_category_id === "null") where.parent_category_id = { [Op.is]: null };
  else if (parent_category_id) where.parent_category_id = parent_category_id;

  return Category.findAll({ where, order: [["name", "ASC"]] });
};

exports.getById = async (id) => {
  const category = await Category.findByPk(id, {
    include: [
      { model: Category, as: "subcategories" },
      { model: Category, as: "parentCategory" }
    ]
  });
  if (!category) throw httpError("Categoría no encontrada.", 404);
  return category;
};

/**
 * Devuelve el árbol completo anidado (raíces -> hijos -> nietos...).
 * Se arma en memoria con una sola consulta, en vez de N consultas recursivas.
 */
exports.getTree = async () => {
  const all = await Category.findAll({ order: [["name", "ASC"]] });

  const byId = new Map();
  all.forEach((c) => {
    byId.set(c.id.toString(), { ...c.toJSON(), subcategories: [] });
  });

  const roots = [];
  byId.forEach((node) => {
    const parentId = node.parent_category_id ? node.parent_category_id.toString() : null;
    if (parentId && byId.has(parentId)) byId.get(parentId).subcategories.push(node);
    else roots.push(node);
  });

  return roots;
};

/**
 * Devuelve [id, ...idsDeTodosSusDescendientes].
 * Lo usa el filtro de productos: si pides "Hombre", también trae lo de "Hombre > Zapatillas".
 */
exports.getDescendantIds = async (categoryId) => {
  const all = await Category.findAll({ attributes: ["id", "parent_category_id"] });

  const childrenOf = new Map();
  all.forEach((c) => {
    const parent = c.parent_category_id ? c.parent_category_id.toString() : "root";
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(c.id.toString());
  });

  const result = [];
  const stack = [categoryId.toString()];
  while (stack.length) {
    const current = stack.pop();
    result.push(current);
    (childrenOf.get(current) || []).forEach((child) => stack.push(child));
  }
  return result;
};

exports.create = async ({ name, description, parent_category_id }) => {
  if (!name) throw httpError("El nombre de la categoría es obligatorio.", 400);

  const existing = await Category.findOne({ where: { name } });
  if (existing) throw httpError(`Ya existe una categoría llamada "${name}".`, 409);

  if (parent_category_id) {
    const parent = await Category.findByPk(parent_category_id);
    if (!parent) throw httpError("La categoría padre indicada no existe.", 400);
  }

  return Category.create({ name, description, parent_category_id: parent_category_id || null });
};

exports.update = async (id, { name, description, parent_category_id }) => {
  const category = await Category.findByPk(id);
  if (!category) throw httpError("Categoría no encontrada.", 404);

  if (name && name !== category.name) {
    const existing = await Category.findOne({ where: { name } });
    if (existing) throw httpError(`Ya existe una categoría llamada "${name}".`, 409);
  }

  if (parent_category_id !== undefined && parent_category_id !== null) {
    if (parent_category_id.toString() === id.toString()) {
      throw httpError("Una categoría no puede ser padre de sí misma.", 400);
    }
    const parent = await Category.findByPk(parent_category_id);
    if (!parent) throw httpError("La categoría padre indicada no existe.", 400);

    // Evita ciclos: no puedes mover "Hombre" dentro de su propio hijo "Zapatillas".
    const descendants = await exports.getDescendantIds(id);
    if (descendants.includes(parent_category_id.toString())) {
      throw httpError("No puedes mover una categoría dentro de una de sus descendientes.", 400);
    }
  }

  return category.update({ name, description, parent_category_id });
};

exports.remove = async (id) => {
  const category = await Category.findByPk(id);
  if (!category) throw httpError("Categoría no encontrada.", 404);

  const children = await Category.count({ where: { parent_category_id: id } });
  if (children > 0) {
    throw httpError(`No se puede eliminar: la categoría tiene ${children} subcategoría(s).`, 409);
  }

  const products = await Product.count({ where: { category_id: id } });
  if (products > 0) {
    throw httpError(`No se puede eliminar: la categoría tiene ${products} producto(s).`, 409);
  }

  await category.destroy(); // soft delete
};
