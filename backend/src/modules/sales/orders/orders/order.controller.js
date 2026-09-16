const orderService = require("./order.service.js");

exports.getAll = async (req, res) => {
  try {
    const { customer_id, status } = req.query;
    res.status(200).send(await orderService.getAll({ customer_id, status }));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    res.status(200).send(await orderService.getById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).send({ message: "status es obligatorio." });
    res.status(200).send(await orderService.updateStatus(req.params.id, status, req.userId || null));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
