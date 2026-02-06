import db from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const { Inventory } = db;

export const getInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.findAll({});
  return res.status(200).json({
    success: true,
    items: inventory,
  });
});

export const addInventoryItem = asyncHandler(async (req, res) => {
  const { name, sku, category, quantity, unitPrice, unit, minStock } = req.body;
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
});

export const deleteInventoryItem =asyncHandler( async (req, res) => {
    const { id } = req.params;
    const item = await db.Inventory.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    await item.destroy();
    return res.json({ message: "Item deleted successfully" });
  } 
);

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, sku, category, quantity, unitPrice, unit, minStock } = req.body;
  const item = await db.Inventory.findByPk(id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }
  await item.update({
    name,
    sku,
    category,
    quantity,
    unitPrice,
    unit,
    minStock,
  });
  return res.json({ message: "Item updated successfully", item });
});