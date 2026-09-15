// review.controller.js

const reviewService = require("./review.service.js");

// GET /catalog/products/:id/reviews  (también expuesto en /catalog/reviews/product/:id)
exports.getByProduct = async (req, res) => {
  try {
    const productId = req.params.id || req.params.productId;
    const { page, limit } = req.query;
    res.status(200).send(await reviewService.getByProduct(productId, { page, limit }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

// POST /catalog/products/:id/reviews  (rol customer)
exports.create = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    res.status(201).send(await reviewService.create(req.params.id, req.userId, { rating, comment }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    res.status(200).send(await reviewService.update(req.params.id, req.userId, { rating, comment }));
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await reviewService.remove(req.params.id);
    res.status(200).send({ message: "Reseña eliminada." });
  } catch (err) {
    res.status(err.status || 500).send({ message: err.message });
  }
};
