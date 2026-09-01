module.exports = (sequelize, Sequelize) => {
  const Brand = sequelize.define("brands", {
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.TEXT
    },
    logo_url: {
      type: Sequelize.TEXT
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Brand;
};
