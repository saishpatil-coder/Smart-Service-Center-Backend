const router = require("express").Router();
const prisma = require("../config/db");
const admin = require("../config/firebase");
const db = require("../models");

router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;

    const decoded = await admin.auth().verifyIdToken(idToken);

    // Set secure HttpOnly cookie
    res.cookie("token", idToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ message: "Login successful" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  return res.json({ message: "Logged out" });
});

router.post("/register", async (req, res) => {
  try {
    const { idToken, name, mobile } = req.body;

    if (!idToken || !name || !mobile) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 1️⃣ Verify Firebase ID Token
    const decoded = await admin.auth().verifyIdToken(idToken);

    const uid = decoded.uid;
    const email = decoded.email;

    // 2️⃣ Insert into PostgreSQL
    const user = await db.User.create({
      id: uid,
      name,
      email,
      mobile,
    });

    // 3️⃣ Store token in cookie (session-like)
    res.cookie("token", idToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      message: "Account created",
      user,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
});


module.exports = router;
