import { Op, Sequelize, where } from "sequelize";
import db from "../models/index.js"
import { assignMechanicIfPossible } from "./mech.controller.js";
import { notifyAdmins, notifyUser } from "../utils/sendNotification.js";
export  const getAllMechanics = async (req, res) => {
  console.log("getting mechs")
  try {
    const mechanics = await db.User.findAll({
      where: { role: "MECHANIC" },
      attributes: ["id", "name", "email", "mobile", "status", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ mechanics });
  } catch (err) {
    console.log("FETCH MECHANICS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch mechanics." });
  }
};

export  const deleteMechanic = async (req, res) => {
  try {
    const { id } = req.params;

    const mech = await db.User.findByPk(id);

    if (!mech || mech.role !== "MECHANIC") {
      return res.status(404).json({ message: "Mechanic not found." });
    }

    await mech.destroy();

    return res.json({ message: "Mechanic deleted successfully." });
  } catch (err) {
    console.log("DELETE MECHANIC ERROR:", err);
    return res.status(500).json({ message: "Failed to delete mechanic." });
  }
}


export const getAllPendingTickets = async (req, res) => {
  console.log("getting pending tickets");

  try {
    const tickets = await db.Ticket.findAll({
      where: { status: "PENDING" },
      order: [
        ["priority", "ASC"], // High priority first
        ["createdAt", "ASC"], // Oldest first
      ],
      include: [
        {
          model: db.Service,
          as: "service",
          include: [{ model: db.Severity, as: "Severity" }],
        },
        { model: db.User, as: "client" },
      ],
    });
    // ⭐ Process and compute REQUIRED dynamic fields
    const enrichedTickets = tickets.map((t) => {
      const severity = t.service?.Severity;
      const maxAccept = severity?.max_accept_minutes ?? 0;
      const created = new Date(t.createdAt);
      const slaAcceptDeadline = new Date(created.getTime() + maxAccept * 60000);

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        imageUrl: t.imageUrl,
        createdAt: t.createdAt,

        // ⭐ fields expected by frontend
        severityName: severity?.name,
        priority: severity?.priority,

        slaAcceptDeadline,
        // including original ticket + relations
        status: t.status,
        client: t.client,
        service: t.service,
      };
    });

    return res.json({ tickets: enrichedTickets });
  } catch (err) {
    console.error("GET PENDING ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch pending tickets" });
  }
};

export const getAssignmentQueue = async (req, res) => {
  try {
    const tickets = await db.Ticket.findAll({
      where: { status: "ACCEPTED" },

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

      order: [
        // 1. 🔥 ESCALATED FIRST (isEscalated: true comes before false)
        // Since true is usually 1 and false is 0, we use DESC for true first
        ["isEscalated", "DESC"],

        // 2. 🔥 CUSTOM PRIORITY (The 501, 567 values from Ticket table)
        // Usually, lower numbers mean "top of the list"
        ["priority", "ASC"],

        // 3. 🔥 FIFO (Oldest tickets first for ties in priority)
        ["createdAt", "ASC"],
      ],
    });

    const formattedTickets = tickets.map((ticket) => {
      const severity = ticket.service?.Severity;

      const slaAssignDeadline = severity
        ? new Date(
            new Date(ticket.createdAt).getTime() +
              severity.max_assign_minutes * 60 * 1000
          )
        : null;

      return {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        imageUrl: ticket.imageUrl,
        createdAt: ticket.createdAt,
        priority: ticket.priority, // Your custom rank
        severityName: severity?.name || "UNKNOWN",
        severityPriority: severity?.priority ?? 999, // Global severity rank
        isEscalated: ticket.isEscalated,
        status: ticket.status,
        slaAssignDeadline,
      };
    });

    res.json({ tickets: formattedTickets });
  } catch (err) {
    console.error("QUEUE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch assignment queue" });
  }
};

export const getAllTickets = async (req, res) => {
  try {

    const tickets = await db.Ticket.findAll({
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



export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await db.Ticket.findByPk(id, {
      include: [
        {
          model: db.Service,
          as: "service",
          include: [{ model: db.Severity, as: "Severity" }],
        },
        { model: db.User, as: "client" },
        { model: db.User, as: "mechanic" },
      ],
    });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const mechanicTask = await db.MechanicTask.findOne({
      where : [{ticketId : ticket.id}]
    })
    console.log(mechanicTask?.partsUsed??"no parts used")
    // console.log(ticket)

    // console.log(ticket.mechanic)
    const service = ticket.service;
    const severity = service?.Severity;

    // Compute dynamic SLA values ----------------------
    const now = new Date();

    const slaAcceptDeadline = new Date(
      ticket.createdAt.getTime() + severity.max_accept_minutes * 60000
    );

    const slaAssignDeadline = new Date(
      ticket.acceptedAt
        ? ticket.acceptedAt.getTime() + severity.max_assign_minutes * 60000
        : slaAcceptDeadline.getTime() + severity.max_assign_minutes * 60000
    );

    const expectedCompletionAt = new Date(
      (ticket.assignedAt
        ? ticket.assignedAt.getTime()
        : slaAssignDeadline.getTime()) +
        service.defaultExpectedHours * 3600000
    );

    // Prepare response object -------------------------
    const response = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      imageUrl: ticket.imageUrl,
      status: ticket.status,
      priority: ticket.priority,
      // Dynamic SLA fields
      createdAt: ticket.createdAt,
      slaAcceptDeadline,
      slaAssignDeadline,

      expectedCompletionHours: service.defaultExpectedHours,
      expectedCompletionAt,

      // Cost
      cost: ticket.cost,

      createdAt: ticket.createdAt,
      acceptedAt: ticket.acceptedAt,
      assignedAt: ticket.assignedAt,
      completedAt: ticket.completedAt,

      // Severity
      severityName: severity.name,
      severityPriority: severity.priority,
      isPaid: ticket.isPaid,
      paymentMethod: ticket.paymentMethod,
      isEscalated: ticket.isEscalated,
      cancelledAt: ticket.cancelledAt,
      cancelledBy: ticket.cancelledBy,
      cancellationReason: ticket.cancellationReason,

      // Relations
      client: ticket.client,
      mechanic: ticket.mechanic,
      partsUsed : mechanicTask?.partsUsed??"",
      service: {
        id: service.id,
        serviceTitle: service.serviceTitle,
        type: service.type,
        defaultCost: service.defaultCost,
      },
    };

    res.json({ ticket: response });
  } catch (err) {
    console.error("GET TICKET BY ID ERROR:", err);
    res.status(500).json({ message: "Failed to fetch ticket" });
  }
};


export const acceptTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await db.Ticket.findByPk(id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending tickets can be accepted.",
      });
    }

    const now = new Date();

    await ticket.update({
      status: "ACCEPTED",
      acceptedAt: now,
    });

    const assignedMechanic = await assignMechanicIfPossible(ticket);

    if (assignedMechanic) {
      //notify assigned mechanic
      await notifyAdmins(
        "Ticket Assigned to Mechanic",
        `Ticket "${ticket.title}" has been assigned to mechanic ${assignedMechanic.name}.`
      )
      //notify user that his ticket is accepted
      await notifyUser(
        ticket.clientId,
        "Ticket Accepted & Assigned to Mechanic",
        `Your ticket "${ticket.title}" has been accepted and assigned to a mechanic.`
      );
      return res.json({
        message: `Ticket accepted and assigned to ${assignedMechanic.name}`,
        ticket,
      });
    }
    //notify user that his ticket is accepted
    await notifyUser(
      ticket.clientId,
      "Ticket Accepted",
      `Your ticket "${ticket.title}" has been accepted and is awaiting assignment to a mechanic.`
    );
    //notify admins about unassigned ticket
    await notifyAdmins(
      "Ticket Accepted",
      `Ticket "${ticket.title}" is accepted but not yet assigned to a mechanic.`
    );
    return res.json({
      message: "Ticket accepted. Waiting for mechanic availability.",
      ticket,
    });
  } catch (err) {
    console.error("ACCEPT TICKET ERROR:", err);
    res.status(500).json({ message: "Failed to accept ticket." });
  }
};


export const cancelTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    console.log("Cancelling ticket")

    const ticket = await db.Ticket.findByPk(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    await ticket.update({
      status: "CANCELLED",
      completedAt: new Date(),
      cancelledBy: user.role === "ADMIN" ? "ADMIN" : "CLIENT",
      cancellationReason: req.body?.reason?? null,
      cancelledAt: new Date(),
    });

    //notify user that his ticket is cancelled
    await notifyUser(
      ticket.clientId,
      "Ticket Cancelled",
      `Your ticket "${ticket.title}" has been cancelled.`
    );
    return res.json({ message: "Ticket cancelled.", ticket });
  } catch (err) {
    console.error("CANCEL TICKET ERROR:", err);
    res.status(500).json({ message: "Failed to cancel ticket." });
  }
};



export const getMechanicWithTasks = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch mechanic
    const mechanic = await db.User.findOne({
      where: {
        id,
        role: "MECHANIC",
      },
      attributes: [
        "id",
        "name",
        "email",
        "mobile",
        "status",
        "assignedCount",
        "lastAssignedAt",
        "createdAt",
      ],
    });

    if (!mechanic) {
      return res.status(404).json({ message: "Mechanic not found" });
    }

    // Fetch all tasks ever assigned to this mechanic
    const tasks = await db.MechanicTask.findAll({
      where: { mechanicId: id },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.Ticket,
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
            {
              model: db.User,
              as: "client",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
    });

    // Format response for frontend
    const formattedTasks = tasks.map((task) => {
      const ticket = task.Ticket;
      const severity = ticket?.service?.Severity;

      return {
        taskId: task.id,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        notes: task.notes,

        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          cost: ticket.cost,
          createdAt: ticket.createdAt,
          completedAt: ticket.completedAt,

          severityName: severity?.name || "UNKNOWN",
          severityPriority: severity?.priority || null,

          serviceTitle: ticket.service?.serviceTitle,
          clientName: ticket.client?.name,
        },
      };
    });

    res.json({
      mechanic,
      tasks: formattedTasks,
    });
  } catch (err) {
    console.error("GET MECHANIC WITH TASKS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch mechanic details" });
  }
};


export const addNewService = async (req, res) => {
  try {
    const {
      serviceTitle,
      type,
      severityId,
      defaultExpectedHours,
      defaultCost,
      description,
    } = req.body;

    // basic validation
    if (!serviceTitle || !severityId) {
      return res.status(400).json({
        message: "serviceTitle and severityId are required",
      });
    }

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
      defaultExpectedHours,
      defaultCost,
      description,
    });

    return res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("Add Service Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getIndustryStats = async (req, res) => {
  try {
    // Run analytical queries in parallel for production performance
    const [kpiData, technicianEfficiency, statusDistribution, inventoryStatus] =
      await Promise.all([
        // 1. Core KPIs - Note: Using exact case "isEscalated" from model
        db.Ticket.findOne({
          attributes: [
            [Sequelize.fn("COUNT", Sequelize.col("id")), "totalTickets"],
            [
              Sequelize.fn(
                "SUM",
                Sequelize.literal(
                  `CASE WHEN "status" = 'COMPLETED' THEN "cost" ELSE 0 END`
                )
              ),
              "totalRevenue",
            ],
            [
              Sequelize.fn(
                "AVG",
                Sequelize.literal(
                  `CASE WHEN "status" = 'COMPLETED' THEN "cost" ELSE NULL END`
                )
              ),
              "avgTicketValue",
            ],
            [
              Sequelize.fn(
                "COUNT",
                Sequelize.literal(`CASE WHEN "isEscalated" = true THEN 1 END`)
              ),
              "escalationCount",
            ],
          ],
          raw: true,
        }),

        // 2. Best Performing Mechanics [cite: 107, 108]
        db.MechanicTask.findAll({
          attributes: [
            "mechanicId",
            [
              Sequelize.fn("COUNT", Sequelize.col("MechanicTask.id")),
              "resolvedTickets",
            ],
            [
              Sequelize.fn(
                "AVG",
                Sequelize.literal(
                  `EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 3600`
                )
              ),
              "avgResolutionTime",
            ],
          ],
          where: { completedAt: { [Op.ne]: null } }, // Only completed tasks [cite: 116]
          include: [
            {
              model: db.User,
              as: "mechanic",
              attributes: ["name", "assignedCount"], // prevent overloading technicians [cite: 365, 382]
            },
          ],
          group: ["mechanicId", "mechanic.id"],
          order: [[Sequelize.literal('"resolvedTickets"'), "DESC"]],
          limit: 5,
        }),

        // 3. Workload Distribution by Status [cite: 334, 342]
        db.Ticket.findAll({
          attributes: [
            "status",
            [Sequelize.fn("COUNT", Sequelize.col("Ticket.id")), "count"],
          ],
          group: ["status"],
          raw: true,
        }),

        // 4. Critical Inventory (Stock levels vs Min Stock)
        db.Inventory.findAll({
          attributes: ["name", "quantity", "minStock", "unitPrice"],
          where: {
            quantity: { [Op.lte]: Sequelize.col("minStock") }, // Correct Sequelize syntax for column comparison [cite: 75, 89]
          },
          limit: 10,
        }),
      ]);

    res.json({
      metrics: {
        revenue: parseFloat(kpiData.totalRevenue || 0),
        ticketThroughput: parseInt(kpiData.totalTickets || 0),
        avgOrderValue: parseFloat(kpiData.avgTicketValue || 0),
        riskLevel: parseInt(kpiData.escalationCount || 0), // Fixed field name
      },
      leaderboard: technicianEfficiency,
      inventory: inventoryStatus,
      statusStats: statusDistribution,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error during data aggregation" });
  }
};



export const markAsEscalated = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await db.Ticket.findByPk(id);
    if (!ticket) {
      return res.status(403).json({ message: "Ticket not found" });
    }

    // Simply flip the boolean flag
    await ticket.update({ isEscalated: true });

    res.json({
      success: true,
      message: "Ticket marked as escalated",
      isEscalated: true,
    });
  } catch (error) {
    console.error("ESCALATION_ERROR:", error);
    res.status(500).json({ message: "Failed to escalate ticket" });
  }
};
export const updateTicketCustomPriority = async (req, res) => {
  console.log("update priority")
  try {
    const { id } = req.params;
    const { customPriority } = req.body;

    const ticket = await db.Ticket.findByPk(id);
    if (!ticket) {
      return res.status(403).json({ message: "Ticket not found" });
    }

    // Update the custom priority number
    // High numbers will push it down, low numbers bring it to the top (depending on your sort)
    await ticket.update({
      priority: parseInt(customPriority, 10),
    });

    res.json({
      success: true,
      message: `Priority set to ${customPriority}`,
      priority: ticket.priority,
    });
  } catch (error) {
    console.error("PRIORITY_UPDATE_ERROR:", error);
    res.status(500).json({ message: "Failed to update custom priority" });
  }
};