
const express = require("express");
const router = express.Router();
const auth = require("./auth.controller.js");

router.post("/signup", auth.signup);
router.post("/signin", auth.signin);

module.exports = router;