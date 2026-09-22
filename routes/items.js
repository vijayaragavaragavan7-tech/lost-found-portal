const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { withDB, load } = require("../db/database");
const { authRequired } = require("../middleware/auth");
const { findMatches } = require("../utils/matching");

const router = express.Router();

// ---- File upload setup ----
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("Only image files are allowed."), ok);
  },
});

// ---- CREATE item (lost or found) ----
router.post("/", authRequired, upload.single("photo"), (req, res) => {
  const { type, title, description, category, location, date } = req.body;

  if (!type || !["lost", "found"].includes(type)) {
    return res.status(400).json({ error: "type must be 'lost' or 'found'." });
  }
  if (!title || !location || !date) {
    return res.status(400).json({ error: "title, location and date are required." });
  }

  const item = {
    id: uuidv4(),
    type, // "lost" | "found"
    title,
    description: description || "",
    category: category || "Other",
    location,
    date, // ISO date string
    photo: req.file ? `/uploads/${req.file.filename}` : null,
    reportedBy: { id: req.user.id, name: req.user.name, email: req.user.email },
    status: "active", // active | resolved | removed
    createdAt: new Date().toISOString(),
  };

  withDB((data) => {
    data.items.push(item);
  });

  // Find possible matches against the opposite type right away
  const all = load().items;
  const oppositeType = type === "lost" ? "found" : "lost";
  const candidates = all.filter((i) => i.type === oppositeType);
  const matches = findMatches(item, candidates);

  res.status(201).json({ item, matches });
});

// ---- LIST / SEARCH / FILTER ----
router.get("/", (req, res) => {
  const { type, category, q, status, location } = req.query;
  let items = load().items;

  if (type) items = items.filter((i) => i.type === type);
  if (status) items = items.filter((i) => i.status === status);
  else items = items.filter((i) => i.status !== "removed");
  if (category) items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  if (location) items = items.filter((i) => i.location.toLowerCase().includes(location.toLowerCase()));
  if (q) {
    const query = q.toLowerCase();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query)
    );
  }

  items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ items });
});

// ---- GET single item + its possible matches ----
router.get("/:id", (req, res) => {
  const all = load().items;
  const item = all.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found." });

  const oppositeType = item.type === "lost" ? "found" : "lost";
  const candidates = all.filter((i) => i.type === oppositeType);
  const matches = findMatches(item, candidates);

  res.json({ item, matches });
});

// ---- MARK RESOLVED ----
router.patch("/:id/resolve", authRequired, (req, res) => {
  const result = withDB((data) => {
    const item = data.items.find((i) => i.id === req.params.id);
    if (!item) return { error: "Item not found." };
    const isOwner = item.reportedBy.id === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return { error: "You can only resolve your own reports." };
    }
    item.status = "resolved";
    item.resolvedAt = new Date().toISOString();
    return { item };
  });

  if (result.error) return res.status(result.error.includes("only") ? 403 : 404).json(result);
  res.json(result);
});

// ---- DELETE own report ----
router.delete("/:id", authRequired, (req, res) => {
  const result = withDB((data) => {
    const idx = data.items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return { error: "Item not found." };
    const item = data.items[idx];
    if (item.reportedBy.id !== req.user.id && req.user.role !== "admin") {
      return { error: "You can only delete your own reports." };
    }
    data.items.splice(idx, 1);
    return { success: true };
  });

  if (result.error) return res.status(403).json(result);
  res.json(result);
});

// ---- CONTACT OWNER/FINDER ----
router.post("/:id/contact", authRequired, (req, res) => {
  const { message } = req.body;
  const result = withDB((data) => {
    const item = data.items.find((i) => i.id === req.params.id);
    if (!item) return { error: "Item not found." };

    const request = {
      id: uuidv4(),
      itemId: item.id,
      itemTitle: item.title,
      fromUser: { id: req.user.id, name: req.user.name, email: req.user.email },
      toUser: item.reportedBy,
      message: message || "Hi, I think this might be my/your item. Please get in touch.",
      createdAt: new Date().toISOString(),
    };
    data.contactRequests.push(request);
    return { request };
  });

  if (result.error) return res.status(404).json(result);
  res.status(201).json(result);
});

// ---- Contact requests involving the logged-in user (sent or received) ----
router.get("/my/contacts", authRequired, (req, res) => {
  const all = load().contactRequests;
  const mine = all
    .filter((r) => r.toUser.id === req.user.id || r.fromUser.id === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ requests: mine });
});

module.exports = router;
