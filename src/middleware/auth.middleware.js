import jwt from "jsonwebtoken";

export const verifyAdmin = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Not authenticated." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    req.user = decoded; // attach user details to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

export const verifyClient = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Not authenticated." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "CLIENT") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    req.user = decoded; // attach user details to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};


export const verifyMechanic = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Not authenticated." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "MECHANIC") {
      return res.status(403).json({ message: "Access denied. Mechanics only." });
    }

    req.user = decoded; // attach user details to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
