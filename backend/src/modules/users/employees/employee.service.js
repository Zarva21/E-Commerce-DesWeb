const db = require("../../index.js");
const userService = require("../accounts/user.service.js");

const Employee = db.employee;
const User = db.user;
const Role = db.role;

exports.getAll = async () => {
  const employees = await Employee.findAll({
    include: [
      {
        model: User,
        attributes: ["id", "email", "is_active", "role_id"],
        include: [{ model: Role, attributes: ["id", "name"] }]
      }
    ],
    order: [["created_at", "DESC"]]
  });

  return employees.map((empInstance) => {
    const emp = empInstance.toJSON ? empInstance.toJSON() : empInstance;
    const usr = emp.user || emp.User || {};
    const rol = usr.role || usr.Role || {};

    return {
      id: emp.id,
      user_id: emp.user_id,
      employee_code: emp.employee_code,
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Empleado",
      email: usr.email || "—",
      position: emp.position || "",
      role_id: usr.role_id || rol.id || null,
      role_name: rol.name || emp.position || "employee",
      role: emp.position || rol.name || "Empleado",
      status: (usr.is_active ?? true) ? "Activo" : "Inactivo",
      is_active: Boolean(usr.is_active ?? true)
    };
  });
};

exports.getById = async (id) => {
  const employee = await Employee.findByPk(id, {
    include: [
      {
        model: User,
        attributes: ["id", "email", "is_active", "role_id"],
        include: [{ model: Role, attributes: ["id", "name"] }]
      }
    ]
  });
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
  const employee = await Employee.findByPk(id);
  if (!employee) {
    const error = new Error("Empleado no encontrado.");
    error.status = 404;
    throw error;
  }

  const { first_name, last_name, position, employee_code } = data;
  return employee.update({ first_name, last_name, position, employee_code });
};

exports.remove = async (id) => {
  const employee = await Employee.findByPk(id);
  if (!employee) {
    const error = new Error("Empleado no encontrado.");
    error.status = 404;
    throw error;
  }

  // Si tiene cuenta asociada, la eliminamos también
  if (employee.user_id) {
    await User.destroy({ where: { id: employee.user_id } });
  }
  await employee.destroy();

  return { message: "Empleado eliminado correctamente." };
};
