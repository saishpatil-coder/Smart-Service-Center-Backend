const fs = require("fs");
const path = require("path");
const sequelize = require("../config/sequelize");

const db = {};
const modelsPath = __dirname;

fs.readdirSync(modelsPath)
  .filter((file) => file.endsWith(".model.js"))
  .forEach((file) => {
    const model = require(path.join(modelsPath, file))(sequelize);
    db[model.name] = model;
  });

// Setup model relations (if any)
Object.values(db)
  .filter((m) => typeof m.associate === "function")
  .forEach((m) => m.associate(db));

db.sequelize = sequelize;
db.Sequelize = require("sequelize");

module.exports = db;
