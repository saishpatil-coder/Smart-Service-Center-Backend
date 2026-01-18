import admin from "../config/firebase.js";
import db from "../models/index.js";

export async function sendNotification(token, title, body) {
  if (!token) {
    console.log("No FCM token provided");
    return;
  }

  await admin.messaging().send({
    token,
    notification: {
      title,
      body,
    },
  });
  console.log("Notification sent to token:", title);
}
export async function notifyUser(userId, title, body, type = "INFO", additionalData = {}) {
  try {
    const tokens = await db.UserFcmTokens.findAll({
      where: { userId },
    });

    // Create the in-app notification record
    await db.Notification.create({
      userId,
      title,
      message: body,
      type: "INFO",
    });

    const fcmTokens = tokens.map((t) => t.token).filter(Boolean); // Ensure no nulls

    if (!fcmTokens.length) {
      console.log("No active FCM tokens for User:", userId);
      return;
    }
    console.log("fcm tokens : ", fcmTokens);
    // Use the correctly initialized admin instance
    const response = await admin.messaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body },
      data:{
        type: type ,
        ...additionalData
      }
    });

    // CRITICAL: Handle failed tokens to prevent future FirebaseAppErrors
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`FCM Failure [${fcmTokens[idx]}]:`, resp.error.code);
          // If the token is invalid or not registered, mark for deletion
          if (
            resp.error.code === "messaging/invalid-registration-token" ||
            resp.error.code === "messaging/registration-token-not-registered"
          ) {
            console.log("failed token : ", fcmTokens[idx]);
          }
        }
      });
    }

    console.log(`Successfully sent ${response.successCount} messages.`);
  } catch (err) {
    console.error("Critical Notify User Error:", err);
  }
}

export async function notifyAdmins(title, body, type = "INFO", additionalData = {}) {
  try {
    const adminUsers = await db.User.findAll({
      where: { role: "ADMIN" },
      include: [{ model: db.UserFcmTokens, as: "fcmTokens" }],
    });
    console.log("body : ", body);
    for (const adminUser of adminUsers) {
      await db.Notification.create({
        userId: adminUser.id,
        title,
        message: body,
        type: "INFO",
      });
    }
    const allTokens = adminUsers.flatMap((user) =>
      user.fcmTokens.map((t) => t.token),
    );

    if (!allTokens.length) {
      console.log("No tokens found ");
      return;
    }
    await admin.messaging().sendEachForMulticast({
      tokens: allTokens,
      notification: { title, body },
      data:{
        type: type ,
        ...additionalData
      }
    });
    console.log("successfully notification sent");
  } catch (err) {
    console.log("Notify Admins error : ", err);
  }
}
