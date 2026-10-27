// product.controller.js — Gestiona el producto y sus entidades débiles
// (variantes e imágenes). Ninguna consulta a Sequelize vive aquí.

const productService = require("./product.service.js");

/**
 * Si la petición viene de un admin/employee autenticado, mostramos también
 * productos inactivos, sin stock y el precio de costo.
 * req.isStaff lo pone el middleware attachStaffFlag de product.routes.js.
 */
const staffOptions = (req) => ({ isAdmin: Boolean(req.isStaff) });

exports.getAll = async (req, res) => {
  try {
    res.status(200).send(await productService.getAll(req.query, staffOptions(req)));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await productService.getById(req.params.id, staffOptions(req)));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    res.status(201).send(await productService.create(req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await productService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await productService.remove(req.params.id);
    res.status(200).send({ message: "Producto eliminado." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// --- Variantes (entidad débil) ---

exports.getVariants = async (req, res) => {
  try {
    res.status(200).send(await productService.getVariants(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.addVariant = async (req, res) => {
  try {
    res.status(201).send(await productService.addVariant(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.updateVariant = async (req, res) => {
  try {
    res.status(200).send(
      await productService.updateVariant(req.params.id, req.params.variantId, req.body)
    );
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.removeVariant = async (req, res) => {
  try {
    await productService.removeVariant(req.params.id, req.params.variantId);
    res.status(200).send({ message: "Variante eliminada." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// --- Imágenes (entidad débil). Por ahora solo se guarda el string image_url. ---

exports.getImages = async (req, res) => {
  try {
    res.status(200).send(await productService.getImages(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.addImage = async (req, res) => {
  try {
    const { image_url, alt_text, display_order, is_primary } = req.body;
    res.status(201).send(
      await productService.addImage(req.params.id, { image_url, alt_text, display_order, is_primary })
    );
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.removeImage = async (req, res) => {
  try {
    await productService.removeImage(req.params.id, req.params.imageId);
    res.status(200).send({ message: "Imagen eliminada." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
