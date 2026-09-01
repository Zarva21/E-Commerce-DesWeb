const express = require("express");
const router = express.Router();
const user = require("./user.controller.js");

router.get("/:id", user.getById);
router.patch("/:id/change-password", user.changePassword);
router.patch("/:id/deactivate", user.deactivate);

module.exports = router;
