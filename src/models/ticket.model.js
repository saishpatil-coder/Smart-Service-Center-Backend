import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Ticket = sequelize.define(
    "Ticket",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      imageUrl: { type: DataTypes.STRING },

      // Derived from severity.priority at creation
      priority: {
        type: DataTypes.INTEGER,
        allowNull: true,
        default: 0,
      },

      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM(
          "PENDING",
          "ACCEPTED",
          "ASSIGNED",
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED"
        ),
        defaultValue: "PENDING",
      },
      isPaid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      paymentMethod: {
        type: DataTypes.ENUM("CASH", "CARD", "ONLINE", "UPI"),
        allowNull: true,
      },

      isEscalated: { type: DataTypes.BOOLEAN, defaultValue: false },
      // ticket.model.js
      cancelledBy: {
        type: DataTypes.ENUM("CLIENT", "ADMIN", "SYSTEM"),
        allowNull: true,
      },

      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Important timestamps
      acceptedAt: { type: DataTypes.DATE },
      assignedAt: { type: DataTypes.DATE },
      completedAt: { type: DataTypes.DATE },
    },
    { tableName: "Tickets", timestamps: true }
  );

  return Ticket;
};
