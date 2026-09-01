module.exports = (sequelize, Sequelize) => {
  const Coupon = sequelize.define("coupons", {
    code: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.TEXT
    },
    discount_type: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    discount_value: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    max_uses: {
      type: Sequelize.INTEGER
    },
    used_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    valid_from: {
      type: Sequelize.DATE,
      allowNull: false
    },
    valid_to: {
      type: Sequelize.DATE,
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
  return Coupon;
};
