module.exports = (sequelize, Sequelize) => {
  const ProductReview = sequelize.define("product_reviews", {
    product_id: {
      type: Sequelize.BIGINT
    },
    customer_id: {
      type: Sequelize.BIGINT
    },
    rating: {
      type: Sequelize.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    comment: {
      type: Sequelize.TEXT
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return ProductReview;
};
