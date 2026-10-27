const express = require("express");
const router = express.Router();
const customer = require("./customer.controller.js");
const { verifyToken, checkRole, isOwnerOrAdmin } = require("../../../middlewares/auth.middleware.js");

// 1. Rutas específicas propias (DEBEN ir antes de /:id para evitar colisiones)
router.get("/addresses/me", verifyToken, customer.getMyAddresses);

// 2. Rutas administrativas generales
router.get("/", verifyToken, checkRole(["admin", "employee"]), customer.getAll);
router.post("/", customer.create);

// 3. Rutas individuales por :id (Dueño o Administrador)
router.get("/:id", verifyToken, isOwnerOrAdmin, customer.getById);
router.put("/:id", verifyToken, isOwnerOrAdmin, customer.update);
router.post("/:id/addresses", verifyToken, isOwnerOrAdmin, customer.addAddress);

// 4. Eliminación (Solo Admin)
router.delete("/:id", verifyToken, checkRole(["admin"]), customer.remove);

module.exports = router;