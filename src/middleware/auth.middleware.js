import jwt from "jsonwebtoken";

/**
 * Higher-Order Function to generate middleware
 * This keeps your code DRY (Don't Repeat Yourself)
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    const token = req.cookies.token;

    // 1. Check for token
    // ⚠️ CRITICAL: Must return 401 (not 403) so frontend knows to try refreshing
    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authenticated. No token found." });
    }

    try {
      // 2. Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Role Check (if specific roles are required)
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          message: `Access denied. Role '${decoded.role}' is not authorized.`,
        });
      }

      // 4. Attach user to request
      req.user = decoded;
      next();
    } catch (err) {
      // 5. JWT Error (Expired/Invalid)
      // Returns 401 to trigger frontend refresh loop
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  };
};

// Export specific middleware functions to maintain your existing import structure
export const verifyAdmin = authorize(["ADMIN"]);
export const verifyMechanic = authorize(["MECHANIC"]);
export const verifyClient = authorize(["CLIENT"]);

// Allows ANY authenticated user (Admin, Mechanic, or Client)
export const verifyUser = authorize([]);
