const cartService = require("./cart.service.js");

exports.getOrCreateForCustomer = async (req, res) => {
  try {
    const cart = await cartService.getOrCreateActiveCart(req.params.customerId);
    res.status(200).send(await cartService.getCartWithTotals(cart.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await cartService.getCartWithTotals(req.params.cartId));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.addItem = async (req, res) => {
  try {
    const { product_variant_id, quantity } = req.body;
    if (!product_variant_id || !quantity) {
      return res.status(400).send({ message: "product_variant_id y quantity son obligatorios." });
    }
    await cartService.addItem(req.params.cartId, { product_variant_id, quantity });
    res.status(201).send(await cartService.getCartWithTotals(req.params.cartId));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    await cartService.updateItemQuantity(req.params.itemId, req.body.quantity);
    res.status(200).send(await cartService.getCartWithTotals(req.params.cartId));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.removeItem = async (req, res) => {
  try {
    await cartService.removeItem(req.params.itemId);
    res.status(200).send(await cartService.getCartWithTotals(req.params.cartId));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
