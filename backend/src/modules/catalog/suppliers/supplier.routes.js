// supplier.routes.js — Se monta en /api/v1/catalog/suppliers
// Los proveedores NO son información pública: el cliente final no debe ver
// con quién nos abastecemos. Todo el recurso va detrás de token.

const express = require("express");
const router = express.Router();
const supplier = require("./supplier.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

router.get("/", verifyToken, checkRole(["admin", "employee"]), supplier.getAll);
router.get("/:id", verifyToken, checkRole(["admin", "employee"]), supplier.getById);
router.get("/:id/products", verifyToken, checkRole(["admin", "employee"]), supplier.getProducts);

router.post("/", verifyToken, checkRole(["admin", "employee"]), supplier.create);
router.put("/:id", verifyToken, checkRole(["admin", "employee"]), supplier.update);
router.delete("/:id", verifyToken, checkRole(["admin"]), supplier.remove);

module.exports = router;
