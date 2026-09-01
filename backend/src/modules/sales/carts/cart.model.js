module.exports = (sequelize, Sequelize) => {
  const Cart = sequelize.define("carts", {
    customer_id: {
      type: Sequelize.BIGINT
    },
    status: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "active"
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Cart;
};
