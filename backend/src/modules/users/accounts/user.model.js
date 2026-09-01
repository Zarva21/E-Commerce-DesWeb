module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("users", {
    role_id: {
      type: Sequelize.BIGINT
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password_hash: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return User;
};
