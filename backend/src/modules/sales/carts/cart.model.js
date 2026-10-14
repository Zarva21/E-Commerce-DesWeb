module.exports = (sequelize, Sequelize) => {
  const Cart = sequelize.define("carts", {
    customer_id: {
      type: Sequelize.BIGINT,
      allowNull: true // Permite carritos anónimos cambio por el tema de la pagina web de ghost user
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
