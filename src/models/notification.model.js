// models/notification.model.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Notification = sequelize.define(
    "Notification",
    {
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false, // 👈 matches DB constraint
      },

      type: {
        type: DataTypes.STRING,
        defaultValue: "INFO",
      },

      relatedEntityType: {
        type: DataTypes.STRING,
      },

      relatedEntityId: {
        type: DataTypes.UUID,
      },

      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      timestamps: true,
    }
  );

  return Notification;
};
