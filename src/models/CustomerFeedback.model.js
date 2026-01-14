// models/customer_feedbacks.model.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const CustomerFeedback =  sequelize.define(
    "CustomerFeedback",
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

      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },

      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "customer_feedbacks",
      timestamps: true,
    }
  );
  return CustomerFeedback;
};
