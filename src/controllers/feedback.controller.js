import db from "../models/index.js";

export const submitCustomerFeedback = async (req, res) => {
  try {
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
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit feedback" });
  }
};

export const submitMechanicFeedback = async (req, res) => {
  try {
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
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit feedback" });
  }
};

export const getTicketFeedback = async (req, res) => {
  try {
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
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch feedback" });
  }
};
