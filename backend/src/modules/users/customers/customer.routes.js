const express = require("express");
const router = express.Router();
const customer = require("./customer.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// 1. Rutas específicas (DEBEN ir antes de /:id)
router.get("/addresses/me", verifyToken, customer.getMyAddresses);

// 2. Rutas administrativas de catálogo de clientes
router.get("/", verifyToken, checkRole(["admin", "employee"]), customer.getAll);
router.post("/", verifyToken, checkRole(["admin", "employee"]), customer.create);

// 3. Rutas por parámetro :id
router.get("/:id", verifyToken, checkRole(["admin", "employee"]), customer.getById);
router.put("/:id", verifyToken, checkRole(["admin"]), customer.update);
router.delete("/:id", verifyToken, checkRole(["admin"]), customer.remove);
router.post("/:id/addresses", verifyToken, customer.addAddress);

module.exports = router;
