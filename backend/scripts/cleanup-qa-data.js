// Recupera únicamente datos abandonados por pruebas automáticas anteriores.
require("dotenv").config({ path: ".env.development" });
const { Op } = require("sequelize");
const db = require("../src/modules");

(async () => {
  const users = await db.user.findAll({
    where: { email: { [Op.like]: "qa-%@example.com" } },
    attributes: ["id"]
  });
  const userIds = users.map((user) => user.id);
  if (!userIds.length) return;

  const customers = await db.customer.findAll({ where: { user_id: userIds }, attributes: ["id"] });
  const customerIds = customers.map((customer) => customer.id);
  const orders = await db.order.findAll({ where: { customer_id: customerIds }, attributes: ["id"] });
  const orderIds = orders.map((order) => order.id);
  const invoices = await db.invoice.findAll({ where: { order_id: orderIds }, attributes: ["id"] });
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const carts = await db.cart.findAll({ where: { customer_id: customerIds }, attributes: ["id"] });
  const cartIds = carts.map((cart) => cart.id);
  const force = { force: true };

  await db.payment.destroy({ where: { invoice_id: invoiceIds }, ...force });
  await db.invoice.destroy({ where: { id: invoiceIds }, ...force });
  await db.orderCoupon.destroy({ where: { order_id: orderIds }, ...force });
  await db.orderItem.destroy({ where: { order_id: orderIds }, ...force });
  await db.order.destroy({ where: { id: orderIds }, ...force });
  await db.cartItem.destroy({ where: { cart_id: cartIds }, ...force });
  await db.cart.destroy({ where: { id: cartIds }, ...force });
  await db.address.destroy({ where: { customer_id: customerIds }, ...force });
  await db.customer.destroy({ where: { id: customerIds }, ...force });
  await db.user.destroy({ where: { id: userIds }, ...force });
  console.log(`Eliminados ${userIds.length} usuario(s) de pruebas QA abandonadas.`);
})()
  .then(() => db.sequelize.close())
  .catch(async (error) => {
    console.error(error.message);
    await db.sequelize.close();
    process.exitCode = 1;
  });
