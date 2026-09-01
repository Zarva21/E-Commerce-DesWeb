const roleService = require("./role.service.js");

exports.getAll = async (req, res) => {
  try {
    res.status(200).send(await roleService.getAll());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await roleService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).send({ message: "El nombre del rol es obligatorio." });
    res.status(201).send(await roleService.create({ name, description }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await roleService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await roleService.remove(req.params.id);
    res.status(200).send({ message: "Rol eliminado." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
