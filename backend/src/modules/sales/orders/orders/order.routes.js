const express = require("express");
const router = express.Router();
const order = require("./order.controller.js");

router.get("/", order.getAll);
router.get("/:id", order.getById);
router.patch("/:id/status", order.updateStatus); // ÚNICO campo editable — no hay PUT genérico

module.exports = router;
