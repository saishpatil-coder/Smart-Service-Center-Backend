// src/routes/ticket.routes.js
import { Router } from "express";
import { getAllServices } from "../controllers/service.controller.js";
import { verifyClient } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.js";
import { createTicket, getClientDetails, getClientTicketById, getTicketsByUser, getUnpaidInvoices, payInvoice } from "../controllers/client.controller.js";
import { cancelTicket, getTicketById } from "../controllers/admin.controller.js";

const router = Router();
router.post(
  "/add-ticket",
  verifyClient,
  upload.single("image"),createTicket);

router.get("/tickets",verifyClient,getTicketsByUser )
router.get("/services" , getAllServices);
router.get("/getclient" , verifyClient ,getClientDetails);
router.get("/ticket/:id", verifyClient, getTicketById);
router.patch("/ticket/:id/cancel", verifyClient, cancelTicket);
router.get("/unpaid-invoice",verifyClient,getUnpaidInvoices);
router.post("/pay-invoice",verifyClient,payInvoice)
export default router;
