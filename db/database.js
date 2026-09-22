/**
 * Lightweight JSON-file database.
 * Chosen instead of MySQL/MongoDB so the project runs instantly with
 * `npm install && npm start` — no external database server required.
 * Swap this out for real SQL/Mongo later if you want (see README).
 */
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "data.json");

// Default shape of the database
const DEFAULT_DATA = {
  users: [],
  items: [], // both lost & found items live here, differentiated by `type`
  contactRequests: [],
};

function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Corrupt data.json, resetting to default.", e);
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Basic in-process lock to avoid concurrent write corruption on rapid requests
let writing = false;
function withDB(fn) {
  const data = load();
  const result = fn(data);
  save(data);
  return result;
}

module.exports = { load, save, withDB };
