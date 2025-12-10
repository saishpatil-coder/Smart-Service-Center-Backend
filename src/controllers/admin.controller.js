import db from "../models/index.js"
export  const getAllMechanics = async (req, res) => {
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

export const getAllPendingTickets = async(req,res)=>{
  console.log("getting pending tickets")
  try {
    const tickets = await db.Ticket.findAll({
      where: { status: "PENDING" },
      order: [
        ["severityPriority", "ASC"], // high priority first
        ["createdAt", "ASC"], // oldest first
      ],
      include: [
        { model: db.Service, as: "service" },
        { model: db.User, as: "client" },
      ],
    });

    res.json({ tickets });
  } catch (err) {
    console.error("GET PENDING ERROR:", err);
    res.status(500).json({ message: "Failed to fetch pending tickets" });
  }
}

export const getAssignmentQueue = async (req, res) => {
  try {
    const tickets = await db.Ticket.findAll({
      where: {
        status: "ACCEPTED",
      },
      order: [
        ["severityPriority", "ASC"],
        ["slaAssignDeadline", "ASC"],
      ],
      include: [
        { model: db.Service, as: "service" },
        { model: db.User, as: "client" },
      ],
    });

    res.json({ tickets });
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
        { model: db.Service, as: "service" },
        { model: db.User, as: "client" },
      ],
    });

    res.json({ tickets });
  } catch (err) {
    console.error("GET ALL TICKETS:", err);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
};
