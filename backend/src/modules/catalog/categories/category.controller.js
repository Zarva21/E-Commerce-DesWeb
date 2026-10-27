// category.controller.js

const categoryService = require("./category.service.js");

exports.getAll = async (req, res) => {
  try {
    const { q, parent_category_id } = req.query;
    res.status(200).send(await categoryService.getAll({ q, parent_category_id }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// GET /categories/tree -> árbol anidado para los menús del frontend
exports.getTree = async (req, res) => {
  try {
    res.status(200).send(await categoryService.getTree());
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await categoryService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, parent_category_id } = req.body;
    res.status(201).send(await categoryService.create({ name, description, parent_category_id }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await categoryService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await categoryService.remove(req.params.id);
    res.status(200).send({ message: "Categoría eliminada." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
