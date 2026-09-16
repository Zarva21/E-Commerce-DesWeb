const checkoutService = require("./checkout.service.js");

// POST /sales/checkout/intent
exports.createIntent = async (req, res) => {
  try {
    const { cart_id, coupon_code } = req.body;
    const result = await checkoutService.createIntent({
      cartId: cart_id,
      couponCode: coupon_code,
      userId: req.userId || null
    });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// POST /sales/checkout/confirm
exports.confirm = async (req, res) => {
  try {
    const { cart_id, payment_method, stripe_payment_intent_id, coupon_code, address_id, guest_data } = req.body;

    const result = await checkoutService.confirmCheckout({
      cartId: cart_id,
      paymentMethod: payment_method,
      stripePaymentIntentId: stripe_payment_intent_id,
      couponCode: coupon_code,
      addressId: address_id,
      guestData: guest_data,
      userId: req.userId || null,
      employeeId: null // si un empleado procesa la venta en tienda, se agrega vía verifyToken más adelante
    });

    res.status(201).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
