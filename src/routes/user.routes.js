const router = require("express").Router();
const db = require("../models");

router.get("/all", async (req, res) => {
  const users = await db.User.findMany();
  res.json(users);
});

export default router;
