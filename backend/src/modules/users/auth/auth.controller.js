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

// POST /auth/convert-guest — "crea tu contraseña" en la pantalla post-compra
exports.convertGuest = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send({ message: "Email y password son obligatorios." });
    const result = await authService.convertGuestToAccount({ email, password });
    res.status(200).send(result);
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
