// models/customer_feedbacks.model.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "refresh_token",
      timestamps: true,
    },
  );
  return RefreshToken;
};
