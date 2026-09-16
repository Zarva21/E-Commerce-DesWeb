const financeService = require("./finance.service.js");

exports.getAllInvoices = async (req, res) => {
  try {
    res.status(200).send(await financeService.getAllInvoices());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    res.status(200).send(await financeService.getInvoiceById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getInvoiceByOrder = async (req, res) => {
  try {
    res.status(200).send(await financeService.getInvoiceByOrder(req.params.orderId));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    res.status(200).send(await financeService.getAllPayments());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    res.status(200).send(await financeService.getPaymentById(req.params.id));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
