import db from "../models/index.js";

// 1. GET ALL (Already started, refined here)
export const getSeverities = async (req, res) => {
  try {
    const severities = await db.Severity.findAll({
      order: [["priority", "ASC"]],
    });
    res.json({ success: true, severities });
  } catch (err) {
    console.error("GET SEVERITIES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch severities" });
  }
};

// 2. CREATE NEW
export const createSeverity = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("CREATE SEVERITY ERROR:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to create severity" });
  }
};

// 3. UPDATE (Color, Description, Priority)
export const updateSeverity = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("UPDATE SEVERITY ERROR:", err);
    res.status(400).json({ message: "Update failed" });
  }
};

// 4. DELETE
export const deleteSeverity = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.Severity.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ message: "Severity not found" });
    }

    res.json({ success: true, message: "Severity deleted successfully" });
  } catch (err) {
    console.error("DELETE SEVERITY ERROR:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
