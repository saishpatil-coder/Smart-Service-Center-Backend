import cron from "node-cron";
import db from "../models/index.js";
import { Op } from "sequelize";

export function startTicketExpiryCron() {
  console.log("⏳ Ticket expiration cron started…");

  // Runs every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      // Fetch pending tickets with service → severity
      const tickets = await db.Ticket.findAll({
        where: {
          status: "PENDING",
        },
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
      });

      const expiredTicketIds = [];
      console.log("Tickets")

      for (const ticket of tickets) {
        const maxAcceptMinutes = ticket.service?.Severity?.max_accept_minutes;

        if (!maxAcceptMinutes) continue;

        const acceptDeadline = new Date(
          ticket.createdAt.getTime() + maxAcceptMinutes * 60 * 1000
        );
        let n = new Date().toLocaleString();
        let a = new Date(acceptDeadline).toLocaleString();
        console.log("Now : " ,n);
        console.log("Accept : ",a);


        if (now > acceptDeadline) {
          expiredTicketIds.push(ticket.id);
        }
      }

      if (!expiredTicketIds.length) return;

      console.log(
        `⚠️ Auto-cancelling ${expiredTicketIds.length} expired tickets`
      );

      await db.Ticket.update(
        {
          status: "CANCELLED",
          isEscalated: true,
          cancelledBy: "SYSTEM",
          cancellationReason: "Auto-cancelled due to SLA breach",
          cancelledAt: new Date(),
        },
        {
          where: {
            id: { [Op.in]: expiredTicketIds },
          },
        }
      );
    } catch (err) {
      console.error("CRON ERROR:", err);
    }
  });
}
