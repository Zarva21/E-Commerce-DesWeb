const express = require("express");
const router = express.Router();
const role = require("./role.controller.js");
const { verifyToken, checkRole } = require("../../../middlewares/auth.middleware.js");

// Solo admin administra y consulta roles
router.use(verifyToken, checkRole(["admin"]));

router.get("/", role.getAll);
router.get("/:id", role.getById);
router.post("/", role.create);
router.put("/:id", role.update);
router.delete("/:id", role.remove);

module.exports = router;
