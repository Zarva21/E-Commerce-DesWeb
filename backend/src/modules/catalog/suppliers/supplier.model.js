module.exports = (sequelize, Sequelize) => {
  const Supplier = sequelize.define("suppliers", {
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
      unique: true
    },
    contact_email: {
      type: Sequelize.STRING(255),
      validate: { isEmail: true }
    },
    phone: {
      type: Sequelize.STRING(20)
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Supplier;
};
