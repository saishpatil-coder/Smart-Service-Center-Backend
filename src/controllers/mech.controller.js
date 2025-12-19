import db from "../models/index.js";
import { assignNextTaskInQueueIfExists } from "../utils/assignment.js";
export const assignMechanicIfPossible = async (ticket) => {
  try {
    const mechanics = await db.User.findAll({
      where: { role: "MECHANIC", status: "ACTIVE" },
      include: [
        {
          model: db.MechanicTask,
          as: "tasks", // 👈 MUST match association alias
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

    await db.MechanicTask.create({
      ticketId: ticket.id,
      mechanicId: freeMech.id,
    });

    await freeMech.update({
      lastAssignedAt: now,
    });

    return freeMech;
  } catch (err) {
    console.error("ASSIGN MECHANIC ERROR:", err);
    return null;
  }
};




export const getMechanicTasks = async (req, res) => {
  try {
    const mechId = req.user.id;

    const tasks = await db.Ticket.findAll({
      where: {
        mechanicId: mechId
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
  } catch (err) {
    console.error("GET MECHANIC TASKS ERROR:", err);
    res.status(500).json({ message: "Failed fetching tasks" });
  }
};

export const getMechanicActiveTasks = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("GET MECHANIC TASKS ERROR:", err);
    res.status(500).json({ message: "Failed fetching tasks" });
  }
};



export const startTask = async (req, res) => {
  try {
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
      return res.status(500).json({ message: "Mechanic task not found." });
    }

    await mechTask.update({
      startedAt: now,
    });

    res.json({ message: "Task started", ticket });
  } catch (err) {
    console.log(err)
    console.error("START TASK ERROR:", err);
    res.status(500).json({ message: "Error starting task" });
  }
};



export const completeTask = async (req, res) => {
  try {
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

    // Try assigning next task automatically
    await assignNextTaskInQueueIfExists(mechanic);

    res.json({ message: "Task completed successfully", ticket });
  } catch (err) {
    console.log( err)
    console.log("COMPLETE TASK ERROR:", err);
    res.status(500).json({ message: "Error completing task" });
  }
};


export const addPartsUsedToTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { items } = req.body;
    console.log("taskId : " ,taskId)
    console.log("items" , items)

    // items = [{ inventoryId, name, quantity, unit, unitPrice }]

    if (!Array.isArray(items) || items.length === 0) {
      console.log("Items array is required")
      return res.status(400).json({ message: "Items array is required" });
    }

    const task = await db.MechanicTask.findOne(
      { where: { ticketId: taskId } }
    );

    if (!task) {
      console.log("Mechanic task not found")
      return res.status(404).json({ message: "Mechanic task not found" });
    }

    const existingParts = task.partsUsed || [];

    for (const item of items) {
      if (!item.inventoryId || !item.quantity) continue;

      const existingIndex = existingParts.findIndex(
        (p) => p.inventoryId === item.inventoryId
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update parts used" });
  }
};