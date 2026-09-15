// review.service.js — product_reviews.
// Es una entidad débil: se crea desde POST /catalog/products/:id/reviews.
// Aquí solo está la lógica; las rutas viven en product.routes.js y review.routes.js.

const db = require("../../index.js");

const ProductReview = db.productReview;
const Product = db.product;
const Customer = db.customer;

const httpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

exports.getByProduct = async (productId, { page = 1, limit = 10 } = {}) => {
  const product = await Product.findByPk(productId);
  if (!product) throw httpError("Producto no encontrado.", 404);

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

  const result = await ProductReview.findAndCountAll({
    where: { product_id: productId },
    include: [{ model: Customer, attributes: ["id", "first_name", "last_name"], required: false }],
    order: [["created_at", "DESC"]],
    limit: pageSize,
    offset: (pageNumber - 1) * pageSize
  });

  const stats = await ProductReview.findAll({
    where: { product_id: productId },
    attributes: [[db.sequelize.fn("AVG", db.sequelize.col("rating")), "average"]],
    raw: true
  });

  return {
    total: result.count,
    page: pageNumber,
    limit: pageSize,
    rating_average:
      stats[0] && stats[0].average ? Number(Number(stats[0].average).toFixed(2)) : null,
    data: result.rows
  };
};

/**
 * Crea una reseña.
 * El JWT nos da el user_id; de ahí resolvemos a qué customer corresponde,
 * para que nadie pueda opinar "en nombre de" otro cliente mandando un id.
 */
exports.create = async (productId, userId, { rating, comment }) => {
  const product = await Product.findByPk(productId);
  if (!product) throw httpError("Producto no encontrado.", 404);

  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) throw httpError("No se encontró un perfil de cliente para este usuario.", 403);

  const value = parseInt(rating, 10);
  if (!value || value < 1 || value > 5) {
    throw httpError("La calificación (rating) debe ser un número del 1 al 5.", 400);
  }

  // Un cliente, una reseña por producto.
  const existing = await ProductReview.findOne({
    where: { product_id: productId, customer_id: customer.id }
  });
  if (existing) {
    throw httpError("Ya dejaste una reseña para este producto. Puedes editarla.", 409);
  }

  return ProductReview.create({
    product_id: productId,
    customer_id: customer.id,
    rating: value,
    comment
  });
};

exports.update = async (reviewId, userId, { rating, comment }) => {
  const review = await ProductReview.findByPk(reviewId);
  if (!review) throw httpError("Reseña no encontrada.", 404);

  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer || customer.id.toString() !== review.customer_id.toString()) {
    throw httpError("No puedes editar una reseña que no es tuya.", 403);
  }

  if (rating !== undefined) {
    const value = parseInt(rating, 10);
    if (!value || value < 1 || value > 5) {
      throw httpError("La calificación (rating) debe ser un número del 1 al 5.", 400);
    }
  }

  return review.update({ rating, comment });
};

/** Moderación: el admin puede bajar una reseña ofensiva (soft delete). */
exports.remove = async (reviewId) => {
  const review = await ProductReview.findByPk(reviewId);
  if (!review) throw httpError("Reseña no encontrada.", 404);
  await review.destroy();
};
