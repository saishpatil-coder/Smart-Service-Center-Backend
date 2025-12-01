require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");
const db = require("./models");
require("./models/user.model");

sequelize
  .sync({ alter: true }) // ⬅️ THIS CREATES THE TABLE
  .then(() => {
    console.log("Database synced");
  })
  .catch((err) => console.log("DB Sync Error:", err));
const PORT = process.env.PORT || 5000;

db.sequelize
  .authenticate()
  .then(() => {
    console.log("✔ Database connected");
    return db.sequelize.sync(); // creates tables if they don't exist
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((err) => console.error("DB connection error:", err));
