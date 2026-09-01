module.exports = (sequelize, Sequelize) => {
  const ProductImage = sequelize.define("product_images", {
    product_id: {
      type: Sequelize.BIGINT
    },
    image_url: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    alt_text: {
      type: Sequelize.STRING(255)
    },
    display_order: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    is_primary: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return ProductImage;
};
