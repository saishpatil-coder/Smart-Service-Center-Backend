import express from "express";

import { verifyAdmin } from "../middleware/auth.middleware.js";
import { getSeverities } from "../controllers/service.controller.js";
import { createSeverity, deleteSeverity, updateSeverity } from "../controllers/severity.controller.js";
// import { isAdmin } from "../middleware/auth.middleware"; // Recommended for these routes

const router = express.Router();

// Define routes
router.get("/",verifyAdmin, getSeverities);
router.post("/",verifyAdmin, createSeverity); // Create
router.put("/:id",verifyAdmin, updateSeverity); // Update by ID
router.delete("/:id",verifyAdmin, deleteSeverity); // Delete by ID

export default router;
