// category.routes.js — Se monta en /api/v1/catalog/categories

const express = require("express");
const router = express.Router();
const category = require("./category.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// --- Públicas ---
// OJO: /tree va ANTES que /:id, si no Express interpretaría "tree" como un id.
router.get("/tree", category.getTree);
router.get("/", category.getAll);
router.get("/:id", category.getById);

// --- Protegidas (admin/employee) ---
router.post("/", verifyToken, checkRole(["admin", "employee"]), category.create);
router.put("/:id", verifyToken, checkRole(["admin", "employee"]), category.update);
router.delete("/:id", verifyToken, checkRole(["admin"]), category.remove);

module.exports = router;
