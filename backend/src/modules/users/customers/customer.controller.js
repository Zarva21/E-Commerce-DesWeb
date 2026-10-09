const customerService = require("./customer.service.js");
const db = require("../../index.js");
const Customer = db.customer;
const Address = db.address;


exports.getAll = async (req, res) => {
  try {
    res.status(200).send(await customerService.getAll());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await customerService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, birth_date, gender, marketing_enabled, address } = req.body;
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).send({ message: "Faltan campos obligatorios." });
    }
    const customer = await customerService.create({
      email, password, first_name, last_name, phone, birth_date, gender, marketing_enabled, address
    });
    res.status(201).send(customer);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await customerService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await customerService.remove(req.params.id);
    res.status(200).send({ message: "Cliente eliminado." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const address = await customerService.addAddress(req.params.id, req.body);
    res.status(201).send(address);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// GET /users/customers/addresses/me
exports.getMyAddresses = async (req, res) => {
  try {
    // Soporta las variantes usuales donde el middleware inyecta el ID
    const userId = req.userId || req.user?.id || req.id;

    if (!userId) {
      return res.status(401).send({ message: "Usuario no autenticado o token no válido." });
    }

    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) {
      return res.status(404).send({ message: "Cliente no encontrado para este usuario." });
    }

    const addresses = await Address.findAll({
      where: { customer_id: customer.id },
      order: [
        ["is_default", "DESC"],
        ["created_at", "DESC"],
      ],
    });

    res.status(200).send(addresses);
  } catch (err) {
    console.error("Error en getMyAddresses:", err);
    res.status(500).send({ message: err.message });
  }
};
