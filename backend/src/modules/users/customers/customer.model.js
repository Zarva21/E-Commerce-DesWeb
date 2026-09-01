module.exports = (sequelize, Sequelize) => {
  const Customer = sequelize.define("customers", {
    user_id: {
      type: Sequelize.BIGINT,
      unique: true
    },
    first_name: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    last_name: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    phone: {
      type: Sequelize.STRING(20)
    },
    birth_date: {
      type: Sequelize.DATEONLY
    },
    gender: {
      type: Sequelize.STRING(30)
    },
    marketing_enabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Customer;
};
