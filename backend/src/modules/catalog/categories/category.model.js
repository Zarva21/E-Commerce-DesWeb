module.exports = (sequelize, Sequelize) => {
  const Category = sequelize.define("categories", {
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.TEXT
    },
    parent_category_id: {
      type: Sequelize.BIGINT
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Category;
};
