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
      allowNull: false,
      validate: {
        isIn: {
          args: [["percentage", "fixed"]],
          msg: "discount_type debe ser 'percentage' o 'fixed'."
        }
      }
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
    },
    // AGREGADO (módulo Marketing):
    // Los cupones normales de campaña van con customer_id = NULL (los usa cualquiera).
    // Los cupones de "Store Credit" emitidos por una devolución quedan amarrados
    // al cliente que devolvió la mercadería, para que nadie más los canjee.
    customer_id: {
      type: Sequelize.BIGINT,
      allowNull: true
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Coupon;
};
