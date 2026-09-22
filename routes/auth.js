const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { withDB } = require("../db/database");
const { hashPassword, verifyPassword } = require("../utils/password");
const { JWT_SECRET, authRequired } = require("../middleware/auth");

const router = express.Router();

// ---- REGISTER ----
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const result = withDB((data) => {
      const exists = data.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        return { error: "An account with this email already exists." };
      }

      const user = {
        id: uuidv4(),
        name,
        email: email.toLowerCase(),
        password: hashPassword(password),
        role: "student",
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      return { user };
    });

    if (result.error) return res.status(409).json({ error: result.error });

    const { password: _pw, ...safeUser } = result.user;
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while registering." });
  }
});

// ---- LOGIN ----
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const result = withDB((data) => {
    const user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return { user };
  });

  const user = result.user;
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const { password: _pw, ...safeUser } = user;
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: safeUser });
});

// ---- CURRENT USER ----
router.get("/me", authRequired, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
