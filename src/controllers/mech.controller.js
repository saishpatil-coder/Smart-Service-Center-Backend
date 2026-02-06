import db from "../models/index.js";
import { assignNextTaskInQueueIfExists } from "../utils/assignment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";
import { notifyUser } from "../utils/sendNotification.js";
import { Op, Sequelize } from "sequelize";

export const assignMechanicIfPossible = asyncHandler(async (ticket) => {
  const mechanics = await db.User.findAll({
    where: { role: "MECHANIC", status: "ACTIVE" },
    include: [
      {
        model: db.MechanicTask,
        as: "tasks",
        required: false,
        where: { completedAt: null },
      },
    ],
    order: [["lastAssignedAt", "ASC"]],
  });

  // Free mechanic = no active task
  const freeMech = mechanics.find((m) => !m.tasks || m.tasks.length === 0);

  if (!freeMech) return null;

  const now = new Date();

  await ticket.update({
    mechanicId: freeMech.id,
    assignedAt: now,
    status: "ASSIGNED",
  });
  await freeMech.update({
    assignedCount: Sequelize.literal("assignedCount + 1"),
  });
  await db.MechanicTask.create({
    ticketId: ticket.id,
    mechanicId: freeMech.id,
  });

  await freeMech.update({
    lastAssignedAt: now,
  });
  await notifyUser(
    freeMech.id,
    "New Task Assigned",
    `You have been assigned a new task: ${ticket.title}`,
  );
  return freeMech;
});

export const getMechanicTasks = asyncHandler(async (req, res) => {
  const mechId = req.user.id;
  logger.info(`Getting tasks by mech : ${mechId}`);

  const tasks = await db.Ticket.findAll({
    where: {
      mechanicId: mechId,
    },
    include: [
      {
        model: db.Service,
        as: "service",
        attributes: ["defaultExpectedHours"],
      },
    ],
    order: [["updatedAt", "DESC"]],
  });
  logger.info(`Tasks : ${tasks.length}`);

  // Shape response for frontend
  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    expectedCompletionHours: t.service?.defaultExpectedHours ?? null,
  }));

  res.json({ tasks: formattedTasks });
});
export const getMechanicActiveTasks = asyncHandler(async (req, res) => {
  const mechId = req.user.id;

  const tasks = await db.Ticket.findAll({
    where: {
      mechanicId: mechId,
      status: ["ASSIGNED", "IN_PROGRESS"],
    },
    include: [
      {
        model: db.Service,
        as: "service",
        attributes: ["defaultExpectedHours"],
      },
    ],
    order: [["updatedAt", "DESC"]],
  });

  // Shape response for frontend
  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    expectedCompletionHours: t.service?.defaultExpectedHours ?? null,
  }));

  res.json({ tasks: formattedTasks });
});

export const startTask = asyncHandler(async (req, res) => {
  const { id } = req.params; // ticketId
  const mechanicId = req.user.id;

  const ticket = await db.Ticket.findByPk(id);

  if (
    !ticket ||
    ticket.status !== "ASSIGNED" ||
    ticket.mechanicId !== mechanicId
  ) {
    return res.status(400).json({ message: "Cannot start this task." });
  }

  const now = new Date();

  // Update ticket status
  await ticket.update({
    status: "IN_PROGRESS",
  });

  // Update mechanic task
  const mechTask = await db.MechanicTask.findOne({
    where: { ticketId: ticket.id, mechanicId },
  });

  if (!mechTask) {
    console.log("mechanic not found");
    return res.status(500).json({ message: "Mechanic task not found." });
  }

  await mechTask.update({
    startedAt: now,
  });
  await notifyUser(
    ticket.clientId,
    "Task Started",
    `Your task "${ticket.title}" has been started by the mechanic.`,
  );

  res.json({ message: "Task started", ticket });
});

export const completeTask = asyncHandler(async (req, res) => {
  const { id } = req.params; // ticketId
  const mechanicId = req.user.id;

  const ticket = await db.Ticket.findByPk(id);

  if (
    !ticket ||
    ticket.status !== "IN_PROGRESS" ||
    ticket.mechanicId !== mechanicId
  ) {
    return res.status(400).json({ message: "Cannot complete this task." });
  }

  const now = new Date();

  // Update ticket
  await ticket.update({
    status: "COMPLETED",
    completedAt: now,
  });

  // Update mechanic task
  const mechTask = await db.MechanicTask.findOne({
    where: { ticketId: ticket.id, mechanicId },
  });

  if (!mechTask) {
    return res.status(500).json({ message: "Mechanic task not found." });
  }

  await mechTask.update({
    completedAt: now,
  });

  // Free mechanic
  const mechanic = await db.User.findByPk(mechanicId);
  await mechanic.update({
    assignedCount: Math.max(0, mechanic.assignedCount - 1),
  });
  await notifyUser(
    ticket.clientId,
    "Task Completed",
    `Your task "${ticket.title}" has been completed by the mechanic.`,
  );

  // Try assigning next task automatically
  await assignNextTaskInQueueIfExists(mechanic);

  res.json({ message: "Task completed successfully", ticket });
});

export const addPartsUsedToTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    console.log("Items array is required");
    return res.status(400).json({ message: "Items array is required" });
  }

  const task = await db.MechanicTask.findOne({ where: { ticketId: taskId } });

  if (!task) {
    console.log("Mechanic task not found");
    return res.status(404).json({ message: "Mechanic task not found" });
  }

  const existingParts = task.partsUsed || [];

  for (const item of items) {
    if (!item.inventoryId || !item.quantity) continue;

    const existingIndex = existingParts.findIndex(
      (p) => p.inventoryId === item.inventoryId,
    );

    if (existingIndex !== -1) {
      // 🔁 Item already used → increase quantity
      existingParts[existingIndex].quantity += Number(item.quantity);
    } else {
      // ➕ New item
      existingParts.push({
        inventoryId: item.inventoryId,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
      });
    }

    // OPTIONAL: Reduce inventory stock
    await db.Inventory.decrement("quantity", {
      by: item.quantity,
      where: { id: item.inventoryId },
    });
  }

  task.partsUsed = existingParts;
  task.changed("partsUsed", true);

  await task.save();

  res.json({
    message: "Parts used updated successfully",
    partsUsed: task.partsUsed,
  });
});

export const getMechanicDashboardSummary = async (req, res) => {
  const mechanicId = req.user.id;
  logger.info(`Getting dashboard summary for mechanic : ${mechanicId}`);

  const [assigned, inProgress, completedToday] = await Promise.all([
    db.MechanicTask.count({
      where: { mechanicId },
    }),

    db.MechanicTask.count({
      where: { mechanicId, completedAt: null },
    }),

    db.MechanicTask.count({
      where: {
        mechanicId,
        completedAt: {
          [Op.gte]: Sequelize.literal("CURRENT_DATE"),
        },
      },
    }),
  ]);
  logger.info(
    `Dashboard Summary - Assigned: ${assigned}, In Progress: ${inProgress}, Completed Today: ${completedToday}`,
  );

  res.json({
    summary: {
      totalAssigned: assigned,
      inProgress,
      completedToday,
    },
  });
};

export const getMechanicDashboardTasks = async (req, res) => {
  const mechanicId = req.user.id;

  const tasks = await db.MechanicTask.findAll({
    where: { mechanicId },
    include: [
      {
        model: db.Ticket,
        attributes: ["id", "title", "status", "priority"],
        include: [
          {
            model: db.User,
            as: "mechanic",
            attributes: ["name", "phone"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 10,
  });

  res.json({ tasks });
};

export const punchIn = asyncHandler(async (req, res) => {
  await db.User.update(
    {
      status: "ACTIVE",
    },
    { where: { id: req.user.id } },
  );
  // Add 'await' here
  const mechanic = await db.User.findByPk(req.user.id);

  if (!mechanic) {
    return res.status(404).json({ message: "Mechanic not found" });
  }

  // Now mechanic is a Sequelize instance and has the .update method
  await assignNextTaskInQueueIfExists(mechanic);

  res.json({
    success: true,
    message: "You are now available for work",
  });
});

export const punchOut = asyncHandler(async (req, res) => {
  await db.User.update(
    {
      status: "DISABLED",
    },
    { where: { id: req.user.id } },
  );

  res.json({
    success: true,
    message: "You are now unavailable for work",
  });
});
