import db from "../models/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { notifyUser } from "../utils/sendNotification.js";
import logger from "../utils/logger.js";
import crypto from "crypto";
import { generateAccessToken, generateHashOfToken, generateRefreshToken } from "../utils/token.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const registerUser = asyncHandler( async (req, res) => {
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
    const { password: _, ...safeUser } = user.toJSON();

    return res.json({ message: "Account created", user: safeUser });

});

export const loginUser = asyncHandler(async (req, res) => {
  logger.info("Login Function : Attempting login");

  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn("Login Function : Missing email or password");
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await db.User.findOne({
    where: { email: email.toLowerCase() },
  });

  // 🔥 Do NOT reveal whether email exists
  if (!user) {
    logger.warn("Login Function : Invalid credentials");
    return res.status(403).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    logger.warn("Login Function : Invalid credentials");
    return res.status(403).json({ message: "Invalid credentials" });
  }

  // ✅ ACCESS TOKEN (Short-lived)
  const accessToken = generateAccessToken(user);
  // ✅ REFRESH TOKEN (Long-lived)
  const refreshToken = generateRefreshToken();
  const hashedToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  // Store hashed refresh token in DB
  await db.RefreshToken.create({
    token: hashedToken,
    userId: user.id,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Remove password
  const { password: _, ...safeUser } = user.toJSON();

  // Access Token
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none", // change to "strict" if same domain
    maxAge: 60 * 60 * 1000,
  });

  // Refresh Token
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logger.info("Login user : Logged in successfully.");

  return res.json({
    message: "Logged in",
    user: safeUser,
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const hashedToken = generateHashOfToken(refreshToken);

    await db.RefreshToken.destroy({
      where: { token: hashedToken },
    });
  }

  res.clearCookie("token");
  res.clearCookie("refreshToken");

  logger.info("User logged out");

  res.json({ message: "Logged out" });
});

export const getMe = async (req, res) => {
  logger.info("GetMe : Getting User");
  try {
    const token = req.cookies.token;

    // 1. No token present
    if (!token) {
      logger.info("GetMe : No token present");
      return res.status(403).json({ user: null });
    }
    logger.info("GetMe : Verifying token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info("GetMe : Token verified");
    return res.json({ user: decoded });
  } catch (err) {
    logger.info("GetMe : Error verifying token");
    // 3. Token expired or malformed
    return res.status(401).json({ user: null });
  }
};

//add proper logs below
export const refreshAccessToken = asyncHandler(async (req, res) => {
  logger.info("REFRESH TOKEN : Attempting to refresh access token");
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    logger.error("RefreshToken : No refresh token provided");
    return res.status(403).json({ message: "Unauthorized" });
  }

  //✅ Hash incoming token before DB lookup
  const hashedToken = generateHashOfToken(refreshToken);
  const storedToken = await db.RefreshToken.findOne({
    where: { token: hashedToken },
  });

  if (!storedToken) {
    logger.error("RefreshToken : Invalid refresh token");
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  //✅ Expiry Check
  if (storedToken.expiryDate < new Date()) {
    await storedToken.destroy();
    res.clearCookie("refreshToken");
    logger.info("RefreshToken : Refresh token expired");
    return res.status(403).json({ message: "Token expired" });
  }

  const user = await db.User.findByPk(storedToken.userId);

  if (!user) {
    logger.warn("RefreshToken : User not found ");
    return res.status(403).json({ message: "Invalid session" });
  }
  /**
   * 🔥 ROTATE REFRESH TOKEN (Very Important)
   * Prevents replay attacks
   */
  const newRefreshToken = crypto.randomBytes(64).toString("hex");
  const newHashedToken = generateHashOfToken(newRefreshToken);

  // delete old token
  await storedToken.destroy();

  // store new hashed token
  await db.RefreshToken.create({
    token: newHashedToken,
    userId: user.id,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  /**
   * ✅ Generate new ACCESS token
   */
  const newAccessToken = generateAccessToken(user);

  /**
   * ✅ Send cookies
   */

  // access token (keep name as "token")
  res.cookie("token", newAccessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none", // use "none" only if cross-domain
    maxAge: 60 * 60 * 1000,
  });

  // rotated refresh token
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  logger.info("REFRESH TOKEN : Token refreshed successfully");

  return res.json({ message: "Token refreshed" });
});

export const saveFcmToken = asyncHandler(async (req, res) => {
  const { token, deviceInfo } = req.body;

  // 1. Validation check
  if (!token) {
    logger.warn("SaveFcmToken : token not found");
    return res.status(400).json({ message: "FCM token is required" });
  }

  // 2. Multi-device support: Use findOrCreate to ensure uniqueness
  const [fcmInstance, created] = await db.UserFcmTokens.findOrCreate({
    where: { token: token },
    defaults: {
      userId: req.user.id,
      deviceInfo: deviceInfo, // Store device info for audit logs
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
});


export const removeFcmToken = asyncHandler(async (req, res) => {
  logger.info("removing fcm token");
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "FCM token is required" });
  }
  let responce = await db.UserFcmTokens.destroy({
    where: {
      token: token,
    },
  });
  logger.info("logout responce : ", responce);
  res.json({ success: true });
});