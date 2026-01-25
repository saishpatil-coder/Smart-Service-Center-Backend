import { Op, Sequelize, where } from "sequelize";
import db from "../models/index.js";
import { assignMechanicIfPossible } from "./mech.controller.js";
import { notifyAdmins, notifyUser } from "../utils/sendNotification.js";
export const getAllMechanics = async (req, res) => {
  console.log("getting mechs");
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

export const deleteMechanic = async (req, res) => {
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
};

export const getAllPendingTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of tickets per page
    const offset = (page - 1) * limit;
    console.log("page : ", parseInt(req.query.page));

    const { count, rows: tickets } = await db.Ticket.findAndCountAll({
      where: { status: "PENDING" },
      limit,
      offset,
      order: [
        ["priority", "ASC"],
        ["createdAt", "ASC"],
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

    const enrichedTickets = tickets.map((t) => {
      const severity = t.service?.Severity;
      const maxAccept = severity?.max_accept_minutes ?? 0;
      const slaAcceptDeadline = new Date(
        new Date(t.createdAt).getTime() + maxAccept * 60000
      );

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        imageUrl: t.imageUrl,
        severityName: severity?.name,
        slaAcceptDeadline,
      };
    });

    return res.json({
      tickets: enrichedTickets,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
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
    // 1. Extract pagination and filters from query
    const page = parseInt(req.query.page) || 1;
    const rawLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const limit = rawLimit > 50 ? 50 : rawLimit; // Max limit of 50
    const offset = (page - 1) * limit;
    const status = req.query.status;

    // 2. Build where clause
    const whereClause = {};
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } }
            ];
    }
    // 3. FindAndCountAll is better for pagination
    const { count, rows: tickets } = await db.Ticket.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      distinct: true,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.Service,
          as: "service",
          include: [{ model: db.Severity, as: "Severity" }],
        },
      ],
    });

    const formatted = tickets.map((t) => {
      const severity = t.service?.Severity;
      const createdAt = new Date(t.createdAt);

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        createdAt: t.createdAt,
        severityName: severity?.name || "UNKNOWN",
        slaAcceptDeadline: severity
          ? new Date(createdAt.getTime() + severity.max_accept_minutes * 60000)
          : null,
        slaAssignDeadline: severity
          ? new Date(createdAt.getTime() + severity.max_assign_minutes * 60000)
          : null,
        description: t.description,
        imageUrl: t.imageUrl,
        cost: t.cost,
        priority: t.priority,
        expectedCompletionHours: t.service?.defaultExpectedHours || null,
      };
    });

    res.json({
      tickets: formatted,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      currentPage: page,
    });
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
      where: [{ ticketId: ticket.id }],
    });
    console.log(mechanicTask?.partsUsed ?? "no parts used");
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
      partsUsed: mechanicTask?.partsUsed ?? "",
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
      );
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
    console.log("Cancelling ticket");

    const ticket = await db.Ticket.findByPk(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    await ticket.update({
      status: "CANCELLED",
      completedAt: new Date(),
      cancelledBy: user.role === "ADMIN" ? "ADMIN" : "CLIENT",
      cancellationReason: req.body?.reason ?? null,
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
    const { timeframe = "all" } = req.query;

    // 1. Build Time Filter
    let timeWhere = {};
    if (timeframe !== "all") {
      const date = new Date();
      if (timeframe === "24h") date.setHours(date.getHours() - 24);
      if (timeframe === "7d") date.setDate(date.getDate() - 7);
      if (timeframe === "30d") date.setDate(date.getDate() - 30);
      timeWhere = { createdAt: { [Op.gte]: date } };
    }

    const [kpiData, statusDistribution, leaderboard, inventoryStatus] =
      await Promise.all([
        // KPI: REVENUE & RISK
        db.Ticket.findOne({
          where: { ...timeWhere, isPaid: true },
          attributes: [
            [Sequelize.fn("COUNT", Sequelize.col("Ticket.id")), "totalTickets"],
            [
              // Ticket Cost + Sum of parts in MechanicTask JSONB
              Sequelize.literal(`SUM(
              COALESCE("Ticket"."cost", 0) + 
              COALESCE((
                SELECT SUM((part->>'price')::numeric * (part->>'quantity')::numeric)
                FROM "MechanicTasks", jsonb_array_elements("partsUsed") AS part
                WHERE "MechanicTasks"."ticketId" = "Ticket"."id"
              ), 0)
            )`),
              "totalRevenue",
            ],
            [
              // Risk Level Logic: isEscalated OR (Status=ACCEPTED and Time > max_assign_minutes)
              Sequelize.literal(`COUNT(CASE 
              WHEN "Ticket"."isEscalated" = true 
              OR (
                "Ticket"."status" = 'ACCEPTED' AND 
                NOW() > ("Ticket"."createdAt" + (interval '1 minute' * "service->Severity"."max_assign_minutes"))
              ) THEN 1 END)`),
              "riskLevel",
            ],
          ],
          include: [
            {
              model: db.Service,
              as: "service",
              attributes: [],
              include: [{ model: db.Severity, as: "Severity", attributes: [] }],
            },
          ],
          raw: true,
        }),

        // KPI: STATUS DISTRIBUTION
        db.Ticket.findAll({
          where: timeWhere,
          attributes: [
            "status",
            [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
          ],
          group: ["status"],
          raw: true,
        }),
        // KPI: MECHANIC EFFICIENCY
        db.MechanicTask.findAll({
          attributes: [
            // Explicitly reference the table to avoid ambiguity
            [Sequelize.col("MechanicTask.mechanicId"), "mechanicId"],
            [
              Sequelize.fn("COUNT", Sequelize.col("MechanicTask.id")),
              "resolvedTickets",
            ],
            [
              Sequelize.literal(`AVG(
        (NULLIF("Ticket->service"."defaultExpectedHours", 0) / 
        NULLIF(EXTRACT(EPOCH FROM ("MechanicTask"."completedAt" - "MechanicTask"."startedAt")) / 3600, 0)) * 100
      )`),
              "efficiencyScore",
            ],
          ],
          where: { completedAt: { [Op.ne]: null } },
          include: [
            { model: db.User, as: "mechanic", attributes: ["name"] },
            {
              model: db.Ticket,
              attributes: [],
              include: [{ model: db.Service, as: "service", attributes: [] }],
            },
          ],
          // Update group by to use the explicit table name
          group: [
            "MechanicTask.mechanicId",
            "mechanic.id",
            "Ticket->service.id",
          ],
          order: [[Sequelize.literal('"efficiencyScore"'), "DESC"]],
          limit: 5,
        }),
        // KPI: CRITICAL INVENTORY
        db.Inventory.findAll({
          where: { quantity: { [Op.lte]: Sequelize.col("minStock") } },
          attributes: ["name", "quantity", "minStock", "unitPrice"],
          limit: 5,
        }),
      ]);

    res.json({
      metrics: {
        revenue: parseFloat(kpiData?.totalRevenue || 0),
        ticketThroughput: parseInt(kpiData?.totalTickets || 0),
        riskLevel: parseInt(kpiData?.riskLevel || 0),
        avgEfficiency: leaderboard.length
          ? (
              leaderboard.reduce(
                (acc, curr) =>
                  acc + parseFloat(curr.dataValues.efficiencyScore || 0),
                0
              ) / leaderboard.length
            ).toFixed(1)
          : 0,
      },
      leaderboard: leaderboard.map((l) => ({
        name: l.mechanic.name,
        resolved: parseInt(l.dataValues.resolvedTickets),
        efficiency: Math.min(
          parseFloat(l.dataValues.efficiencyScore || 0),
          100
        ).toFixed(1),
      })),
      inventory: inventoryStatus,
      statusStats: statusDistribution,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("Industrial Stats Error:", error);
    res.status(500).json({ error: "Aggregation failed" });
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
  console.log("update priority");
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

// Helper for Timeframe
const getTimeWhere = (timeframe) => {
  if (timeframe === "all") return {};
  const date = new Date();
  if (timeframe === "24h") date.setHours(date.getHours() - 24);
  if (timeframe === "7d") date.setDate(date.getDate() - 7);
  if (timeframe === "30d") date.setDate(date.getDate() - 30);
  return { createdAt: { [Op.gte]: date } };
};

// 1. REVENUE (Heavy JSONB Query)
export const getRevenueStat = async (req, res) => {
  const timeWhere = getTimeWhere(req.query.timeframe);
  console.log("Getting revenue : ");

  const labourData = await db.Ticket.findOne({
    where: { ...timeWhere, isPaid: true },
    attributes: [
      [Sequelize.fn("SUM", Sequelize.col("cost")), "totalLabourCost"],
    ],
    raw: true,
  });

  console.log("Total Labour Revenue:", labourData.totalLabourCost);
  const partsData = await db.MechanicTask.findOne({
    attributes: [
      [
        Sequelize.literal(`
        SUM(
          COALESCE(
            (
              SELECT SUM((part->>'price')::numeric * (part->>'quantity')::numeric)
              FROM jsonb_array_elements("MechanicTask"."partsUsed") AS part
            ), 0
          )
        )
      `),
        "totalPartsCost",
      ],
    ],
    // Optional: Join with Tickets to filter by isPaid or date
    include: [
      {
        model: db.Ticket,
        where: { ...timeWhere, isPaid: true },
        attributes: [], // We don't need ticket columns, just the filter
      },
    ],
    raw: true,
  });

  console.log("Total Parts Revenue:", partsData.totalPartsCost);
  res.json({
    value: parseFloat(
      partsData.totalPartsCost + labourData.totalLabourCost || 0
    ),
  });
};

// 2. THROUGHPUT (Fast Count)
export const getThroughputStat = async (req, res) => {
  const timeWhere = getTimeWhere(req.query.timeframe);
  const count = await db.Ticket.count({ where: timeWhere });
  res.json({ value: count });
};

// 3. AVG EFFICIENCY (Calculation Heavy)
export const getEfficiencyStat = async (req, res) => {
  try {
    const stats = await db.MechanicTask.findOne({
      where: {
        completedAt: { [Op.ne]: null },
        startedAt: { [Op.ne]: null },
      },
      attributes: [
        // 1. Total Tasks Completed till now
        [
          Sequelize.fn("COUNT", Sequelize.col("MechanicTask.id")),
          "totalCompleted",
        ],

        // 2. Tasks completed WITHIN or UNDER expected time
        [
          Sequelize.literal(`
            COUNT(CASE 
              WHEN (EXTRACT(EPOCH FROM ("MechanicTask"."completedAt" - "MechanicTask"."startedAt")) / 3600) 
                   <= COALESCE("Ticket->service"."defaultExpectedHours", 0) 
              THEN 1 
            END)
          `),
          "onTimeTasks",
        ],

        // 3. Efficiency Calculation (Ratio of On-Time to Total)
        [
          Sequelize.literal(`
            ROUND(
              (COUNT(CASE 
                WHEN (EXTRACT(EPOCH FROM ("MechanicTask"."completedAt" - "MechanicTask"."startedAt")) / 3600) 
                     <= COALESCE("Ticket->service"."defaultExpectedHours", 0) 
                THEN 1 
              END)::numeric / 
              NULLIF(COUNT("MechanicTask"."id"), 0)) * 100, 
            1)
          `),
          "efficiencyPercentage",
        ],
      ],
      include: [
        {
          model: db.Ticket,
          attributes: [],
          required: true,
          include: [
            {
              model: db.Service,
              as: "service",
              attributes: [],
              required: true,
            },
          ],
        },
      ],
      raw: true,
    });

    return res.json({
      totalCompleted: parseInt(stats?.totalCompleted || 0),
      onTimeTasks: parseInt(stats?.onTimeTasks || 0),
      value: parseFloat(stats?.efficiencyPercentage || 0).toFixed(1),
    });
  } catch (error) {
    console.error("Efficiency Stats Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 4. RISK LEVEL (SLA Check)
export const getRiskStat = async (req, res) => {
  const count = await db.Ticket.count({
    where: { isEscalated: true }, // Simplified for speed, add SLA logic if needed
  });
  res.json({ value: count });
};

// 5. INVENTORY COUNT (Stock Check)
export const getInventoryStat = async (req, res) => {
  const count = await db.Inventory.count({
    where: { quantity: { [Op.lte]: Sequelize.col("minStock") } },
  });
  res.json({ value: count });
};

// 6. MECHANIC LEADERBOARD (Top 5 by Efficiency)
export const getLeaderboardStat = async (req, res) => {
  try {
    const stats = await db.MechanicTask.findAll({
      where: {
        completedAt: { [Op.ne]: null },
        startedAt: { [Op.ne]: null },
      },
      attributes: [
        "mechanicId",
        // 1. Total Tasks Completed
        [
          Sequelize.fn("COUNT", Sequelize.col("MechanicTask.id")),
          "totalCompleted",
        ],

        // 2. Tasks Completed Within or Under Expected Time
        [
          Sequelize.literal(`
            COUNT(CASE 
              WHEN (EXTRACT(EPOCH FROM ("MechanicTask"."completedAt" - "MechanicTask"."startedAt")) / 3600) 
                   <= "Ticket->service"."defaultExpectedHours" 
              THEN 1 
            END)
          `),
          "onTimeTasks",
        ],

        // 3. Overall Efficiency Percentage
        [
          Sequelize.literal(`
            ROUND(
              (COUNT(CASE 
                WHEN (EXTRACT(EPOCH FROM ("MechanicTask"."completedAt" - "MechanicTask"."startedAt")) / 3600) 
                     <= "Ticket->service"."defaultExpectedHours" 
                THEN 1 
              END)::numeric / 
              NULLIF(COUNT("MechanicTask"."id"), 0)) * 100, 
            1)
          `),
          "efficiency",
        ],
      ],
      include: [
        {
          model: db.Ticket,
          attributes: [],
          required: true,
          include: [
            {
              model: db.Service,
              as: "service",
              attributes: [],
              required: true,
            },
          ],
        },
        // Include Mechanic User Details for the frontend
        {
          model: db.User,
          as: "mechanic",
          attributes: ["name"],
        },
      ],
      group: ['"MechanicTask"."mechanicId"', '"mechanic.id"'],
      raw: true,
    });

    return res.json(stats);
  } catch (error) {
    console.error("Mechanic Stats Error:", error);
    return res.status(500).json({ message: "Error fetching performance data" });
  }
};

// 7. STATUS DISTRIBUTION (Pie Chart Data)
export const getStatusDistributionStat = async (req, res) => {
  try {
    const timeWhere = getTimeWhere(req.query.timeframe);

    const data = await db.Ticket.findAll({
      where: timeWhere,
      attributes: [
        "status",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Format for Recharts consumption
    const distribution = data.map((s) => ({
      name: s.status?.replace("_", " ") || "N/A",
      value: parseInt(s.count || 0),
    }));

    res.json({ value: distribution });
  } catch (error) {
    console.error("Distribution Error:", error);
    res.status(500).json({ error: "Failed to fetch distribution" });
  }
};
