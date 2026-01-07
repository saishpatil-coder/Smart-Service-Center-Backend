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

export const addInventoryItem = async (req, res) => {
  try {
    const { name, sku, category, quantity, unitPrice, unit, minStock } =
      req.body;
    // Basic validation
    if (!name || !sku || !category || quantity == null || !unitPrice || !unit) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    const newItem = await db.Inventory.create({
      name,
      sku,
      category,
      quantity,
      unitPrice,
      unit,
      minStock,
      isActive: true,
    });
    return res
      .status(201)
      .json({ message: "Inventory item added successfully.", item: newItem });
  } catch (err) {
    console.error("ADD INVENTORY ITEM ERROR:", err);
    return res.status(500).json({ message: "Failed to add inventory item." });
  }
};
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await db.Inventory.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    await item.destroy();
    return res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("DELETE INVENTORY ITEM ERROR:", err);
    return res
      .status(500)
      .json({ message: "Failed to delete inventory item." });
  }
};