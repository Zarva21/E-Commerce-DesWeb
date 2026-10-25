const userService = require("./user.service.js");

exports.getById = async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    return res.status(200).send({ data: user });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).send({ message: "Se requiere la contraseña actual y la nueva." });
    }
    const result = await userService.changePassword(req.params.id, oldPassword, newPassword);
    return res.status(200).send(result);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const result = await userService.toggleStatus(req.params.id);
    return res.status(200).send({
      message: result.is_active ? "Cuenta reactivada." : "Cuenta desactivada.",
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;

    if (!role_id) {
      return res.status(400).send({ message: "El role_id es obligatorio." });
    }

    const updatedUser = await userService.updateUserRole(id, role_id);
    return res.status(200).send({ message: "Rol actualizado.", data: updatedUser });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};