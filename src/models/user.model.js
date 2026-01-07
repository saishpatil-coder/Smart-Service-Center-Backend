import { DataTypes } from "sequelize";
export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,defaultValue: DataTypes.UUIDV4,primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,allowNull: false,
      },
      password: {
        type: DataTypes.STRING,allowNull: false,
      },
      email: {
        type: DataTypes.STRING,allowNull: false,unique: true,
      },
      mobile: {
        type: DataTypes.STRING,allowNull: false,
      },
      assignedCount: {
        type: DataTypes.INTEGER,defaultValue: 0,
      },
      lastAssignedAt: {
        type: DataTypes.DATE,allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("CLIENT", "MECHANIC", "ADMIN"),allowNull: false,defaultValue: "CLIENT",
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "DISABLED"),defaultValue: "ACTIVE",
      },
    },
    {
      timestamps: true, // automatically adds createdAt & updatedAt
      tableName: "Users",
    }
  );

  return User;
};
