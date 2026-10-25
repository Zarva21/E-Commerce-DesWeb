const employeeService = require("./employee.service.js");

exports.getAll = async (req, res) => {
  try {
    const employees = await employeeService.getAll();
    return res.status(200).send(employees);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const employee = await employeeService.getById(req.params.id);
    return res.status(200).send(employee);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { email, password, employee_code, first_name, last_name, position } = req.body;
    if (!email || !password || !employee_code || !first_name || !last_name) {
      return res.status(400).send({ message: "Faltan campos obligatorios." });
    }
    const employee = await employeeService.create({
      email,
      password,
      employee_code,
      first_name,
      last_name,
      position,
    });
    return res.status(201).send({ message: "Empleado creado exitosamente.", data: employee });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await employeeService.update(req.params.id, req.body);
    return res.status(200).send({ message: "Empleado actualizado.", data: updated });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await employeeService.remove(req.params.id);
    return res.status(200).send(result);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};
