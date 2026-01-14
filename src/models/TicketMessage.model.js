// models/ticket_messages.model.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TicketMessage = sequelize.define(
    "TicketMessage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      ticketId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      senderRole: {
        type: DataTypes.ENUM("CLIENT", "MECHANIC", "ADMIN"),
        allowNull: false,
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      messageType: {
        type: DataTypes.ENUM("TEXT", "IMAGE", "MIXED"),
        allowNull: false,
      },
    },
    {
      tableName: "ticket_messages",
      timestamps: true,
    }
  );
  return TicketMessage;
};
