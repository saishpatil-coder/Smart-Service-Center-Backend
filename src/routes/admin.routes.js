import { verifyAdmin } from "../middleware/auth.middleware.js";
import { registerUser } from "../controllers/auth.controller.js";
import {
  getAllMechanics,
  deleteMechanic,
  getAllPendingTickets,
  getAssignmentQueue,
  getAllTickets,
  getTicketById,
  acceptTicket,
  cancelTicket,
  getMechanicWithTasks,
  getIndustryStats,
  markAsEscalated,
  updateTicketCustomPriority,
} from "../controllers/admin.controller.js";
import {
  getAllServices,
  addService,
  getSeverities,
} from "../controllers/service.controller.js";
import {
  addInventoryItem,
  deleteInventoryItem,
  getInventory,
} from "../controllers/inventory.controller.js";
import express from "express";

const router = express.Router();

// Add new service
router.post("/services", verifyAdmin, addService);
router.post("/ticket/:id/escalate", verifyAdmin, markAsEscalated);
router.post("/ticket/:id/priority", verifyAdmin, updateTicketCustomPriority);
// List services (admin or public usage)
router.get("/services", getAllServices);
// List severities
router.get("/severities", verifyAdmin, getSeverities);

/* ----------------------------------------------------
ADMIN — Inventory management routes
----------------------------------------------------- */
router.get("/inventory", getInventory);
router.post("/inventory", verifyAdmin, addInventoryItem);
router.delete("/inventory/:id", verifyAdmin, deleteInventoryItem);

/* ----------------------------------------------------
ADMIN — Ticket management routes
----------------------------------------------------- */
//get all tickets
router.get("/tickets", verifyAdmin, getAllTickets);
// Ticket Detail Routes
router.get("/ticket/:id", verifyAdmin, getTicketById);
// Ticket Action Routes
router.patch("/ticket/:id/accept", verifyAdmin, acceptTicket);
router.patch("/ticket/:id/cancel", verifyAdmin, cancelTicket);
//get all pending tickets
router.get("/pending-tickets", verifyAdmin, getAllPendingTickets);
//get assignment queue
router.get("/assignment-queue", verifyAdmin, getAssignmentQueue);
// Remove /tickets if your axios call is already including it correctly
// Or ensure the path matches exactly what axios is sending.
/* ----------------------------------------------------
   ADMIN — Mechanic management routes
----------------------------------------------------- */
//get all mechanics
router.get("/mechanics", verifyAdmin, getAllMechanics);
//delete mechanic
router.delete("/mechanic/:id", verifyAdmin, deleteMechanic);
//get mechanic with tasks
router.get("/mechanics/:id", verifyAdmin, getMechanicWithTasks);
//add mechanic
router.post("/add-mechanic", verifyAdmin, registerUser);

// Dashboard Stats Route
router.get("/dashboard/industry-stats", verifyAdmin, getIndustryStats);

export default router;
