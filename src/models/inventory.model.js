import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Inventory = sequelize.define(
    "Inventory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      sku: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      unit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "piece",
      },

      minStock: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "Inventory",
      timestamps: true,
    }
  );

  return Inventory;
};
