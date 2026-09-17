/*
 * Prueba end-to-end contra PostgreSQL y Stripe TEST.
 * Crea datos con prefijo QA-AUTO y borra, con force:true, únicamente sus IDs.
 */
const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const dotenv = require("dotenv");

const integration = process.env.RUN_INTEGRATION === "1" ? test : test.skip;
let db;
let server;
let baseUrl;
const ids = {};
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const qa = `QA-AUTO-${suffix}`;

async function api(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

before(async () => {
  dotenv.config({ path: ".env.development" });
  db = require("../src/modules");
  await db.sequelize.authenticate();

  const app = require("../src/app");
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (db) {
    // Se eliminan hijos antes que padres para respetar llaves foráneas.
    const force = { force: true };
    for (const paymentId of ids.payments || []) await db.payment.destroy({ where: { id: paymentId }, ...force });
    for (const invoiceId of ids.invoices || []) await db.invoice.destroy({ where: { id: invoiceId }, ...force });
    for (const orderId of ids.orders || []) await db.orderCoupon.destroy({ where: { order_id: orderId }, ...force });
    for (const orderId of ids.orders || []) await db.orderItem.destroy({ where: { order_id: orderId }, ...force });
    for (const orderId of ids.orders || []) await db.order.destroy({ where: { id: orderId }, ...force });
    if (ids.variant) await db.inventoryMovement.destroy({ where: { product_variant_id: ids.variant }, ...force });
    if (ids.variant) await db.stock.destroy({ where: { product_variant_id: ids.variant }, ...force });
    for (const cartId of ids.carts || []) await db.cartItem.destroy({ where: { cart_id: cartId }, ...force });
    for (const cartId of ids.carts || []) await db.cart.destroy({ where: { id: cartId }, ...force });
    if (ids.product) await db.productImage.destroy({ where: { product_id: ids.product }, ...force });
    if (ids.product) await db.productVariant.destroy({ where: { product_id: ids.product }, ...force });
    if (ids.product) await db.product.destroy({ where: { id: ids.product }, ...force });
    if (ids.brand) await db.brand.destroy({ where: { id: ids.brand }, ...force });
    if (ids.category) await db.category.destroy({ where: { id: ids.category }, ...force });
    for (const addressId of ids.addresses || []) await db.address.destroy({ where: { id: addressId }, ...force });
    for (const customerId of ids.customers || []) await db.customer.destroy({ where: { id: customerId }, ...force });
    for (const userId of ids.users || []) await db.user.destroy({ where: { id: userId }, ...force });
    if (ids.customerRole) await db.role.destroy({ where: { id: ids.customerRole }, ...force });
    await db.sequelize.close();
  }
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

integration("flujo real: catálogo, URL de imagen, inventario, carrito y checkout en efectivo", { timeout: 120000 }, async () => {
  let customerRole = await db.role.findOne({ where: { name: "customer" } });
  if (!customerRole) {
    customerRole = await db.role.create({ name: "customer", description: "Creado temporalmente por QA" });
    ids.customerRole = customerRole.id;
  }

  const email = `qa-admin-${suffix}@example.com`;
  let result = await api("/api/v1/users/auth/signup", {
    method: "POST",
    body: { email, password: "QA-password-123", roleName: "admin" }
  });
  assert.equal(result.response.status, 201, result.body.message);
  ids.users = [result.body.user.id];

  result = await api("/api/v1/users/auth/signin", {
    method: "POST",
    body: { email, password: "QA-password-123" }
  });
  assert.equal(result.response.status, 200, result.body.message);
  const token = result.body.accessToken;

  result = await api("/api/v1/catalog/categories", {
    method: "POST", token, body: { name: `${qa} categoría`, description: "Categoría temporal" }
  });
  assert.equal(result.response.status, 201, result.body.message);
  ids.category = result.body.id;

  result = await api("/api/v1/catalog/brands", {
    method: "POST", token,
    body: { name: `${qa} marca`, logo_url: "https://example.test/assets/qa-logo.png" }
  });
  assert.equal(result.response.status, 201, result.body.message);
  ids.brand = result.body.id;

  const imageUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
  result = await api("/api/v1/catalog/products", {
    method: "POST", token,
    body: {
      name: `${qa} producto`, description: "Producto temporal de integración",
      cost_price: 10, sale_price: 25, brand_id: ids.brand, category_id: ids.category,
      variants: [{ sku: `QA-${suffix}`, color: "negro", size: "M" }],
      images: [{ image_url: imageUrl, alt_text: "Imagen QA", display_order: 1, is_primary: true }]
    }
  });
  assert.equal(result.response.status, 201, result.body.message);
  ids.product = result.body.id;

  result = await api(`/api/v1/catalog/products/${ids.product}/variants`);
  assert.equal(result.response.status, 200, result.body.message);
  ids.variant = result.body[0].id;

  result = await api(`/api/v1/catalog/products/${ids.product}/images`);
  assert.equal(result.response.status, 200, result.body.message);
  assert.equal(result.body[0].image_url, imageUrl);

  result = await api("/api/v1/inventory/receive", {
    method: "POST", body: { product_variant_id: ids.variant, quantity: 3, reference: qa }
  });
  assert.equal(result.response.status, 201, result.body.message);

  const customerEmail = `qa-customer-${suffix}@example.com`;
  result = await api("/api/v1/users/customers", {
    method: "POST",
    body: {
      email: customerEmail, password: "QA-password-123", first_name: "QA", last_name: "Cliente",
      address: { country: "GT", city: "Guatemala", address_line1: "Avenida Cliente 1" }
    }
  });
  assert.equal(result.response.status, 201, result.body.message);
  ids.customers = [result.body.id];
  const customer = await db.customer.findByPk(ids.customers[0]);
  const customerUser = await db.user.findByPk(customer.user_id);
  const customerAddress = await db.address.findOne({ where: { customer_id: customer.id } });
  ids.users.push(customerUser.id);
  ids.addresses = [customerAddress.id];

  result = await api("/api/v1/users/auth/signin", {
    method: "POST", body: { email: customerEmail, password: "QA-password-123" }
  });
  assert.equal(result.response.status, 200, result.body.message);
  const customerToken = result.body.accessToken;

  result = await api(`/api/v1/sales/carts/customer/${ids.customers[0]}`);
  assert.equal(result.response.status, 200, result.body.message);
  ids.carts = [result.body.cart_id];

  result = await api(`/api/v1/sales/carts/${ids.carts[0]}/items`, {
    method: "POST", body: { product_variant_id: ids.variant, quantity: 1 }
  });
  assert.equal(result.response.status, 201, result.body.message);
  assert.equal(result.body.subtotal, 25);

  // Llamada real a Stripe en modo test: crea un PaymentIntent, no cobra una tarjeta.
  result = await api("/api/v1/sales/checkout/intent", {
    method: "POST", body: { cart_id: ids.carts[0] }
  });
  assert.equal(result.response.status, 200, result.body.message);
  assert.match(result.body.payment_intent_id, /^pi_/);
  assert.equal(result.body.total, 25);
  const paymentIntentId = result.body.payment_intent_id;

  // Simula el frontend mediante el método Visa oficial de Stripe TEST.
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const stripeIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: "pm_card_visa",
    return_url: "https://example.com/qa-complete"
  });
  assert.equal(stripeIntent.status, "succeeded");

  result = await api("/api/v1/sales/checkout/confirm", {
    method: "POST",
    body: {
      cart_id: ids.carts[0], payment_method: "CARD", stripe_payment_intent_id: paymentIntentId,
      guest_data: {
        email: `qa-card-${suffix}@example.com`, first_name: "QA", last_name: "Tarjeta",
        address: { country: "GT", city: "Guatemala", address_line1: "Calle QA 1" }
      }
    }
  });
  assert.equal(result.response.status, 201, result.body.message);
  assert.equal(result.body.status, "paid");
  ids.orders = [result.body.order_id];

  const cardOrder = await db.order.findByPk(ids.orders[0]);
  const cardCustomer = await db.customer.findByPk(cardOrder.customer_id);
  const cardUser = await db.user.findByPk(cardCustomer.user_id);
  ids.customers.push(cardCustomer.id);
  ids.users.push(cardUser.id);
  ids.addresses.push(cardOrder.address_id);
  const cardInvoice = await db.invoice.findOne({ where: { order_id: cardOrder.id } });
  const cardPayment = await db.payment.findOne({ where: { invoice_id: cardInvoice.id } });
  ids.invoices = [cardInvoice.id];
  ids.payments = [cardPayment.id];
  assert.equal(cardPayment.provider, "stripe");
  assert.equal(cardPayment.status, "completed");

  // Un segundo carrito confirma venta en efectivo como cliente autenticado.
  result = await api(`/api/v1/sales/carts/customer/${ids.customers[0]}`);
  assert.equal(result.response.status, 200, result.body.message);
  ids.carts.push(result.body.cart_id);
  result = await api(`/api/v1/sales/carts/${ids.carts[1]}/items`, {
    method: "POST", body: { product_variant_id: ids.variant, quantity: 1 }
  });
  assert.equal(result.response.status, 201, result.body.message);

  result = await api("/api/v1/sales/checkout/confirm", {
    method: "POST",
    body: {
      cart_id: ids.carts[1], payment_method: "CASH", address_id: customerAddress.id
    }
    , token: customerToken
  });
  assert.equal(result.response.status, 201, result.body.message);
  assert.equal(result.body.status, "pending_payment");
  ids.orders.push(result.body.order_id);

  const cashOrder = await db.order.findByPk(result.body.order_id);
  assert.equal(String(cashOrder.customer_id), String(customer.id));
  assert.equal(String(cashOrder.address_id), String(customerAddress.id));
  const cashInvoice = await db.invoice.findOne({ where: { order_id: cashOrder.id } });
  const cashPayment = await db.payment.findOne({ where: { invoice_id: cashInvoice.id } });
  ids.invoices.push(cashInvoice.id);
  ids.payments.push(cashPayment.id);
  assert.equal(cashPayment.provider, "cash");
  assert.equal(cashPayment.status, "pending");

});
