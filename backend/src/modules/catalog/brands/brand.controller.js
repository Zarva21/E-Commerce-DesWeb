// brand.controller.js — Traduce HTTP <-> servicio. No contiene lógica de negocio.

const brandService = require("./brand.service.js");

exports.getAll = async (req, res) => {
  try {
    res.status(200).send(await brandService.getAll({ q: req.query.q }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await brandService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, logo_url } = req.body;
    res.status(201).send(await brandService.create({ name, description, logo_url }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await brandService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await brandService.remove(req.params.id);
    res.status(200).send({ message: "Marca eliminada." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
