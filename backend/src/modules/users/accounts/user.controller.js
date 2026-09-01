const userService = require("./user.service.js");

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await userService.findById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).send({ message: "Se requiere la contraseña actual y la nueva." });
    }
    await userService.changePassword(req.params.id, oldPassword, newPassword);
    res.status(200).send({ message: "Contraseña actualizada." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.deactivate = async (req, res) => {
  try {
    await userService.deactivate(req.params.id);
    res.status(200).send({ message: "Cuenta desactivada." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
