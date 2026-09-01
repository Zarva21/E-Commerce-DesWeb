const db = require("../../index.js");
const userService = require("../accounts/user.service.js");

const Employee = db.employee;

exports.getAll = () => Employee.findAll({ include: db.user });

exports.getById = async (id) => {
  const employee = await Employee.findByPk(id, { include: db.user });
  if (!employee) {
    const error = new Error("Empleado no encontrado.");
    error.status = 404;
    throw error;
  }
  return employee;
};

exports.create = async ({ email, password, employee_code, first_name, last_name, position }) => {
  // Transacción: si falla la creación del perfil de empleado, se revierte la cuenta también.
  return db.sequelize.transaction(async (t) => {
    const user = await userService.createAccount(
      { email, password, roleName: "employee" },
      t
    );

    const employee = await Employee.create(
      { user_id: user.id, employee_code, first_name, last_name, position },
      { transaction: t }
    );

    return employee;
  });
};

exports.update = async (id, data) => {
  const employee = await exports.getById(id);
  return employee.update(data);
};

exports.remove = async (id) => {
  const employee = await exports.getById(id);
  await employee.destroy(); // soft delete (paranoid)
};
