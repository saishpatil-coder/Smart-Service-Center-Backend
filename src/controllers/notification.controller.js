import db from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getNotificationsForUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notifications = await db.Notification.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
  return res.json({ notifications });
});
export const markNotificationAsRead = asyncHandler(async (req, res) => {
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
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await db.Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } },
  );
  return res.json({ message: "All notifications marked as read" });
});
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await db.Notification.destroy({
    where: { userId },
  });

  return res.json({ message: "All notifications deleted" });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const deleted = await db.Notification.destroy({
    where: { id, userId },
  });

  if (!deleted) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.json({ message: "Notification deleted" });
});
