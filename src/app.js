import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import clientRoutes from "./routes/client.routes.js";
import mechRoutes from "./routes/mech.routes.js";
import severityRoutes from "./routes/severity.routes.js";
import notifyRoutes from "./routes/notification.routes.js";
import msgRoutes from "./routes/ticketMessage.routes.js"
import feedbackRoutes from "./routes/feedback.routes.js"
import { verifyUser } from "./middleware/auth.middleware.js";
import { removeFcmToken, saveFcmToken } from "./controllers/auth.controller.js";
import { markAsEscalated, updateTicketCustomPriority } from "./controllers/admin.controller.js";
const app = express();
dotenv.config();
// Middlewares
app.use(express.json());
app.use(cookieParser());


app.use(
  cors({
    origin: true,
    credentials: true,
  })
);



//Auth Routes
app.use("/api/auth", authRoutes);
//Admin Routes
app.use("/api/admin", adminRoutes);
//ticket Routes
app.use("/api/client",clientRoutes)
// Health Check
app.use("/api/mechanic",mechRoutes);
app.use("/api/feedback",feedbackRoutes);
app.use("/api/messages",msgRoutes);
// FCM Token Routes
app.use("/api/notifications", notifyRoutes);
app.use("/api/severities", severityRoutes);
app.post("/api/users/save-fcm-token", verifyUser, saveFcmToken);
app.post("/api/users/remove-fcm-token", verifyUser, removeFcmToken);


app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});
export default  app;
 