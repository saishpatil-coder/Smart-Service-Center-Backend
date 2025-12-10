import { Router } from "express";
import { verifyAdmin } from "../middleware/auth.middleware.js";
import { registerUser } from "../controllers/auth.controller.js";
import { getAllMechanics,deleteMechanic, getAllPendingTickets, getAssignmentQueue, getAllTickets } from "../controllers/admin.controller.js";
import { getAllServices,addService } from "../controllers/service.controller.js";
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

//get all pending tickets 
router.get("/pending-tickets",verifyAdmin,getAllPendingTickets);

//get assignment queue 
router.get("/assignment-queue",verifyAdmin,getAssignmentQueue);

//get all tickets
router.get("/tickets",verifyAdmin,getAllTickets);

export default router;
