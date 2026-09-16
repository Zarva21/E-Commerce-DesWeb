const express = require("express");
const router = express.Router();
const finance = require("./finance.controller.js");

// Solo GET — deliberado. Sin POST/PUT/DELETE: invoices/payments se crean
// únicamente dentro de checkout.service.js.
router.get("/invoices", finance.getAllInvoices);
router.get("/invoices/order/:orderId", finance.getInvoiceByOrder);
router.get("/invoices/:id", finance.getInvoiceById);

router.get("/payments", finance.getAllPayments);
router.get("/payments/:id", finance.getPaymentById);

module.exports = router;
