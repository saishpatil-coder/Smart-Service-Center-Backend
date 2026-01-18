import express from "express";
import { verifyUser } from "../middleware/auth.middleware.js";
import { deleteAllNotifications, deleteNotification, getNotificationsForUser, markAllNotificationsAsRead, markNotificationAsRead } from "../controllers/notification.controller.js";


const router = express.Router();
/* ----------------------------------------------------
   GET NOTIFICATIONS FOR A USER
----------------------------------------------------- */    
router.get("/",verifyUser,getNotificationsForUser);
router.patch("/:id/read",verifyUser,markNotificationAsRead);
router.patch("/read-all",verifyUser,markAllNotificationsAsRead);
router.delete("/",verifyUser,deleteAllNotifications);
router.delete("/:id",verifyUser,deleteNotification);

export default router;