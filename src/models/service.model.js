import { DataTypes } from "sequelize";
export default (sequelize) => {
  const Service = sequelize.define(
    "Service",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // Title entered by admin
      serviceTitle: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      // Service type (fixed ENUM)
      type: {
        type: DataTypes.ENUM(
          "REPAIR",
          "MAINTENANCE",
          "MODIFICATION",
          "ACCIDENTAL"
        ),
        allowNull: false,
        defaultValue: "REPAIR",
      },

      // Severity taken from Severity Table (NOT ENUM)
      severityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Severities",
          key: "id",
        },
      },
      // Optional expected completion time (default SLA)
      defaultExpectedHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Optional default cost
      defaultCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      // Description entered by admin
      description: {
        type: DataTypes.TEXT,
      },

      // Is service active?
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "Services",
      timestamps: true,
    }
  );

  return Service;
};
