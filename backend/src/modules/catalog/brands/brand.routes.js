// brand.routes.js — Se monta en /api/v1/catalog/brands

const express = require("express");
const router = express.Router();
const brand = require("./brand.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// --- Públicas: la vitrina necesita listar marcas sin estar logueado ---
router.get("/", brand.getAll);
router.get("/:id", brand.getById);

// --- Protegidas: solo admin/employee administran el catálogo ---
router.post("/", verifyToken, checkRole(["admin", "employee"]), brand.create);
router.put("/:id", verifyToken, checkRole(["admin", "employee"]), brand.update);
router.delete("/:id", verifyToken, checkRole(["admin"]), brand.remove);

module.exports = router;
