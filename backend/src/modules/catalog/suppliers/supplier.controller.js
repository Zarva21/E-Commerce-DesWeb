// supplier.controller.js

const supplierService = require("./supplier.service.js");

exports.getAll = async (req, res) => {
  try {
    res.status(200).send(await supplierService.getAll({ q: req.query.q }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await supplierService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    res.status(200).send(await supplierService.getProducts(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, contact_email, phone } = req.body;
    res.status(201).send(await supplierService.create({ name, contact_email, phone }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await supplierService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await supplierService.remove(req.params.id);
    res.status(200).send({ message: "Proveedor eliminado." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
