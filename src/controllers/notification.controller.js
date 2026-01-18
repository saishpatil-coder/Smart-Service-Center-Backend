import db from "../models/index.js";

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
    return res
      .status(500)
      .json({ message: "Failed to mark notification as read" });
  }
}
export async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = req.user.id;
    await db.Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } },
    );
    return res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("MARK ALL NOTIFICATIONS AS READ ERROR:", err);
    return res
      .status(500)
      .json({ message: "Failed to mark all notifications as read" });
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
