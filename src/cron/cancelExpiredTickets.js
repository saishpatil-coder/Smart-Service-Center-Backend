import cron from "node-cron";
import db from "../models/index.js";
import { Op } from "sequelize";

export function startTicketExpiryCron() {
  console.log("⏳ Ticket expiration cron started…");

  // Runs every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      const expiredTickets = await db.Ticket.findAll({
        where: {
          status: "PENDING",
          slaAcceptDeadline: { [Op.lt]: now },
        },
      });

      if (expiredTickets.length === 0) return;

      console.log(
        `⚠️ Auto-cancelling ${expiredTickets.length} expired tickets`
      );

      await db.Ticket.update(
        { status: "CANCELLED", isEscalated: true },
        {
          where: {
            status: "PENDING",
            slaAcceptDeadline: { [Op.lt]: now },
          },
        }
      );
    } catch (err) {
      console.error("CRON ERROR:", err);
    }
  });
}
