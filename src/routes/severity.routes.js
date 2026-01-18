import express from "express";

import { verifyAdmin } from "../middleware/auth.middleware.js";
import { createSeverity, deleteSeverity, getSeverities, updateSeverity } from "../controllers/severity.controller.js";
const router = express.Router();

// Define routes
router.get("/",verifyAdmin, getSeverities);
router.post("/",verifyAdmin, createSeverity); // Create
router.put("/:id",verifyAdmin, updateSeverity); // Update by ID
router.delete("/:id",verifyAdmin, deleteSeverity); // Delete by ID

export default router;
