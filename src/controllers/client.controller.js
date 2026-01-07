import { QueryTypes } from "sequelize";
import db from "../models/index.js";
import { notifyAdmins } from "../utils/sendNotification.js";

export const createTicket = async (req, res) => {
  console.log("creting ticket")
  try {
    const userId = req.user.id;
    const { serviceId, description } = req.body;
    // Cloudinary URL (multer provides it)
    const imageUrl = req.file ? req.file.path : null;

    const service = await db.Service.findByPk(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });
    const severity = await db.Severity.findByPk(service.severityId);

    const ticket = await db.Ticket.create({
      clientId: userId,
      serviceId,
      title: service.serviceTitle,
      description,
      cost: service.defaultCost,
      imageUrl,
      status: "PENDING",
      priority:severity.priority
    });
    console.log("created")
    //send notification to 
    await notifyAdmins("New Ticket Created", `A new ticket (#${ticket.id}) has been created.`);
    return res.json({ message: "Ticket created", ticket });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create ticket" });
  }
};

export const getTicketsByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const tickets = await db.Ticket.findAll({
      where: { clientId: userId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.Service,
          as: "service",
          include: [
            {
              model: db.Severity,
              as: "Severity",
            },
          ],
        },
      ],
    });

    const formatted = tickets.map((t) => {
      const severity = t.service?.Severity;

      const createdAt = new Date(t.createdAt);

      const slaAcceptDeadline = severity
        ? new Date(createdAt.getTime() + severity.max_accept_minutes * 60000)
        : null;

      const slaAssignDeadline = severity
        ? new Date(createdAt.getTime() + severity.max_assign_minutes * 60000)
        : null;

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        imageUrl: t.imageUrl,
        status: t.status,
        cost: t.cost,
        priority: t.priority,
        createdAt: t.createdAt,

        // derived (view model)
        severityName: severity?.name || "UNKNOWN",
        expectedCompletionHours: t.service?.defaultExpectedHours || null,
        slaAcceptDeadline,
        slaAssignDeadline,
      };
    });

    res.json({ tickets: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};
export const getClientTicketById = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = req.params.id;

    const ticket = await db.Ticket.findOne({
      where: { id: ticketId, clientId: userId },
      include: [
        {
          model: db.Service,
          as: "service",
          include: [
            {
              model: db.Severity,
              as: "Severity",
            },
          ],
        },
      ],
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

        const mechanicTask = await db.MechanicTask.findOne({
          where : [{ticketId : ticket.id}]
        })

        const severity = ticket.service?.Severity;
    const createdAt = new Date(ticket.createdAt);

    const slaAcceptDeadline = severity
      ? new Date(createdAt.getTime() + severity.max_accept_minutes * 60000)
      : null;

    const slaAssignDeadline = severity
      ? new Date(createdAt.getTime() + severity.max_assign_minutes * 60000)
      : null;

    const formattedTicket = {
      // Core
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

      slaAcceptDeadline,
      slaAssignDeadline,
      partsUsed: mechanicTask?.partsUsed ?? [],

      isEscalated: ticket.isEscalated,
    };

    res.json({ ticket: formattedTicket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
};

export const getClientDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await db.User.findOne({
      where: { id: userId },
      attributes: ['id', 'name', 'email', 'phone', 'createdAt']
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json({ client });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch client details" });
  }
};

export const getUnpaidInvoices = async (req, res) => {
  try {
    const clientId = req.user.id;

    /* 1. Fetch completed & unpaid tickets */
    const tickets = await db.Ticket.findAll({
      where: {
        clientId,
        status: "COMPLETED",
        isPaid: false,
      },
      raw: true, // IMPORTANT
    });

    if (!tickets.length) {
      return res.json({
        tickets: [],
        totalLabor: 0,
        parts: [],
      });
    }

    const ticketIds = tickets.map((t) => t.id);

    /* 2. Fetch mechanic tasks */
    const tasks = await db.MechanicTask.findAll({
      where: { ticketId: ticketIds },
      raw: true,
    });

    /* 3. Attach tasks to tickets */
    const ticketsWithTasks = tickets.map((ticket) => ({
      ...ticket,
      mechanicTasks: tasks.filter((t) => t.ticketId === ticket.id),
    }));

    /* 4. Calculate labor */
    const totalLabor = ticketsWithTasks.reduce(
      (sum, t) => sum + Number(t.cost || 0),
      0
    );

    /* 5. Aggregate parts */
    const partsMap = new Map();

    ticketsWithTasks.forEach((ticket) => {
      ticket.mechanicTasks.forEach((task) => {
        (task.partsUsed || []).forEach((part) => {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch invoice data" });
  }
};


export const payInvoice = async (req, res) => {
  try {
    const clientId = req.user.id;
    await db.Ticket.update(
      {
        isPaid: true,
        paymentMethod:"CASH",
      },
      {
        where: { clientId }
      }
    );


    res.json({
      success: true,
      message: "Invoice paid successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment failed" });
  }
};
