module.exports = (sequelize, Sequelize) => {
  const CartItem = sequelize.define("cart_items", {
    cart_id: {
      type: Sequelize.BIGINT
    },
    product_variant_id: {
      type: Sequelize.BIGINT
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: { min: 1 }
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return CartItem;
};
