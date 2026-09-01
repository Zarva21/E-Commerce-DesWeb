module.exports = (sequelize, Sequelize) => {
  const Stock = sequelize.define("stock", {
    product_variant_id: {
      type: Sequelize.BIGINT,
      unique: true
    },
    quantity_on_hand: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    reorder_level: {
      type: Sequelize.INTEGER,
      defaultValue: 5
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Stock;
};
