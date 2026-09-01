const employeeService = require("./employee.service.js");

exports.getAll = async (req, res) => {
  try {
    res.status(200).send(await employeeService.getAll());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await employeeService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { email, password, employee_code, first_name, last_name, position } = req.body;
    if (!email || !password || !employee_code || !first_name || !last_name) {
      return res.status(400).send({ message: "Faltan campos obligatorios." });
    }
    const employee = await employeeService.create({
      email, password, employee_code, first_name, last_name, position
    });
    res.status(201).send(employee);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await employeeService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await employeeService.remove(req.params.id);
    res.status(200).send({ message: "Empleado eliminado." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
