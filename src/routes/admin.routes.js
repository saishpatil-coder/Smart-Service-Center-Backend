import { Router } from "express";
import { verifyAdmin } from "../middleware/auth.middleware.js";
import { registerUser } from "../controllers/auth.controller.js";
import { getAllMechanics,deleteMechanic, getAllPendingTickets, getAssignmentQueue, getAllTickets, getTicketById, acceptTicket, cancelTicket, getMechanicWithTasks } from "../controllers/admin.controller.js";
import { getAllServices,addService, getSeverities } from "../controllers/service.controller.js";
import { getInventory } from "../controllers/inventory.controller.js";
const router = Router();
console.log("Admin routes loaded");

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

// Ticket Detail Routes
router.get("/ticket/:id", verifyAdmin, getTicketById);
router.patch("/ticket/:id/accept", verifyAdmin, acceptTicket);
router.patch("/ticket/:id/cancel", verifyAdmin, cancelTicket);

router.get("/mechanics", verifyAdmin, getAllMechanics);
router.delete("/mechanic/:id", verifyAdmin, deleteMechanic);

router.get("/mechanics/:id", verifyAdmin, getMechanicWithTasks);

export default router;
