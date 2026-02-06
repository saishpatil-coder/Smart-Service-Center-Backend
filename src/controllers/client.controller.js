import db from "../models/index.js";
import { notifyAdmins } from "../utils/sendNotification.js";
import { asyncHandler } from "../utils/asyncHandler.js"; 
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";

/* ----------------------------------------------------------------
 * Create a New Ticket
 * ---------------------------------------------------------------- */
export const createTicket = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { serviceId, description, image } = req.body;
  logger.info(`CreateTicket : User ${userId} requesting service ${serviceId}`);
  // 1. Validate Service
  const service = await db.Service.findByPk(serviceId);
  if (!service) throw new ApiError(404, "Service not found");
  // 2. Get Severity Rules
  const severity = await db.Severity.findByPk(service.severityId);

  // 3. Create Ticket
  const ticket = await db.Ticket.create({
    clientId: userId,
    serviceId,
    title: service.serviceTitle,
    description,
    cost: service.defaultCost,
    imageUrl: image || null,
    status: "PENDING",
    priority: severity.priority,
  });

  logger.info(`CreateTicket : Ticket #${ticket.id} created successfully`);

  // 4. Notify Admins (Async - non-blocking)
  notifyAdmins(
    "New Ticket Created",
    `A new ticket (#${ticket.id}) has been created by ${req.user.name || "a client"}.`,
    "REDIRECT",
    { ticketId: ticket.id },
  ).catch((err) => logger.error("Notification failed", err));

  return res.status(201).json({ message: "Ticket created", ticket });
});

/* ----------------------------------------------------------------
 * Get All Tickets for Logged-In User
 * ---------------------------------------------------------------- */
export const getTicketsByUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const tickets = await db.Ticket.findAll({
    where: { clientId: userId },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: db.Service,
        as: "service",
        include: [{ model: db.Severity, as: "Severity" }],
      },
    ],
  });

  // Transform data for frontend
  const formatted = tickets.map((t) => {
    const severity = t.service?.Severity;
    const createdAt = new Date(t.createdAt);

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      imageUrl: t.imageUrl,
      status: t.status,
      cost: t.cost,
      priority: t.priority,
      createdAt: t.createdAt,
      // Derived fields
      severityName: severity?.name || "UNKNOWN",
      expectedCompletionHours: t.service?.defaultExpectedHours || null,
      slaAcceptDeadline: severity
        ? new Date(createdAt.getTime() + severity.max_accept_minutes * 60000)
        : null,
      slaAssignDeadline: severity
        ? new Date(createdAt.getTime() + severity.max_assign_minutes * 60000)
        : null,
    };
  });

  res.json({ tickets: formatted });
});

/* ----------------------------------------------------------------
 * Get Single Ticket Details
 * ---------------------------------------------------------------- */
export const getClientTicketById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const ticketId = req.params.id;

  const ticket = await db.Ticket.findOne({
    where: { id: ticketId, clientId: userId },
    include: [
      {
        model: db.Service,
        as: "service",
        include: [{ model: db.Severity, as: "Severity" }],
      },
    ],
  });

  if (!ticket) {
    throw new ApiError(404,"Ticket not found")
  }

  // Fetch parts used if any
  const mechanicTask = await db.MechanicTask.findOne({
    where: { ticketId: ticket.id },
  });

  const severity = ticket.service?.Severity;
  const createdAt = new Date(ticket.createdAt);

  const formattedTicket = {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    imageUrl: ticket.imageUrl,
    status: ticket.status,
    cost: ticket.cost,
    priority: ticket.priority,
    // Timeline
    createdAt: ticket.createdAt,
    acceptedAt: ticket.acceptedAt,
    assignedAt: ticket.assignedAt,
    completedAt: ticket.completedAt,
    // Derived
    severityName: severity?.name || "UNKNOWN",
    severityPriority: severity?.priority ?? null,
    expectedCompletionHours: ticket.service?.defaultExpectedHours ?? null,
    slaAcceptDeadline: severity
      ? new Date(createdAt.getTime() + severity.max_accept_minutes * 60000)
      : null,
    slaAssignDeadline: severity
      ? new Date(createdAt.getTime() + severity.max_assign_minutes * 60000)
      : null,
    partsUsed: mechanicTask?.partsUsed ?? [],
    isEscalated: ticket.isEscalated,
  };

  res.json({ ticket: formattedTicket });
});


/* ----------------------------------------------------------------
 * Get Unpaid Invoices
 * ---------------------------------------------------------------- */
export const getUnpaidInvoices = asyncHandler(async (req, res) => {
  const clientId = req.user.id;

  // 1. Fetch completed & unpaid tickets
  const tickets = await db.Ticket.findAll({
    where: {
      clientId,
      status: "COMPLETED",
      isPaid: false,
    },
    raw: true,
  });

  if (!tickets.length) {
    return res.json({ tickets: [], totalLabor: 0, parts: [] });
  }

  const ticketIds = tickets.map((t) => t.id);

  // 2. Fetch mechanic tasks for these tickets
  const tasks = await db.MechanicTask.findAll({
    where: { ticketId: ticketIds },
    raw: true,
  });

  // 3. Attach tasks to tickets
  const ticketsWithTasks = tickets.map((ticket) => ({
    ...ticket,
    mechanicTasks: tasks.filter((t) => t.ticketId === ticket.id),
  }));

  // 4. Calculate labor
  const totalLabor = ticketsWithTasks.reduce(
    (sum, t) => sum + Number(t.cost || 0),
    0,
  );

  // 5. Aggregate parts
  const partsMap = new Map();

  ticketsWithTasks.forEach((ticket) => {
    ticket.mechanicTasks.forEach((task) => {
      // Ensure partsUsed is an array (JSON parsing might be needed if raw:true didn't handle it)
      const parts =
        typeof task.partsUsed === "string"
          ? JSON.parse(task.partsUsed)
          : task.partsUsed || [];

      parts.forEach((part) => {
        const key = part.inventoryId;
        if (partsMap.has(key)) {
          partsMap.get(key).quantity += part.quantity;
        } else {
          partsMap.set(key, { ...part });
        }
      });
    });
  });

  res.json({
    tickets: ticketsWithTasks,
    totalLabor,
    parts: Array.from(partsMap.values()),
  });
});

/* ----------------------------------------------------------------
 * Pay Invoice
 * ---------------------------------------------------------------- */
export const payInvoice = asyncHandler(async (req, res) => {
  const clientId = req.user.id;

  logger.info(`PayInvoice : Processing payment for user ${clientId}`);

  const [updatedCount] = await db.Ticket.update(
    {
      isPaid: true,
      paymentMethod: "CASH",
    },
    {
      where: { clientId: clientId, status: "COMPLETED", isPaid: false }, // Added check for isPaid: false
    },
  );

  if (updatedCount === 0) {
    return res.status(400).json({ message: "No unpaid invoices found." });
  }

  await notifyAdmins(
    "Invoices Paid",
    `user #${clientId} paid all pending invoices`
  )
  logger.info(
    `PayInvoice : ${updatedCount} tickets marked as paid for user ${clientId}`,
  );

  res.json({
    success: true,
    message: "Invoice paid successfully",
  });
});
