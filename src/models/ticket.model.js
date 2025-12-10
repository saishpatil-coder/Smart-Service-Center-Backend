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

      // Associations: clientId, mechanicId, serviceId will be defined in index.js relationships
      title: { type: DataTypes.STRING, allowNull: false }, // short title
      description: { type: DataTypes.TEXT }, // client's custom description

      // store severity name (from static table) and priority snapshot
      severityName: { type: DataTypes.STRING, allowNull: false },
      severityPriority: { type: DataTypes.INTEGER, allowNull: false },

      // SLA deadlines (snapshots when ticket created)
      slaAcceptDeadline: { type: DataTypes.DATE, allowNull: false },
      slaAssignDeadline: { type: DataTypes.DATE, allowNull: false },

      // Expected completion (hours) and computed expected completion date (optional)
      expectedCompletionHours: { type: DataTypes.INTEGER, allowNull: true },
      expectedCompletionAt: { type: DataTypes.DATE, allowNull: true },

      Cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

      // Image path (single image). You can change to array if needed.
      imageUrl: { type: DataTypes.STRING, allowNull: true },

      // Status flow
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

      // SLA-related timestamps
      acceptedAt: { type: DataTypes.DATE, allowNull: true },
      assignedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },

      // flags
      isEscalated: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "Tickets",
      timestamps: true, // createdAt, updatedAt
    }
  );

  return Ticket;
};
