// coupon.controller.js

const couponService = require("./coupon.service.js");
const db = require("../../index.js");

exports.getAll = async (req, res) => {
  try {
    const { q, only_active } = req.query;
    res.status(200).send(await couponService.getAll({ q, only_active }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await couponService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    res.status(201).send(await couponService.create(req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    res.status(200).send(await couponService.update(req.params.id, req.body));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await couponService.remove(req.params.id);
    res.status(200).send({ message: "Cupón eliminado." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * POST /marketing/coupons/validate  -> { code, subtotal }
 * Lo llama el carrito antes de pagar. NO canjea el cupón, solo dice si sirve
 * y cuánto descuenta.
 */
exports.validate = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).send({ message: "El código del cupón es obligatorio." });
    if (subtotal === undefined) {
      return res.status(400).send({ message: "El subtotal es obligatorio." });
    }

    // Si el usuario viene autenticado, resolvemos su customer_id para poder
    // aceptar cupones nominales (Store Credit). Si es invitado, queda undefined.
    let customerId;
    if (req.userId) {
      const customer = await db.customer.findOne({ where: { user_id: req.userId } });
      if (customer) customerId = customer.id;
    }

    const result = await couponService.validate(code, { subtotal, customerId });

    if (!result) {
      return res.status(404).send({ valid: false, message: "Cupón inválido, vencido o agotado." });
    }

    res.status(200).send({ valid: true, ...result });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * POST /marketing/coupons/store-credit -> { customer_id, amount }
 * Lo usa el personal cuando autoriza una devolución de mercadería.
 */
exports.issueStoreCredit = async (req, res) => {
  try {
    const { customer_id, amount } = req.body;
    res.status(201).send(await couponService.issueStoreCredit(customer_id, amount));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
