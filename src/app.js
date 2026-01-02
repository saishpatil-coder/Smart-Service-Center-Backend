import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import clientRoutes from "./routes/client.routes.js";
import mechRoutes from "./routes/mech.routes.js"
const app = express();
dotenv.config();
// Middlewares
app.use(express.json());
app.use(cookieParser());
import cors from "cors";

app.use(
  cors({
    origin: true, // 👈 reflects request origin
    credentials: true, // 👈 allows cookies
  })
);
app.options("*", cors());


//Auth Routes
app.use("/api/auth", authRoutes);
//Admin Routes
app.use("/api/admin", adminRoutes);
//ticket Routes
app.use("/api/client",clientRoutes)
// Health Check
app.use("/api/mechanic",mechRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

export default  app;
