import db from "../models/index.js"

export  const addService = async (req, res) => {
  try {
    const {
      serviceName,
      type,
      defaultExpectedHours,
      defaultCost,
      description,
    } = req.body;

    if (!serviceName || !type) {
      return res
        .status(400)
        .json({ message: "serviceName and type are required" });
    }

    const exists = await db.Service.findOne({ where: { serviceName } });
    if (exists)
      return res.status(400).json({ message: "Service already exists" });

    const service = await db.Service.create({
      serviceName,
      type,
      defaultExpectedHours: defaultExpectedHours || null,
      defaultCost: defaultCost || null,
      description: description || null,
    });

    return res.json({ message: "Service created", service });
  } catch (err) {
    console.error("ADD SERVICE ERROR:", err);
    return res.status(500).json({ message: "Failed to create service" });
  }
};

export  const getAllServices = async (req, res) => {
  try {
    const services = await db.Service.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json({ services });
  } catch (err) {
    console.error("GET SERVICES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch services" });
  } finally {
    console.log("get sevices success");
  }
};