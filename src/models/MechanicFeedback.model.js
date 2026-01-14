// models/mechanic_feedbacks.model.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const MechanicFeedback =  sequelize.define(
    "MechanicFeedback",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      ticketId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },

      mechanicId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      workSummary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      issuesFound: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      recommendations: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "mechanic_feedbacks",
      timestamps: true,
    }
  );
  return MechanicFeedback;
};
