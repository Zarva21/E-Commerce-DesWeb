// sales.routes.js — enrutador maestro del módulo Sales.
const express = require("express");
const router = express.Router();

router.use("/carts", require("./carts/cart.routes.js"));
router.use("/checkout", require("./checkout/checkout.routes.js"));
router.use("/orders", require("./orders/order.routes.js"));
router.use("/finance", require("./finance/finance.routes.js"));

module.exports = router;
