module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define("products", {
    public_id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    },
    supplier_id: {
      type: Sequelize.BIGINT
    },
    brand_id: {
      type: Sequelize.BIGINT
    },
    category_id: {
      type: Sequelize.BIGINT
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    cost_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    sale_price: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
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
  return Product;
};
