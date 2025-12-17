import db from "../models/index.js";

const { Inventory } = db;

export const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      items: inventory,
    });
  } catch (error) {
    console.error("Get Inventory Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};
