

import { verifyAdmin } from "../middleware/auth.middleware.js";
import { registerUser } from "../controllers/auth.controller.js";
import { getAllMechanics,deleteMechanic, getAllPendingTickets, getAssignmentQueue, getAllTickets, getTicketById, acceptTicket, cancelTicket, getMechanicWithTasks, addInventoryItem, deleteInventoryItem } from "../controllers/admin.controller.js";
import { getAllServices,addService, getSeverities } from "../controllers/service.controller.js";
import { getInventory } from "../controllers/inventory.controller.js";
console.log("Admin routes loaded");


import express from "express";
import { Sequelize, Op } from "sequelize";
import db from "../models/index.js";

const router = express.Router();
/* ----------------------------------------------------
   ADMIN — ADD NEW MECHANIC
----------------------------------------------------- */   
router.post("/add-mechanic", verifyAdmin,registerUser);
/* ----------------------------------------------------
   GET ALL MECHANICS
----------------------------------------------------- */   
router.get("/mechanics", verifyAdmin,getAllMechanics);
/* ----------------------------------------------------
   DELETE MECHANIC
----------------------------------------------------- */   
router.delete("/mechanic/:id", verifyAdmin,deleteMechanic );

// Add new service
router.post("/services", verifyAdmin,addService );

// List services (admin or public usage)
router.get("/services", getAllServices);
router.get("/severities" , verifyAdmin,getSeverities);
//get all pending tickets 
router.get("/pending-tickets",verifyAdmin,getAllPendingTickets);

//get assignment queue 
router.get("/assignment-queue",verifyAdmin,getAssignmentQueue);

//get all tickets
router.get("/tickets",verifyAdmin,getAllTickets);

router.get("/inventory", getInventory);
router.post("/inventory", verifyAdmin,addInventoryItem);
router.delete("/inventory/:id", verifyAdmin, deleteInventoryItem);


// Ticket Detail Routes
router.get("/ticket/:id", verifyAdmin, getTicketById);
router.patch("/ticket/:id/accept", verifyAdmin, acceptTicket);
router.patch("/ticket/:id/cancel", verifyAdmin, cancelTicket);

router.get("/mechanics", verifyAdmin, getAllMechanics);
router.delete("/mechanic/:id", verifyAdmin, deleteMechanic);

router.get("/mechanics/:id", verifyAdmin, getMechanicWithTasks);


router.get("/dashboard/industry-stats", async (req, res) => {
  try {
    // Run analytical queries in parallel for production performance
    const [
      kpiData,
      technicianEfficiency,
      statusDistribution,
      inventoryStatus
    ] = await Promise.all([
      
      // 1. Core KPIs - Note: Using exact case "isEscalated" from model 
      db.Ticket.findOne({
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.col("id")), "totalTickets"],
          [
            Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN "status" = 'COMPLETED' THEN "cost" ELSE 0 END`)), 
            "totalRevenue"
          ],
          [
            Sequelize.fn("AVG", Sequelize.literal(`CASE WHEN "status" = 'COMPLETED' THEN "cost" ELSE NULL END`)), 
            "avgTicketValue"
          ],
          [
            Sequelize.fn("COUNT", Sequelize.literal(`CASE WHEN "isEscalated" = true THEN 1 END`)), 
            "escalationCount"
          ]
        ],
        raw: true
      }),

      // 2. Best Performing Mechanics [cite: 107, 108]
      db.MechanicTask.findAll({
        attributes: [
          "mechanicId",
          [Sequelize.fn("COUNT", Sequelize.col("MechanicTask.id")), "resolvedTickets"],
          [
            Sequelize.fn("AVG", Sequelize.literal(`EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 3600`)),
            "avgResolutionTime"
          ]
        ],
        where: { completedAt: { [Op.ne]: null } }, // Only completed tasks [cite: 116]
        include: [{ 
            model: db.User, 
            as: "mechanic", 
            attributes: ["name", "assignedCount"] // prevent overloading technicians [cite: 365, 382]
        }],
        group: ["mechanicId", "mechanic.id"],
        order: [[Sequelize.literal('"resolvedTickets"'), "DESC"]],
        limit: 5
      }),

      // 3. Workload Distribution by Status [cite: 334, 342]
      db.Ticket.findAll({
        attributes: [
          "status",
          [Sequelize.fn("COUNT", Sequelize.col("Ticket.id")), "count"]
        ],
        group: ["status"],
        raw: true
      }),

      // 4. Critical Inventory (Stock levels vs Min Stock) 
      db.Inventory.findAll({
        attributes: ["name", "quantity", "minStock", "unitPrice"],
        where: {
          quantity: { [Op.lte]: Sequelize.col("minStock") } // Correct Sequelize syntax for column comparison [cite: 75, 89]
        },
        limit: 10
      })
    ]);

    res.json({
      metrics: {
        revenue: parseFloat(kpiData.totalRevenue || 0),
        ticketThroughput: parseInt(kpiData.totalTickets || 0),
        avgOrderValue: parseFloat(kpiData.avgTicketValue || 0),
        riskLevel: parseInt(kpiData.escalationCount || 0) // Fixed field name 
      },
      leaderboard: technicianEfficiency,
      inventory: inventoryStatus,
      statusStats: statusDistribution,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error);
    res.status(500).json({ error: "Internal Server Error during data aggregation" });
  }
});

export default router;