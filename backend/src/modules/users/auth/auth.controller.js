const db = require("../../index.js");           
const config = require("../../../config/auth.config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = db.user;
const Role = db.role;

exports.signup = async (req, res) => {
  try {
    const { email, password, roleName = "customer" } = req.body;

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).send({ message: `El rol "${roleName}" no existe.` });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    await User.create({
      email,
      password_hash: hashedPassword,
      role_id: role.id
    });

    res.status(201).send({ message: "Usuario registrado correctamente." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).send({ message: "Usuario no encontrado." });
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password_hash);
    if (!passwordIsValid) {
      return res.status(401).send({ message: "Contraseña incorrecta." });
    }

    const token = jwt.sign({ id: user.id, role_id: user.role_id }, config.secret, {
      expiresIn: config.expiresIn
    });

    res.status(200).send({
      id: user.id,
      email: user.email,
      accessToken: token,
      expiresIn: config.expiresIn
    });
  } catch (err) {
    res.status(500).send({ message: err.message || "Ocurrió un error al iniciar sesión." });
  }
};
