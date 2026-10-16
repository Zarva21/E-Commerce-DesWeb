const express = require("express");
const router = express.Router();
const cart = require("./cart.controller.js");

router.get("/customer/:customerId", cart.getOrCreateForCustomer);
router.post("/guest", cart.createGuestCart);
router.get("/:cartId", cart.getById);
router.post("/:cartId/items", cart.addItem);
router.put("/:cartId/items/:itemId", cart.updateItem);
router.delete("/:cartId/items/:itemId", cart.removeItem);

router.delete("/carts/:cartId/items", cart.clearCartItems);
router.put("/:cartId/sync", cart.syncCart);

module.exports = router;
