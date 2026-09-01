module.exports = (sequelize, Sequelize) => {
  const Invoice = sequelize.define("invoices", {
    order_id: {
      type: Sequelize.BIGINT,
      unique: true
    },
    employee_id: {
      type: Sequelize.BIGINT
    },
    invoice_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    issue_date: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    subtotal: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    tax: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    total: {
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
      allowNull: false,
      defaultValue: "issued"
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Invoice;
};
