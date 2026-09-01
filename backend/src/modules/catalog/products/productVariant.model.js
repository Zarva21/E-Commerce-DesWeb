module.exports = (sequelize, Sequelize) => {
  const ProductVariant = sequelize.define("product_variants", {
    product_id: {
      type: Sequelize.BIGINT
    },
    sku: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    color: {
      type: Sequelize.STRING(50)
    },
    size: {
      type: Sequelize.STRING(20)
    },
    weight: {
      type: Sequelize.DECIMAL(10, 3)
    },
    barcode: {
      type: Sequelize.STRING(50)
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return ProductVariant;
};
