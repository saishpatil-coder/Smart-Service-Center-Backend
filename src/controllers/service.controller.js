import db from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const addService = asyncHandler(async (req, res) => {
  const {
    serviceTitle,
    type,
    severityId,
    defaultExpectedHours,
    defaultCost,
    description,
  } = req.body;

  // basic validation
  if (!serviceTitle || !severityId)
    return res
      .status(400)
      .json({ message: "serviceTitle and severityId are required" });

  const safeHours = parseFloat(defaultExpectedHours) || 0;
  const safeCost = parseFloat(defaultCost) || 0;

  // check severity exists
  const severity = await db.Severity.findByPk(severityId);
  if (!severity) {
    return res.status(404).json({
      message: "Invalid severity selected",
    });
  }

  const service = await db.Service.create({
    serviceTitle,
    type,
    severityId,
    defaultExpectedHours: safeHours,
    defaultCost: safeCost,
    description,
  });

  return res.status(201).json({
    message: "Service created successfully",
    service,
  });
});

export const getAllServices = asyncHandler(async (req, res) => {
  const services = await db.Service.findAll({
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: db.Severity,
        attributes: [
          "id",
          "name",
          "priority",
          "max_accept_minutes",
          "max_assign_minutes",
          "description",
          "color",
        ],
      },
    ],
  });

  res.json({ services });
});

export const toggleServiceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const service = await db.Service.findByPk(id);

  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  service.isActive = isActive;
  await service.save();

  return res.status(200).json({
    message: "Status updated",
    service,
  });
});

// controllers/serviceController.js
export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { serviceTitle, type, defaultExpectedHours, defaultCost } = req.body;

  const service = await db.Service.findByPk(id);
  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  // Update fields
  service.serviceTitle = serviceTitle;
  service.type = type;
  service.defaultExpectedHours = defaultExpectedHours;
  service.defaultCost = defaultCost;

  // Note: If you want to update Severity, you need to validate the new severityId exists first.

  await service.save();

  // Reload to get the associated Severity data for the return
  await service.reload({
    include: [{ model: db.Severity }],
  });

  return res.status(200).json({
    message: "Service updated successfully",
    service,
  });
});
