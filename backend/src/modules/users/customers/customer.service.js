const db = require("../../index.js");
const userService = require("../accounts/user.service.js");

const Customer = db.customer;
const Address = db.address;
const User = db.user;
const Role = db.role;
const Order = db.order;
const Sequelize = db.Sequelize;

exports.getAll = async () => {
  const customers = await Customer.findAll({
    include: [
      {
        model: User,
        attributes: ["id", "email", "is_active", "is_guest", "role_id"],
        include: [{ model: Role, attributes: ["id", "name"] }],
      },
      {
        model: Order,
        attributes: [], // Solo para agregación
      },
    ],
    attributes: {
      include: [
        [Sequelize.fn("COUNT", Sequelize.col("orders.id")), "total_orders"],
      ],
    },
    group: [
      "customers.id",
      "user.id",
      "user->role.id",
    ],
    order: [["created_at", "DESC"]],
  });

  return customers.map((cInstance) => {
    const c = cInstance.toJSON ? cInstance.toJSON() : cInstance;
    const usr = c.user || c.User || {};
    const rol = usr.role || usr.Role || {};

    return {
      id: c.id,
      user_id: c.user_id,
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Cliente",
      email: usr.email || "—",
      phone: c.phone || "",
      birth_date: c.birth_date ? String(c.birth_date).split("T")[0] : null,
      marketing_enabled: Boolean(c.marketing_enabled),
      is_guest: Boolean(usr.is_guest),
      role_id: usr.role_id || rol.id || null,
      role_name: rol.name || "customer",
      totalOrders: Number(c.total_orders || 0),
      is_active: Boolean(usr.is_active ?? true),
      status: (usr.is_active ?? true) ? "Activo" : "Inactivo",
      created_at: c.created_at,
    };
  });
};

exports.getById = async (id) => {
  const customer = await Customer.findByPk(id, {
    include: [
      {
        model: User,
        include: [{ model: Role, attributes: ["id", "name"] }],
      },
      Address,
    ],
  });
  if (!customer) {
    const error = new Error("Cliente no encontrado.");
    error.status = 404;
    throw error;
  }
  return customer;
};

exports.create = async ({ email, password, first_name, last_name, phone, birth_date, gender, marketing_enabled, address }) => {
  return db.sequelize.transaction(async (t) => {
    const user = await userService.createAccount(
      { email, password, roleName: "customer" },
      t
    );

    const customer = await Customer.create(
      { user_id: user.id, first_name, last_name, phone, birth_date, gender, marketing_enabled },
      { transaction: t }
    );

    if (address) {
      await Address.create(
        { customer_id: customer.id, ...address, is_default: true },
        { transaction: t }
      );
    }

    return customer;
  });
};

exports.update = async (id, data) => {
  const customer = await exports.getById(id);
  // Actualizamos solo campos propios de customer
  const { first_name, last_name, phone, birth_date, marketing_enabled } = data;
  return customer.update({
    first_name,
    last_name,
    phone,
    birth_date,
    marketing_enabled,
  });
};

exports.remove = async (id) => {
  const customer = await exports.getById(id);
  // Borramos el usuario base vinculado si existe
  if (customer.user_id) {
    await User.destroy({ where: { id: customer.user_id } });
  }
  await customer.destroy();
  return { message: "Cliente eliminado correctamente." };
};

// --- Direcciones (entidad débil del cliente) ---

exports.addAddress = async (customerId, addressData) => {
  await exports.getById(customerId); // valida que el cliente exista
  return Address.create({ customer_id: customerId, ...addressData });
};

exports.getByUserId = async (userId) => {
  return await Customer.findOne({
    where: { user_id: userId },
    include: [db.user, Address]
  });
};
