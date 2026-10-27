const express = require("express");
const router = express.Router();
const user = require("./user.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// 1. Operaciones sobre la cuenta de usuario por ID
router.patch("/:id/role", verifyToken, checkRole(["admin"]), user.updateRole);
router.patch("/:id/deactivate", verifyToken, checkRole(["admin"]), user.deactivate);
router.patch("/:id/change-password", verifyToken, user.changePassword);

// 2. Consulta individual (siempre al final)
router.get("/:id", verifyToken, user.getById);

module.exports = router;
