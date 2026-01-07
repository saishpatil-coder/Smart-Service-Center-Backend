// import cron from "node-cron";
// import db from "../models/index.js";
// import { Op } from "sequelize";
// import { notifyAdmins, notifyUser } from "../utils/sendNotification.js";

// export function startTicketExpiryCron() {
//   console.log("⏳ Ticket expiration cron started…");

//   // Runs every 5 minutes
//   cron.schedule("*/5 * * * *", async () => {
//     try {
//       const now = new Date();

//       // Fetch pending tickets with service → severity
//       const tickets = await db.Ticket.findAll({
//         where: {
//           status: "PENDING",
//         },
//         include: [
//           {
//             model: db.Service,
//             as: "service",
//             include: [
//               {
//                 model: db.Severity,
//                 as: "Severity",
//               },
//             ],
//           },
//         ],
//       });

//       const expiredTicketIds = [];
//       const expiredTicketsClients = [];
//       console.log("Tickets")

//       for (const ticket of tickets) {
//         const maxAcceptMinutes = ticket.service?.Severity?.max_accept_minutes;

//         if (!maxAcceptMinutes) continue;

//         const acceptDeadline = new Date(
//           ticket.createdAt.getTime() + maxAcceptMinutes * 60 * 1000
//         );
//         let n = new Date().toLocaleString();
//         let a = new Date(acceptDeadline).toLocaleString();
//         console.log("Now : " ,n);
//         console.log("Accept : ",a);


//         if (now > acceptDeadline) {
//           expiredTicketIds.push(ticket.id);
//           expiredTicketsClients.push(ticket.clientId);
//         }
//       }

//       if (!expiredTicketIds.length) return;

//       console.log(
//         `⚠️ Auto-cancelling ${expiredTicketIds.length} expired tickets`
//       );

//       await db.Ticket.update(
//         {
//           status: "CANCELLED",
//           isEscalated: true,
//           cancelledBy: "SYSTEM",
//           cancellationReason: "Auto-cancelled due to SLA breach",
//           cancelledAt: new Date(),
//         },
//         {
//           where: {
//             id: { [Op.in]: expiredTicketIds },
//           },
//         }
//       );
//       for (const clientId of expiredTicketsClients) {
//         await notifyUser(
//           clientId,
//           "Ticket Cancelled",
//           `Your ticket has been cancelled due to SLA breach.`
//         );
//       }
//       await notifyAdmins(
//         "Tickets Auto-Cancelled",
//         `${expiredTicketIds.length} ${expiredTicketIds.length == 1 ? "ticket" : "tickets"} have been auto-cancelled due to SLA breach.`
//       );
      
//     } catch (err) {
//       console.error("CRON ERROR:", err);
//     }
//   });
// }

import cron from "node-cron";
import db from "../models/index.js";
import { Op } from "sequelize";
import { notifyAdmins, notifyUser } from "../utils/sendNotification.js";

export function startTicketExpiryCron() {
  console.log("⏳ Ticket SLA (Expiry & Escalation) cron started…");

  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      // 1. Fetch tickets that are either PENDING (for expiry) or ACCEPTED (for escalation)
      const tickets = await db.Ticket.findAll({
        where: {
          status: { [Op.in]: ["PENDING", "ACCEPTED"] },
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
      const expiredTicketsClients = [];

      const escalateTicketIds = [];
      const escalateTicketsClients = [];

      for (const ticket of tickets) {
        const severity = ticket.service?.Severity;
        if (!severity) continue;

        // --- LOGIC A: PENDING TICKETS (Expiry Check) ---
        if (ticket.status === "PENDING") {
          const maxAcceptMinutes = severity.max_accept_minutes;
          const acceptDeadline = new Date(
            ticket.createdAt.getTime() + maxAcceptMinutes * 60 * 1000
          );

          if (now > acceptDeadline) {
            expiredTicketIds.push(ticket.id);
            expiredTicketsClients.push({
              id: ticket.id,
              clientId: ticket.clientId,
            });
          }
        }

        // --- LOGIC B: ACCEPTED TICKETS (Auto-Escalation Check) ---
        if (ticket.status === "ACCEPTED" && !ticket.isEscalated) {
          const maxAssignMinutes = severity.max_assign_minutes;
          const assignDeadline = new Date(
            ticket.createdAt.getTime() + maxAssignMinutes * 60 * 1000
          );

          if (now > assignDeadline) {
            escalateTicketIds.push(ticket.id);
            escalateTicketsClients.push({
              id: ticket.id,
              clientId: ticket.clientId,
              title: ticket.title,
            });
          }
        }
      }

      // --- EXECUTE AUTO-CANCELLATION (PENDING -> CANCELLED) ---
      if (expiredTicketIds.length > 0) {
        await db.Ticket.update(
          {
            status: "CANCELLED",
            cancelledBy: "SYSTEM",
            cancellationReason: "Auto-cancelled due to Accept SLA breach",
            cancelledAt: new Date(),
          },
          { where: { id: { [Op.in]: expiredTicketIds } } }
        );

        for (const item of expiredTicketsClients) {
          await notifyUser(
            item.clientId,
            "Ticket Cancelled",
            "Your ticket was cancelled as it wasn't accepted within the SLA period."
          );
        }
        await notifyAdmins(
          "Tickets Auto-Cancelled",
          `${expiredTicketIds.length} tickets cancelled due to SLA breach.`
        );
      }

      // --- EXECUTE AUTO-ESCALATION (ACCEPTED -> ESCALATED) ---
      if (escalateTicketIds.length > 0) {
        console.log(
          `🚀 Auto-escalating ${escalateTicketIds.length} tickets due to Assign SLA breach`
        );

        await db.Ticket.update(
          { isEscalated: true },
          { where: { id: { [Op.in]: escalateTicketIds } } }
        );

        for (const item of escalateTicketsClients) {
          await notifyUser(
            item.clientId,
            "Ticket Escalated",
            `We are prioritizing your ticket "${item.title}" as it has exceeded the standard assignment time.`
          );
        }

        await notifyAdmins(
          "Critical: Tickets Auto-Escalated",
          `${escalateTicketIds.length} tickets have been moved to high priority (Escalated) due to delay in assignment.`
        );
      }
    } catch (err) {
      console.error("CRON ERROR:", err);
    }
  });
}