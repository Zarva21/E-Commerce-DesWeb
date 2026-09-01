module.exports = (sequelize, Sequelize) => {
  const Payment = sequelize.define("payments", {
    invoice_id: {
      type: Sequelize.BIGINT
    },
    provider: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    transaction_id: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    currency: {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: "USD"
    },
    status: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    payment_date: {
      type: Sequelize.DATE
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Payment;
};
