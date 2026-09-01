module.exports = (sequelize, Sequelize) => {
  const OrderItem = sequelize.define("order_items", {
    order_id: {
      type: Sequelize.BIGINT
    },
    product_variant_id: {
      type: Sequelize.BIGINT
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: { min: 1 }
    },
    unit_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return OrderItem;
};
