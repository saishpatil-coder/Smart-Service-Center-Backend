import db from "../models/index.js"
export const addService = async (req, res) => {
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



export const getAllServices = async (req, res) => {
  try {
    const services = await db.Service.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.Severity,
          attributes: [
            "id",
            "name",
            "priority",
            "max_accept_minutes",
            "max_assign_minutes",
            "description",
            "color",
          ],
        },
      ],
    });

    res.json({ services });
  } catch (err) {
    console.error("GET SERVICES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch services" });
  } finally {
    console.log("get services success");
  }
};

export const getSeverities = async(req,res)=>{
  try{
    const severities=await db.Severity.findAll({  
      order:[["priority","ASC"]]
    });
    res.json({severities});
  }catch(err){
    console.error("GET SEVERITIES ERROR:", err);
    res.status(500).json({ message: "Failed to fetch severities" });
  }
}