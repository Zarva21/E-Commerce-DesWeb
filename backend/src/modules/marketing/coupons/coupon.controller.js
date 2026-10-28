const marketingService = require("../marketing.service.js");
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
 * POST /marketing/coupons/validate -> { code, subtotal, cartItems }
 */
exports.validate = async (req, res) => {
  try {
    const { code, subtotal, cartItems } = req.body;

    if (!code) {
      return res.status(400).send({ message: "El código del cupón es obligatorio." });
    }
    if (subtotal === undefined || subtotal === null) {
      return res.status(400).send({ message: "El subtotal es obligatorio." });
    }

    let customerId = null;
    if (req.userId) {
      const customer = await db.customer.findOne({ where: { user_id: req.userId } });
      if (customer) customerId = customer.id;
    }

    // Usar marketingService.validateCoupon que evalúa combos, restricciones y catálogo
    const result = await marketingService.validateCoupon(code.trim().toUpperCase(), {
      subtotal: Number(subtotal),
      customerId,
      cartItems: Array.isArray(cartItems) ? cartItems : [],
    });

    if (!result) {
      return res.status(404).send({
        valid: false,
        message: "Cupón inválido, expirado o no aplicable a este carrito.",
      });
    }

    res.status(200).send({ valid: true, ...result });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.issueStoreCredit = async (req, res) => {
  try {
    const { customer_id, amount } = req.body;
    res.status(201).send(await couponService.issueStoreCredit(customer_id, amount));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};