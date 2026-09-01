module.exports = (sequelize, Sequelize) => {
  const Employee = sequelize.define("employees", {
    user_id: {
      type: Sequelize.BIGINT,
      unique: true
    },
    employee_code: {
      type: Sequelize.STRING(50),
      allowNull: false,
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
    position: {
      type: Sequelize.STRING(100)
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true
  });
  return Employee;
};
