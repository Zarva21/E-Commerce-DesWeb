const express = require("express");
const router = express.Router();
const auth = require("./auth.controller.js");

// Endpoints principales
router.post("/signup", auth.signup);
router.post("/signin", auth.signin);
router.post("/convert-guest", auth.convertGuest);

// Recuperación y 2FA
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);
router.post("/send-2fa", auth.send2FA);
router.post("/verify-2fa", auth.verify2FA);
router.post("/google", auth.googleAuth);

// Refresh Token y Cierre de sesión en Redis
router.post("/refresh-token", auth.refreshToken);
router.post("/logout", auth.logout);

module.exports = router;