import { Router } from "express";
import { verifyMechanic } from "../middleware/auth.middleware.js";
import { addPartsUsedToTask, completeTask, getMechanicActiveTasks, getMechanicDashboardSummary, getMechanicDashboardTasks, getMechanicTasks,  punchIn,  punchOut,  startTask } from "../controllers/mech.controller.js";
import { getInventory } from "../controllers/inventory.controller.js";
import { getTicketById } from "../controllers/admin.controller.js";

const router = Router();

router.get("/tasks/active", verifyMechanic, getMechanicActiveTasks);
router.get("/tasks" , verifyMechanic , getMechanicTasks)
router.patch("/task/:id/complete",verifyMechanic,completeTask);
router.patch("/task/:id/start",verifyMechanic,startTask);
router.post("/tasks/:taskId/parts-used",verifyMechanic,addPartsUsedToTask );
router.get("/inventory",getInventory);
router.get("/task/:id",verifyMechanic,getTicketById);
router.get("/dashboard/summary", verifyMechanic, getMechanicDashboardSummary);

router.get("/dashboard/tasks", verifyMechanic, getMechanicDashboardTasks);
// src/routes/mechanic.routes.js

router.patch("/punch-in", verifyMechanic, punchIn);
router.patch("/punch-out", verifyMechanic, punchOut);

export default router;