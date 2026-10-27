const db = require("../../index.js");
const Invoice = db.invoice;
const Payment = db.payment;

// invoices/payments son INMUTABLES en su contenido: solo lectura aquí.
// La ÚNICA creación ocurre dentro de checkout.service.js, dentro de la
// transacción ACID de la venta.

exports.getAllInvoices = () => Invoice.findAll({ order: [["issue_date", "DESC"]] });

exports.getInvoiceById = async (id) => {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) {
    const error = new Error("Factura no encontrada.");
    error.status = 404;
    throw error;
  }
  const payments = await Payment.findAll({ where: { invoice_id: id } });
  return { ...invoice.toJSON(), payments };
};

exports.getInvoiceByOrder = async (orderId) => {
  const invoice = await Invoice.findOne({ where: { order_id: orderId } });
  if (!invoice) {
    const error = new Error("No hay factura para ese pedido.");
    error.status = 404;
    throw error;
  }
  return invoice;
};

exports.getAllPayments = () => Payment.findAll({ order: [["payment_date", "DESC"]] });

exports.getPaymentById = async (id) => {
  const payment = await Payment.findByPk(id);
  if (!payment) {
    const error = new Error("Pago no encontrado.");
    error.status = 404;
    throw error;
  }
  return payment;
};

// ============================================================
// PENDIENTE:
// emitCreditNote(orderId, amount, reason) — cuando un admin modifica un
//   pedido YA pagado. NO se toca la invoice original (es inmutable).
// refundPayment(paymentId, amount) — reembolso MANUAL post-venta, distinto
//   al auto-reembolso que ya existe dentro de checkout.service.js.
// ============================================================
