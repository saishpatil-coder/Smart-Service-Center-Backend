import db from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { notifyUser } from "../utils/sendNotification.js";
import logger from "../utils/logger.js";
export const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;
    const existingUser = await db.User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      name,
      email: email.toLowerCase(),
      mobile,
      password: hashed,
      role: role || "CLIENT",
    });

    return res.json({ message: "Account created", user });
  } catch (err) {
    logger.info(err);
    return res.status(500).json({ message: "Registration failed" });
  }
};
export const loginUser = async (req, res) => {
  try {
    logger.info("Login Function : Attempting login");
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn("Login Function : Missing email or password");
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await db.User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      logger.warn("Login Function : Invalid credentials");
      return res.status(400).json({ message: "User not Found"});
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.warn("Login Function : Password do not match");
      return res.status(400).json({ message: "Password do not Match" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Sanitize user object to remove sensitive data
    const { password: _, ...safeUser } = user.toJSON();

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Requires HTTPS
      sameSite: "none", // Necessary for cross-site (CORS) environments
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    logger.info("Login user : Logged in successfully.")
    res.json({ message: "Logged in", user: safeUser });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: "Login failed" });
  }
};
export const logoutUser = (req, res) => {
  logger.info("logging out");
  // Attributes must match the login configuration to clear properly
  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    expires: new Date(0), // Instantly expires the cookie
  });

  res.json({ message: "Logged out" });
};
export const getMe = async (req, res) => {
  logger.info("GetMe : Getting User");
  try {
    const token = req.cookies.token;

    // 1. No token present
    if (!token) {
      logger.debug("GetMe : No token present");
      return res.status(401).json({ user: null });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.User.findByPk(decoded.id);

    // 2. Token valid but user deleted from DB
    if (!user) {
      res.cookie("token", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        expires: new Date(0), // Instantly expires the cookie
      });
      return res.status(403).json({ user: null });
    }

    return res.json({ user });
  } catch (err) {
    // 3. Token expired or malformed
    res.cookie("token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      expires: new Date(0), // Instantly expires the cookie
    });
    return res.status(401).json({ user: null });
  }
};

// controllers/user.controller.js
export async function saveFcmToken(req, res) {
  const { token, deviceInfo } = req.body;

  // 1. Validation check
  if (!token) {
    logger.warn("SaveFcmToken : token not found")
    return res.status(400).json({ message: "FCM token is required" });
  }

  try {
    // 2. Multi-device support: Use findOrCreate to ensure uniqueness
    // Note: Ensure the model name matches your 'UserFcmToken' definition [cite: 74]
    const [fcmInstance, created] = await db.UserFcmTokens.findOrCreate({
      where: { token: token },
      defaults: {
        userId: req.user.id,
        deviceInfo: deviceInfo || "Unknown Device", // Store device info for audit logs
      },
    });

    // 3. If token already exists but belongs to a different user, update it
    if (!created && fcmInstance.userId !== req.user.id) {
      fcmInstance.userId = req.user.id;
      await fcmInstance.save();
    }

    // 4. Trigger real-time confirmation notification [cite: 43, 75]
    // This utilizes the Firebase Admin SDK to send a "Logged in" alert [cite: 69, 76]
    await notifyUser(
      req.user.id,
      "Security Alert",
      "New login detected on your account.",
    );

    res.json({
      success: true,
      message: created ? "Token registered" : "Token synchronized",
    });
  } catch (err) {
    logger.error("SAVE FCM TOKEN ERROR:", err);
    res.status(500).json({ message: "Error saving FCM token" });
  }
}
export async function removeFcmToken(req, res) {
  logger.info("removing fcm token");
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "FCM token is required" });
  }
  try {
    let responce = await db.UserFcmTokens.destroy({
      where: {
        userId: req.user.id,
        token: token,
      },
    });
    logger.info("logout responce : ", responce);
  } catch (err) {
    logger.error("REMOVE FCM TOKEN ERROR:", err);
    res.status(500).json({ message: "Error removing FCM token" });
  }

  res.json({ success: true });
}
