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

// Ticket relations
db.Ticket.belongsTo(db.User, { as: "client", foreignKey: "clientId" });
db.Ticket.belongsTo(db.User, { as: "mechanic", foreignKey: "mechanicId" });

// Service relations
db.Service.belongsTo(db.Severity, { foreignKey: "severityId" });
db.Severity.hasMany(db.Service, { foreignKey: "severityId" });

// Assignment queue

// Mechanic tasks
db.MechanicTask.belongsTo(db.Ticket, { foreignKey: "ticketId" });
db.MechanicTask.belongsTo(db.User, { as: "mechanic", foreignKey: "mechanicId" });
// Inventory ↔ MechanicTask association

db.User.hasMany(db.MechanicTask, {
  as: "tasks",
  foreignKey: "mechanicId",
});


// Invoice 
// db.Invoice.belongsTo(db.Ticket, { foreignKey: "ticketId" });
// db.Invoice.belongsTo(db.User, { as: "client", foreignKey: "clientId" });
// db.Invoice.belongsTo(db.User, { as: "mechanic", foreignKey: "mechanicId" });




db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
