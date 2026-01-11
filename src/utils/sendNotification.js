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
export async function notifyUser(userId, title, body) {
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
console.log("fcm tokens : ",fcmTokens)
    // Use the correctly initialized admin instance
    const response = await admin.messaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body },
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
            console.log("failed token : ",fcmTokens[idx]);
          }
        }
      });

    }

    console.log(`Successfully sent ${response.successCount} messages.`);
  } catch (err) {
    console.error("Critical Notify User Error:", err);
  }
}

export async function notifyAdmins(title, body) {
  try{
    const adminUsers = await db.User.findAll({
    where: { role: "ADMIN" },
    include: [{ model: db.UserFcmTokens, as: "fcmTokens" }],
  });
  console.log("body : ",body)
  for (const adminUser of adminUsers) {
    await db.Notification.create({
      userId: adminUser.id,
      title,
      message: body,
      type: "INFO",
    });
  }
  const allTokens = adminUsers.flatMap((user) =>
    user.fcmTokens.map((t) => t.token)
  );

  if (!allTokens.length) 
  {
    console.log("No tokens found ")
    return;
  }
  await admin.messaging().sendEachForMulticast({
    tokens: allTokens,
    notification: { title, body },
  });
  console.log("successfully notification sent")
  }


catch(err){
  console.log("Notify Admins error : " ,err);
}
}

export async function getNotificationsForUser(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await db.Notification.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
    return res.json({ notifications });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
}
export async function markNotificationAsRead(req, res) {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const notification = await db.Notification.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    notification.isRead = true;
    await notification.save();
    return res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("MARK NOTIFICATION AS READ ERROR:", err);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  } 
}
export async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id;
    await db.Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );
    return res.json({ message: "All notifications marked as read" });
  }
  catch (err) {
    console.error("MARK ALL NOTIFICATIONS AS READ ERROR:", err);
    return res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
}



export async function deleteAllNotifications(req, res) {
  try {
    const userId = req.user.id;

    await db.Notification.destroy({
      where: { userId },
    });

    return res.json({ message: "All notifications deleted" });
  } catch (err) {
    console.error("DELETE ALL NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ message: "Failed to delete notifications" });
  }
}


export async function deleteNotification(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await db.Notification.destroy({
      where: { id, userId },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("DELETE NOTIFICATION ERROR:", err);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
}
