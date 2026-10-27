const authService = require("./auth.service.js");

exports.signup = async (req, res) => {
  try {
    const { email, password, roleName } = req.body;
    if (!email || !password) return res.status(400).send({ message: "Email y password son obligatorios." });
    const user = await authService.signup({ email, password, roleName });
    res.status(201).send({ message: "Usuario registrado correctamente.", user });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send({ message: "Email y password son obligatorios." });
    const result = await authService.signin({ email, password });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.convertGuest = async (req, res) => {
  try {
    const { email, password, phone, telefono } = req.body;
    if (!email || !password) {
      return res.status(400).send({ message: "Email y password son obligatorios." });
    }
    const result = await authService.convertGuestToAccount({
      email,
      password,
      phone: phone || telefono,
    });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ message: "El correo es obligatorio." });
    const result = await authService.forgotPassword({ email });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.send2FA = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ message: "El correo es obligatorio." });
    const result = await authService.send2FACode({ email });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await authService.verify2FACode({ userId, code });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    const result = await authService.googleAuth({ credential });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// --- ENDPOINTS DE REFRESH TOKEN Y LOGOUT ---

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshSession(refreshToken);
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.revokeSession(refreshToken);
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};