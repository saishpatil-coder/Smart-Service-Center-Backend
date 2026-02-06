import db from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const submitCustomerFeedback = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { rating, comment } = req.body;
  const user = req.user;

  const feedback = await db.CustomerFeedback.create({
    ticketId,
    customerId: user.id,
    rating,
    comment,
  });

  return res.status(201).json(feedback);
});

export const submitMechanicFeedback = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { workSummary, issuesFound, recommendations } = req.body;
  const user = req.user;

  const feedback = await db.MechanicFeedback.create({
    ticketId,
    mechanicId: user.id,
    workSummary,
    issuesFound,
    recommendations,
  });

  return res.status(201).json(feedback);
});

export const getTicketFeedback = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;

  const customerFeedback = await db.CustomerFeedback.findOne({
    where: { ticketId },
  });

  const mechanicFeedback = await db.MechanicFeedback.findOne({
    where: { ticketId },
  });

  return res.json({
    customerFeedback,
    mechanicFeedback,
  });
});
