import "dotenv/config";
import app from "./app.js";
import db from "./models/index.js";
import "./models/user.model.js";
import { startTicketExpiryCron } from "./cron/cancelExpiredTickets.js";

const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("✔ Database connected");

    await db.sequelize.sync();
    console.log("✔ Database synced");

    startTicketExpiryCron();

    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1); 
  }
};

startServer();
