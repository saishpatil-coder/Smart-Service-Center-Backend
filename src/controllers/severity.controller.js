import db from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 1. GET ALL (Already started, refined here)
export const getSeverities = asyncHandler(async (req, res) => {
  const severities = await db.Severity.findAll({
    order: [["priority", "ASC"]],
  });
  res.json({ severities });
});

// 2. CREATE NEW
export const createSeverity = asyncHandler(async (req, res) => {
  const {
    name,
    priority,
    max_accept_minutes,
    max_assign_minutes,
    description,
    color,
  } = req.body;

  const newSeverity = await db.Severity.create({
    name,
    priority,
    max_accept_minutes,
    max_assign_minutes,
    description,
    color,
  });

  res.status(201).json({ success: true, severity: newSeverity });
});

// 3. UPDATE (Color, Description, Priority)
export const updateSeverity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    priority,
    max_accept_minutes,
    max_assign_minutes,
    description,
    color,
  } = req.body;

  const severity = await db.Severity.findByPk(id);
  if (!severity) {
    return res.status(404).json({ message: "Severity level not found" });
  }

  await severity.update({
    name,
    priority,
    max_accept_minutes,
    max_assign_minutes,
    description,
    color,
  });

  res.json({
    success: true,
    message: "Severity updated successfully",
    severity,
  });
});
// 4. DELETE
export const deleteSeverity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await db.Severity.destroy({ where: { id } });

  if (!deleted) {
    return res.status(404).json({ message: "Severity not found" });
  }

  res.json({ success: true, message: "Severity deleted successfully" });
});
