import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sequelize from "../config/sequelize.js";
import { Sequelize } from "sequelize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = {};
const modelsPath = __dirname;

// Load all `.model.js` files
const modelFiles = fs
  .readdirSync(modelsPath)
  .filter((file) => file.endsWith(".model.js"));

for (const file of modelFiles) {
  const filePath = path.join(modelsPath, file);

  // Dynamic ESM import
  const { default: modelDefiner } = await import(`file://${filePath}`);

  // Initialize model
  const model = modelDefiner(sequelize);

  // Register model in db object
  db[model.name] = model;
}

// Run associations
Object.values(db)
  .filter((model) => typeof model.associate === "function")
  .forEach((model) => model.associate(db));


// Service - Ticket
db.Service.hasMany(db.Ticket, { foreignKey: "serviceId", as: "tickets" });
db.Ticket.belongsTo(db.Service, { foreignKey: "serviceId", as: "service" });

// Ticket - Client (User)
db.User.hasMany(db.Ticket, { foreignKey: "clientId", as: "clientTickets" });
db.Ticket.belongsTo(db.User, { foreignKey: "clientId", as: "client" });

// Ticket - Mechanic (User) (nullable)
db.User.hasMany(db.Ticket, { foreignKey: "mechanicId", as: "assignedTickets" });
db.Ticket.belongsTo(db.User, { foreignKey: "mechanicId", as: "mechanic" });

db.Service.belongsTo(db.Severity, { foreignKey: "severityId" });
db.Severity.hasMany(db.Service, { foreignKey: "severityId" });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
