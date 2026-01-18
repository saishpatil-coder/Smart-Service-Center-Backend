import dotenv from "dotenv";
import { registerUser,loginUser,logoutUser,getMe } from "../controllers/auth.controller.js";
import { Router } from "express";

const router = Router();
dotenv.config();

router.post("/register",registerUser);
router.post("/login", loginUser);
router.post("/logout",logoutUser );
router.get("/me", getMe);

export default router;
