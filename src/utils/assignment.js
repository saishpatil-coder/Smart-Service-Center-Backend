// src/utils/assignment.js
import db from "../models/index.js";

export async function assignNextTaskInQueueIfExists(mechanic) {
  try {
    // Max 1 active task per mechanic (you can change to 2 later)
    if (mechanic.assignedCount >= 1) return null;
    const mechanicId = mechanic.id;
    // Fetch next ticket from ACCEPTED queue
    const nextTicket = await db.Ticket.findOne({
      where: { status: "ACCEPTED" },
      include: [
        {
          model: db.Service,
          as: "service",
          include: [
            {
              model: db.Severity,
              as: "Severity", // must match association alias
            },
          ],
        },
      ],
      order: [
        // priority comes from severity table
        ["priority", "ASC"],
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
      assignedCount: mechanic.assignedCount + 1,
      lastAssignedAt: now,
    });

    // Create mechanic task entry
    await db.MechanicTask.create({
      ticketId: nextTicket.id,
      mechanicId,
    });

    return nextTicket;
  } catch (err) {
    console.error("AUTO-ASSIGN ERROR:", err);
    return null;
  }
}
