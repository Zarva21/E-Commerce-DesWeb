const db = require("../../index.js");
const userService = require("../accounts/user.service.js");

const Customer = db.customer;
const Address = db.address;

exports.getAll = () => Customer.findAll({ include: [db.user, Address] });

exports.getById = async (id) => {
  const customer = await Customer.findByPk(id, { include: [db.user, Address] });
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
  return customer.update(data);
};

exports.remove = async (id) => {
  const customer = await exports.getById(id);
  await customer.destroy(); // soft delete (paranoid)
};

// --- Direcciones (entidad débil del cliente) ---

exports.addAddress = async (customerId, addressData) => {
  await exports.getById(customerId); // valida que el cliente exista
  return Address.create({ customer_id: customerId, ...addressData });
};
