import db from "../models/index.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
export  const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = await db.User.create({
      name,
      email,
      mobile,
      password: hashed,
      role: role || "CLIENT",
    });

    return res.json({ message: "Account created", user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Registration failed" });
  }
};

export  const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt:", email);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await db.User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: "Logged in", user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Login failed" });
  }
};

export  const logoutUser = (req, res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  res.json({ message: "Logged out" });
};

export  const getMe = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ user: null });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db.User.findByPk(decoded.id);

    if (!user) return res.status(404).json({ user: null });

    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ user: null });
  }
};
