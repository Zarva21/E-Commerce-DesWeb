module.exports = (sequelize, Sequelize) => {
  const OrderCoupon = sequelize.define("order_coupons", {
    order_id: {
      type: Sequelize.BIGINT
    },
    coupon_id: {
      type: Sequelize.BIGINT
    },
    discount_amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return OrderCoupon;
};
