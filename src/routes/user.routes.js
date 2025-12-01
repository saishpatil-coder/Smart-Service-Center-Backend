const router = require("express").Router();
const prisma = require("../config/db");

router.get("/all", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

module.exports = router;
