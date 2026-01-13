import "dotenv/config";
import app from "./app.js";
import sequelize from "./config/sequelize.js";
import db from "./models/index.js";
import "./models/user.model.js";
import { startTicketExpiryCron } from "./cron/cancelExpiredTickets.js";

const PORT = process.env.PORT || 5000;
sequelize
.sync() // ⬅️ THIS CREATES THE TABLE
.then(() => {
  console.log("Database synced");
  startTicketExpiryCron();
  })
  .catch((err) => console.log("DB Sync Error:", err));

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