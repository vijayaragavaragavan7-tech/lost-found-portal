# 🔎 Smart Lost & Found Portal — College Campus

A full-stack web app where students can report lost/found items, search & filter
reports, contact each other, and get automatic **"Possible Match Found"**
suggestions from a smart matching algorithm. Includes an admin panel for
moderation and user management.

---

## 🧱 Tech Stack

- **Backend:** Node.js + Express
- **Database:** Simple JSON file storage (`backend/db/data.json`) — zero setup,
  no MySQL/MongoDB server needed. Easy to swap for a real database later.
- **Auth:** JWT tokens + Node's built-in `crypto` module for password hashing
  (no external crypto dependency required)
- **File uploads:** Multer (item photos)
- **Frontend:** Plain HTML / CSS / JavaScript (no framework, no build step)

---

## 📁 Project Structure

```
lost-found-portal/
├── backend/
│   ├── server.js              → Express app entry point
│   ├── package.json
│   ├── db/
│   │   ├── database.js        → JSON file read/write helper
│   │   └── data.json          → the "database" (auto-created if missing)
│   ├── middleware/
│   │   └── auth.js            → JWT auth + admin-only guard
│   ├── routes/
│   │   ├── auth.js            → register / login / me
│   │   ├── items.js           → CRUD for lost/found items, matching, contact
│   │   └── admin.js           → stats, user mgmt, moderation, history
│   ├── utils/
│   │   ├── password.js        → password hashing (scrypt)
│   │   └── matching.js        → 🤖 Smart Matching System
│   └── uploads/                → uploaded item photos (created automatically)
└── frontend/
    ├── index.html              → landing page
    ├── login.html / register.html
    ├── report-lost.html / report-found.html
    ├── search.html             → browse/search/filter + item detail modal
    ├── dashboard.html          → "My Reports" + contact requests
    ├── admin.html              → admin panel
    ├── css/style.css
    └── js/api.js               → shared fetch/auth helper + navbar
```

---

## 🚀 How to Run

1. Make sure **Node.js** (v16+) is installed on your computer.
2. Open a terminal inside the `backend` folder:
   ```bash
   cd backend
   npm install
   npm start
   ```
3. Open your browser at **http://localhost:5000**

That's it — the same server serves both the API and the frontend, so there's
nothing else to configure.

### Default Admin Login
```
Email:    admin@campus.edu
Password: admin123
```
(Change this in production! You can also promote any registered student to
admin from the Admin Panel → Users tab.)

---

## 🤖 Smart Matching System — How It Works

Every time a **Lost** or **Found** item is submitted, `utils/matching.js`
automatically compares it against all reports of the opposite type and scores
each pair from 0–100 based on:

| Factor                        | Weight |
|--------------------------------|--------|
| Title / description similarity | 50%    |
| Category match                 | 15%    |
| Location similarity            | 20%    |
| Date closeness (within 14 days)| 15%    |

Text similarity uses a mix of **word overlap** (handles reordered words like
"wallet black" vs "black wallet") and **Levenshtein distance** (handles typos).

Any pair scoring **55% or higher** is shown to the user as a
**"🤖 Possible Match Found"** banner immediately after submitting a report, and
also when viewing any item's detail page.

Example from the project brief:
```
Lost:  Black wallet   | Canteen | 20 Sept
Found: Black wallet   | Canteen | 20 Sept
→ System shows: "Possible Match Found" (high score)
```

---

## ✅ Features Implemented

**Students**
- Register / Login (JWT-based sessions)
- Report Lost Item (title, category, location, date, description, photo)
- Report Found Item (same fields)
- Search & filter all items (by keyword, type, category, location)
- View item details + auto-suggested matches
- Contact the owner/finder of an item
- Mark own reports as Resolved
- "My Reports" dashboard + contact request inbox

**Admin**
- Dashboard stats (users, lost/found counts, active/resolved)
- Manage all posts — remove fake/spam reports, restore them
- User management — promote/demote admins, delete accounts
- Resolved items history
- View all contact/match requests for verification

---

## 🔧 Notes for Extending

- To switch to a real database (MySQL/MongoDB/PostgreSQL), only
  `backend/db/database.js` needs to change — every route calls `withDB()` /
  `load()` from that one file.
- To send real emails/SMS on match or contact, hook into
  `routes/items.js` → the `POST /:id/contact` handler and the matching
  block inside `POST /` (item creation).
- `MATCH_THRESHOLD` in `utils/matching.js` can be tuned (default 55).
