import { DataTypes } from "sequelize";
export default  (sequelize) => {
  const Severity = sequelize.define(
    "Severity",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false, 
        unique: true,
      },

      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      max_accept_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      max_assign_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      description: {
        type: DataTypes.TEXT,
      },

      color: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "Severities",
      timestamps: false, // static table → no timestamps needed
    }
  );

  return Severity;
};
