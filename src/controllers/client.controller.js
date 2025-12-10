import db from "../models/index.js"

export  const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceId, title, description } = req.body;

    // Cloudinary URL (multer provides it)
    const imageUrl = req.file ? req.file.path : null;

    const service = await db.Service.findByPk(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    const severity = await db.Severity.findByPk(service.severityId);

    const now = new Date();

    const ticket = await db.Ticket.create({
      clientId: userId,
      serviceId,
      title,
      description,
      severityName: severity.name,
      severityPriority: severity.priority,

      slaAcceptDeadline: new Date(
        now.getTime() + severity.max_accept_minutes * 60000
      ),
      slaAssignDeadline: new Date(
        now.getTime() + severity.max_assign_minutes * 60000
      ),

      expectedCompletionHours: service.defaultExpectedHours,
      expectedCompletionAt: new Date(
        now.getTime() + service.defaultExpectedHours * 3600000
      ),
      expectedCost: service.defaultCost,

      imageUrl, // ⭐ directly the Cloudinary image URL

      status: "PENDING",
    });

    return res.json({ message: "Ticket created", ticket });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create ticket" });
  }
};