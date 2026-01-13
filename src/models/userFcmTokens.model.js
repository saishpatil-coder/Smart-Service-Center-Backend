// models/UserFcmTokens.model.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const UserFcmTokens = sequelize.define(
    "UserFcmTokens",
    {
      // Primary data: The unique FCM token [cite: 76]
      token: {
        type: DataTypes.TEXT,
        unique: true,
        allowNull: false,
      },
      // Foreign Key: Links to the User (Customer, Mechanic, or Admin) [cite: 74, 118]
      userId: {
        type: DataTypes.INTEGER, // Use INTEGER or UUID based on your User model [cite: 74]
        allowNull: false,
      },
      // Metadata: For security and identity verification [cite: 45, 98]
      deviceInfo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      // Model Options
      timestamps: true, // Recommended for auditing SLA and login history [cite: 15, 47]
    }
  );

  return UserFcmTokens;
};
