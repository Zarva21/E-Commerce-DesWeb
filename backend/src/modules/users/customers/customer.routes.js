const express = require("express");
const router = express.Router();
const customer = require("./customer.controller.js");

router.get("/", customer.getAll);
router.get("/:id", customer.getById);
router.post("/", customer.create);
router.put("/:id", customer.update);
router.delete("/:id", customer.remove);
router.post("/:id/addresses", customer.addAddress);

module.exports = router;
