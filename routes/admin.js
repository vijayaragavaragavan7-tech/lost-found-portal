const express = require("express");
const { withDB, load } = require("../db/database");
const { authRequired, adminRequired } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired, adminRequired);

// ---- Dashboard stats ----
router.get("/stats", (req, res) => {
  const data = load();
  const items = data.items;
  res.json({
    totalUsers: data.users.length,
    totalItems: items.length,
    lostItems: items.filter((i) => i.type === "lost").length,
    foundItems: items.filter((i) => i.type === "found").length,
    activeItems: items.filter((i) => i.status === "active").length,
    resolvedItems: items.filter((i) => i.status === "resolved").length,
    contactRequests: data.contactRequests.length,
  });
});

// ---- All users ----
router.get("/users", (req, res) => {
  const users = load().users.map(({ password, ...safe }) => safe);
  res.json({ users });
});

// ---- Change user role (promote to admin / demote) ----
router.patch("/users/:id/role", (req, res) => {
  const { role } = req.body;
  if (!["student", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be 'student' or 'admin'." });
  }
  const result = withDB((data) => {
    const user = data.users.find((u) => u.id === req.params.id);
    if (!user) return { error: "User not found." };
    user.role = role;
    const { password, ...safe } = user;
    return { user: safe };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

// ---- Delete user ----
router.delete("/users/:id", (req, res) => {
  const result = withDB((data) => {
    const idx = data.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) return { error: "User not found." };
    data.users.splice(idx, 1);
    return { success: true };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

// ---- All items (including removed/resolved) for moderation ----
router.get("/items", (req, res) => {
  const { status } = req.query;
  let items = load().items;
  if (status) items = items.filter((i) => i.status === status);
  items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ items });
});

// ---- Remove a fake/spam report ----
router.patch("/items/:id/remove", (req, res) => {
  const result = withDB((data) => {
    const item = data.items.find((i) => i.id === req.params.id);
    if (!item) return { error: "Item not found." };
    item.status = "removed";
    item.removedAt = new Date().toISOString();
    return { item };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

// ---- Restore a removed item ----
router.patch("/items/:id/restore", (req, res) => {
  const result = withDB((data) => {
    const item = data.items.find((i) => i.id === req.params.id);
    if (!item) return { error: "Item not found." };
    item.status = "active";
    return { item };
  });
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

// ---- Resolved items history ----
router.get("/history", (req, res) => {
  const items = load()
    .items.filter((i) => i.status === "resolved")
    .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt));
  res.json({ items });
});

// ---- All contact / matching requests (to verify) ----
router.get("/contact-requests", (req, res) => {
  const requests = load().contactRequests.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json({ requests });
});

module.exports = router;
