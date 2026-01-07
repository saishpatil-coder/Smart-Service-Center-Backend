import { DataTypes } from "sequelize";

export default (sequelize) => {
  const MechanicTask = sequelize.define(
    "MechanicTask",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      startedAt: { type: DataTypes.DATE },
      completedAt: { type: DataTypes.DATE },
      notes: { type: DataTypes.TEXT },
         partsUsed: {
        type: DataTypes.JSONB, // JSONB recommended for Postgres
        allowNull: true,
        defaultValue: [],},

    },
    { tableName: "MechanicTasks", timestamps: true }
  );

  return MechanicTask;
};
