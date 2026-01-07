// src/utils/assignment.js
import db from "../models/index.js";
import { notifyUser } from "./sendNotification.js";

export async function assignNextTaskInQueueIfExists(mechanic) {
  try {
    // Max 1 active task per mechanic
    console.log("mechanic assigned count : ",mechanic.assignedCount)
    
    if (mechanic.assignedCount != 0) return null;
    const mechanicId = mechanic.id;

    // Fetch next ticket from ACCEPTED queue using the global sorting logic
    const nextTicket = await db.Ticket.findOne({
      where: { status: "ACCEPTED" },
      include: [
        {
          model: db.Service,
          as: "service",
          include: [
            {
              model: db.Severity,
              as: "Severity",
            },
          ],
        },
      ],
      order: [
        // 1. 🔥 ESCALATED TICKETS FIRST
        ["isEscalated", "DESC"],

        // 2. 🔥 CUSTOM PRIORITY (The 501, 567 values from Ticket table)
        ["priority", "ASC"],

        // 3. 🔥 FIFO (Oldest tickets first for ties)
        ["createdAt", "ASC"],
      ],
    });

    if (!nextTicket) return null;

    const now = new Date();

    // Assign ticket
    await nextTicket.update({
      mechanicId,
      status: "ASSIGNED",
      assignedAt: now,
    });

    // Update mechanic workload
    await mechanic.update({
      assignedCount: (mechanic.assignedCount || 0) + 1,
      lastAssignedAt: now,
    });

    // Create mechanic task entry
    await db.MechanicTask.create({
      ticketId: nextTicket.id,
      mechanicId,
    });

    // Notify Mechanic
    await notifyUser(
      mechanicId,
      "New Task Assigned",
      `You have been assigned a new task: ${nextTicket.title}`
    );

    // Notify Client
    await notifyUser(
      nextTicket.clientId,
      "Task Assigned",
      `Your task "${nextTicket.title}" has been assigned to a mechanic.`
    );

    return nextTicket;
  } catch (err) {
    console.error("AUTO-ASSIGN ERROR:", err);
    return null;
  }
}
