module.exports = (sequelize, Sequelize) => {
  const Order = sequelize.define("orders", {
    customer_id: {
      type: Sequelize.BIGINT
    },
    address_id: {
      type: Sequelize.BIGINT
    },
    order_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    status: {
      type: Sequelize.ENUM("pending_payment", "paid", "shipped", "delivered", "cancelled"),
      defaultValue: "pending_payment"
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
    shipping_cost: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    discount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    total: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    order_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      timestamps: true,
      underscored: true,
      paranoid: true,
      
      indexes: [
        // Reporte 1: Ventas por fecha y estado
        {
          name: "idx_orders_created_at_status",
          fields: ["created_at", "status"],
        },
        // Filtro rápido de estados (ej. omitir cancelados / carritos abandonados)
        {
          name: "idx_orders_status",
          fields: ["status"],
        },
        // Reporte 4 & búsquedas: Relación con el cliente
        {
          name: "idx_orders_customer_id",
          fields: ["customer_id"],
        },
      ],
    }
  );
return Order;
};