const express = require("express");
const router = express.Router();
const employee = require("./employee.controller.js");

router.get("/", employee.getAll);
router.get("/:id", employee.getById);
router.post("/", employee.create);
router.put("/:id", employee.update);
router.delete("/:id", employee.remove);

module.exports = router;
