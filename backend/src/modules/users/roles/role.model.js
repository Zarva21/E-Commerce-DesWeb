module.exports = (sequelize, Sequelize) => {
  const Role = sequelize.define("roles", {
    name: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.STRING(255)
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Role;
};
