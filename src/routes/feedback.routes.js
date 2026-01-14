import express from "express";
import {
  verifyClient,
  verifyMechanic,
  verifyUser,
} from "../middleware/auth.middleware.js";
import {
  getTicketFeedback,
  submitCustomerFeedback,
  submitMechanicFeedback,
} from "../controllers/feedback.controller.js";

const router = express.Router();

// Customer feedback
router.post(
  "/:ticketId/client-feedback",
  verifyClient,
  submitCustomerFeedback
);

// Mechanic feedback
router.post(
  "/:ticketId/mechanic-feedback",
  verifyMechanic,
  submitMechanicFeedback
);

// Get feedback (customer / mechanic / admin)
router.get("/:ticketId/feedback", verifyUser, getTicketFeedback);

export default router;
