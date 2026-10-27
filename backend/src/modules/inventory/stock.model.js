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
      paranoid: true,
      tableName: "stocks",
      indexes: [
        // Reporte 3: Alertas de Stock / Existencias bajas
        {
          name: "idx_stock_quantity_on_hand",
          fields: ["quantity_on_hand"],
        },
        // Opcional: Índice para buscar productos por debajo de su umbral dinámico
        {
          name: "idx_stock_reorder_level",
          fields: ["reorder_level"],
        },
      ],
    }
  );

  return Stock;
};
