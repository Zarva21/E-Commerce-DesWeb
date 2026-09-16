const db = require("../../index.js");
const catalogService = require("../../catalog/catalog.service.js");

const Cart = db.cart;
const CartItem = db.cartItem;

exports.getOrCreateActiveCart = async (customerId) => {
  let cart = await Cart.findOne({ where: { customer_id: customerId, status: "active" } });
  if (!cart) {
    cart = await Cart.create({ customer_id: customerId, status: "active" });
  }
  return cart;
};

/**
 * Resuelve el carrito con precios EN VIVO desde Catalog (nunca se guarda el
 * precio en cart_items — si el precio cambia, el carrito refleja el actual).
 */
exports.getCartWithTotals = async (cartId) => {
  const cart = await Cart.findByPk(cartId);
  if (!cart) {
    const error = new Error("Carrito no encontrado.");
    error.status = 404;
    throw error;
  }

  const cartItems = await CartItem.findAll({ where: { cart_id: cartId } });

  const items = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const variant = await catalogService.getVariantForSale(item.product_variant_id);
    if (!variant) continue; // producto descontinuado/inactivo: se ignora en el total, no rompe el carrito

    const lineTotal = Number((variant.price * item.quantity).toFixed(2));
    subtotal += lineTotal;

    items.push({
      cart_item_id: item.id,
      product_variant_id: item.product_variant_id,
      sku: variant.sku,
      product_name: variant.product.name,
      unit_price: variant.price,
      quantity: item.quantity,
      line_total: lineTotal
    });
  }

  return { cart_id: cart.id, status: cart.status, items, subtotal: Number(subtotal.toFixed(2)) };
};

exports.addItem = async (cartId, { product_variant_id, quantity }) => {
  const variant = await catalogService.getVariantForSale(product_variant_id);
  if (!variant) {
    const error = new Error("El producto no existe o no está disponible.");
    error.status = 404;
    throw error;
  }

  const existing = await CartItem.findOne({ where: { cart_id: cartId, product_variant_id } });
  if (existing) {
    existing.quantity += quantity;
    await existing.save();
    return existing;
  }

  return CartItem.create({ cart_id: cartId, product_variant_id, quantity });
};

exports.updateItemQuantity = async (cartItemId, quantity) => {
  const item = await CartItem.findByPk(cartItemId);
  if (!item) {
    const error = new Error("Ítem de carrito no encontrado.");
    error.status = 404;
    throw error;
  }
  if (quantity <= 0) {
    await item.destroy();
    return null;
  }
  item.quantity = quantity;
  await item.save();
  return item;
};

exports.removeItem = async (cartItemId) => {
  const item = await CartItem.findByPk(cartItemId);
  if (!item) {
    const error = new Error("Ítem de carrito no encontrado.");
    error.status = 404;
    throw error;
  }
  await item.destroy();
};

/**
 * clearCart — se llama DENTRO de la transacción del checkout.
 * Marca el carrito como "converted" en vez de borrarlo, para conservar
 * el historial de qué carrito originó qué orden.
 */
exports.clearCart = async (cartId, transaction) => {
  await CartItem.destroy({ where: { cart_id: cartId }, transaction });
  await Cart.update({ status: "converted" }, { where: { id: cartId }, transaction });
};
