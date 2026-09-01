module.exports = (sequelize, Sequelize) => {
  const AuditLog = sequelize.define("audit_logs", {
    entity_name: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    entity_id: {
      type: Sequelize.BIGINT,
      allowNull: false
    },
    action: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    old_values: {
      type: Sequelize.JSONB
    },
    new_values: {
      type: Sequelize.JSONB
    },
    user_id: {
      type: Sequelize.BIGINT
    },
    ip_address: {
      type: Sequelize.STRING(45)
    }
  }, {
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ["entity_name", "entity_id"] }
    ]
  });
  return AuditLog;
};
