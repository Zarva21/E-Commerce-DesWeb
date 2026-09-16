const express = require("express");
const router = express.Router();
const cart = require("./cart.controller.js");

router.get("/customer/:customerId", cart.getOrCreateForCustomer);
router.get("/:cartId", cart.getById);
router.post("/:cartId/items", cart.addItem);
router.put("/:cartId/items/:itemId", cart.updateItem);
router.delete("/:cartId/items/:itemId", cart.removeItem);

module.exports = router;
