module.exports = (sequelize, Sequelize) => {
  const InventoryMovement = sequelize.define("inventory_movements", {
    product_variant_id: {
      type: Sequelize.BIGINT
    },
    employee_id: {
      type: Sequelize.BIGINT
    },
    movement_type: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    reference: {
      type: Sequelize.STRING(100)
    },
    notes: {
      type: Sequelize.TEXT
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return InventoryMovement;
};
