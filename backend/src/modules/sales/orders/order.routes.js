const express = require("express");
const router = express.Router();
const order = require("./order.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");


router.get("/me", verifyToken, order.getMyOrders);
router.get("/", verifyToken, checkRole(["admin", "employee"]), order.getAll);
router.get("/:id", verifyToken, checkRole(["admin", "employee"]), order.getById);
router.patch("/:id/status", verifyToken, checkRole(["admin", "employee"]), order.updateStatus);
router.patch("/:id/collect-cash", verifyToken, checkRole(["admin", "employee"]), order.collectCash);

module.exports = router;
