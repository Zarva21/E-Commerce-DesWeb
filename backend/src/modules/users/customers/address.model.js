module.exports = (sequelize, Sequelize) => {
  const Address = sequelize.define("addresses", {
    customer_id: {
      type: Sequelize.BIGINT
    },
    country: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    state: {
      type: Sequelize.STRING(100)
    },
    city: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    address_line1: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    address_line2: {
      type: Sequelize.STRING(255)
    },
    postal_code: {
      type: Sequelize.STRING(20)
    },
    is_default: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Address;
};
