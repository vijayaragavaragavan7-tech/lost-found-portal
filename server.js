const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded item photos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve the frontend (so you can run everything from one server)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Fallback to index.html for any non-API route (simple SPA-style routing)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`🚀 Lost & Found Portal server running at http://localhost:${PORT}`);
  console.log(`   Default admin login -> email: admin@campus.edu | password: admin123`);
});
