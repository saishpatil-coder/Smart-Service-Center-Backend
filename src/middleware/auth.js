const admin = require("../config/firebase");

module.exports = async function (req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};
