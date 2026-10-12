const express = require("express");
const router = express.Router();
const order = require("./order.controller.js");
const authJwt = require("../../../middlewares/auth.middleware.js");

router.get("/", order.getAll);
router.get("/me", [authJwt.verifyToken], order.getMyOrders); // GET /sales/orders/me — pedidos del usuario autenticado
router.get("/:id", order.getById);
router.patch("/:id/status", order.updateStatus); // ÚNICO campo editable — no hay PUT genérico


module.exports = router;
