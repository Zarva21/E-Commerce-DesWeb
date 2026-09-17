const db = require("../../index.js");
const cartService = require("../carts/cart.service.js");
const inventoryService = require("../../inventory/inventory.service.js");
const marketingService = require("../../marketing/marketing.service.js");
const stripe = require("../../../config/stripe.config.js");
const businessConfig = require("../../../config/business.js");

const User = db.user;
const Role = db.role;
const Customer = db.customer;
const Address = db.address;
const Order = db.order;
const OrderItem = db.orderItem;
const OrderCoupon = db.orderCoupon;
const Invoice = db.invoice;
const Payment = db.payment;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Recalcula subtotal/descuento/total desde CERO, siempre contra datos
 * actuales de BD. JAMÁS se confía en un total que mande el frontend.
 *
 * CAMBIO: ahora le pasamos cart.items a validateCoupon, porque Marketing
 * necesita saber QUÉ productos/categorías hay en el carrito para poder
 * filtrar cupones por producto, categoría, o combo.
 */
const computeTotals = async (cartId, couponCode, customerId) => {
  const cart = await cartService.getCartWithTotals(cartId);
  if (!cart.items.length) throw httpError("El carrito está vacío.", 400);

  const subtotal = cart.subtotal;
  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const result = await marketingService.validateCoupon(couponCode, {
      subtotal,
      customerId,
      cartItems: cart.items // <-- antes no se mandaba
    });
    if (!result) throw httpError("El cupón no es válido, expiró, o no aplica a los productos de tu carrito.", 400);
    appliedCoupon = result;
    discount = result.discount_amount;
  }

  const tax = 0; // TODO: aplicar regla fiscal real
  const total = Number((subtotal - discount + tax).toFixed(2));

  return { cart, subtotal, discount, tax, total, appliedCoupon };
};

const resolveGuestIdentity = async ({ email, firstName, lastName, address }, transaction) => {
  let user = await User.findOne({ where: { email }, transaction });

  if (user && !user.is_guest) {
    throw httpError("Ese correo ya tiene una cuenta registrada. Inicia sesión para continuar.", 409);
  }

  if (!user) {
    const customerRole = await Role.findOne({ where: { name: "customer" }, transaction });
    if (!customerRole) throw httpError('El rol "customer" no existe en la base de datos.', 500);

    user = await User.create(
      { email, password_hash: null, role_id: customerRole.id, is_guest: true },
      { transaction }
    );
  }

  let customer = await Customer.findOne({ where: { user_id: user.id }, transaction });
  if (!customer) {
    customer = await Customer.create(
      { user_id: user.id, first_name: firstName, last_name: lastName },
      { transaction }
    );
  }

  const newAddress = await Address.create(
    { customer_id: customer.id, ...address, is_default: true },
    { transaction }
  );

  return { customer, address: newAddress };
};

const resolveAuthenticatedIdentity = async ({ userId, addressId }, transaction) => {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) throw httpError("No se encontró un perfil de cliente para este usuario.", 404);

  const address = await Address.findOne({
    where: { id: addressId, customer_id: customer.id },
    transaction
  });
  if (!address) throw httpError("La dirección indicada no existe o no pertenece a este cliente.", 400);

  return { customer, address };
};

exports.createIntent = async ({ cartId, couponCode, userId }) => {
  let resolvedCustomerId = null;
  if (userId) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    resolvedCustomerId = customer ? customer.id : null;
  }

  const { subtotal, discount, tax, total } = await computeTotals(cartId, couponCode, resolvedCustomerId);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    metadata: {
      cart_id: String(cartId),
      coupon_code: couponCode || "",
      customer_id: resolvedCustomerId ? String(resolvedCustomerId) : ""
    }
  });

  return {
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
    subtotal,
    discount,
    tax,
    total
  };
};

exports.confirmCheckout = async ({
  cartId,
  paymentMethod,
  stripePaymentIntentId,
  couponCode,
  addressId,
  guestData,
  userId,
  employeeId = null
}) => {
  const { cart, subtotal, discount, tax, total, appliedCoupon } = await computeTotals(cartId, couponCode, null);

  if (paymentMethod === "CASH" && total > businessConfig.payment.maxCashLimit) {
    throw httpError(`No se permite efectivo para montos mayores a ${businessConfig.payment.maxCashLimit}.`, 400);
  }

  let stripeIntent = null;
  if (paymentMethod === "CARD") {
    stripeIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);

    if (stripeIntent.status !== "succeeded") {
      throw httpError(`El pago no se ha completado en Stripe (status: ${stripeIntent.status}).`, 402);
    }
    if (stripeIntent.metadata.cart_id !== String(cartId)) {
      throw httpError("El PaymentIntent no corresponde a este carrito.", 400);
    }
    if (stripeIntent.amount !== Math.round(total * 100)) {
      throw httpError("El monto cobrado no coincide con el total actual del carrito.", 409);
    }
  }

  const t = await db.sequelize.transaction();

  try {
    const { customer, address } = userId
      ? await resolveAuthenticatedIdentity({ userId, addressId }, t)
      : await resolveGuestIdentity(
          {
            email: guestData.email,
            firstName: guestData.first_name,
            lastName: guestData.last_name,
            address: guestData.address
          },
          t
        );

    const order = await Order.create(
      {
        customer_id: customer.id,
        address_id: address.id,
        order_number: `ORD-${Date.now()}`,
        status: paymentMethod === "CASH" ? "pending_payment" : "paid",
        subtotal, tax, shipping_cost: 0, discount, total
      },
      { transaction: t }
    );

    for (const item of cart.items) {
      await OrderItem.create(
        {
          order_id: order.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.line_total
        },
        { transaction: t }
      );
    }

    if (appliedCoupon) {
      await OrderCoupon.create(
        { order_id: order.id, coupon_id: appliedCoupon.coupon_id, discount_amount: discount },
        { transaction: t }
      );
      // El cupón solo se "gasta" (used_count++) cuando la venta REALMENTE se
      // concreta — dentro de la misma transacción, nunca en validateCoupon.
      await marketingService.registerCouponUsage(appliedCoupon.coupon_id, t);
    }

    await inventoryService.deductStockForCheckout(
      cart.items.map((i) => ({ product_variant_id: i.product_variant_id, quantity: i.quantity })),
      t,
      employeeId
    );

    const invoice = await Invoice.create(
      {
        order_id: order.id,
        employee_id: employeeId,
        invoice_number: `INV-${Date.now()}`,
        subtotal, tax, total,
        status: "issued"
      },
      { transaction: t }
    );

    await Payment.create(
      {
        invoice_id: invoice.id,
        provider: paymentMethod === "CARD" ? "stripe" : "cash",
        transaction_id: stripeIntent ? stripeIntent.id : `CASH-${Date.now()}`,
        amount: total,
        status: paymentMethod === "CASH" ? "pending" : "completed",
        payment_date: paymentMethod === "CASH" ? null : new Date()
      },
      { transaction: t }
    );

    await cartService.clearCart(cartId, t);

    await t.commit();

    return { order_id: order.id, order_number: order.order_number, total, status: order.status };
  } catch (err) {
    await t.rollback();

    if (stripeIntent) {
      try {
        await stripe.refunds.create({ payment_intent: stripeIntent.id });
      } catch (refundErr) {
        console.error("FALLO CRÍTICO: no se pudo reembolsar tras rollback del checkout:", refundErr.message);
      }
    }

    throw err;
  }
};