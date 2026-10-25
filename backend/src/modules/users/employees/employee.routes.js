const express = require("express");
const router = express.Router();
const employee = require("./employee.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// Todo el CRUD de colaboradores requiere permisos de Administrador
router.use(verifyToken, checkRole(["admin"]));

router.get("/", employee.getAll);
router.get("/:id", employee.getById);
router.post("/", employee.create);
router.put("/:id", employee.update);
router.delete("/:id", employee.remove);

module.exports = router;
