const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../../data/job_tracker.db');

let db = null;

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new sqlite3.Database(DB_PATH);
    db.run('PRAGMA foreign_keys = ON');
  }
  return db;
}

function setDb(database) {
  db = database;
}

function resetDb() {
  if (db) {
    try { db.close(); } catch (e) { /* ignore */ }
    db = null;
  }
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function runOnDb(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getOnDb(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function allOnDb(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function createSchema() {
  const database = getDb();
  await runOnDb(database, 'PRAGMA foreign_keys = ON');
  await runOnDb(database, `
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT    NOT NULL UNIQUE,
      password TEXT    NOT NULL,
      role     TEXT    DEFAULT 'user'
    )
  `);
  await runOnDb(database, `
    CREATE TABLE IF NOT EXISTS statuses (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL
    )
  `);
  await runOnDb(database, `
    CREATE TABLE IF NOT EXISTS applications (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL,
      company_name     TEXT    NOT NULL,
      position         TEXT    NOT NULL,
      status_id        INTEGER NOT NULL,
      application_date TEXT    NOT NULL,
      notes            TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (status_id) REFERENCES statuses(id)
    )
  `);
}

async function seedStatuses() {
  const database = getDb();
  const row = await getOnDb(database, 'SELECT COUNT(*) as count FROM statuses');
  if (row.count === 0) {
    for (const name of ['Pending', 'HR Interview', 'Technical Interview', 'Offer', 'Rejected']) {
      await runOnDb(database, 'INSERT INTO statuses (name) VALUES (?)', [name]);
    }
  }
}

async function seedAdmin() {
  const database = getDb();
  const row = await getOnDb(database, 'SELECT COUNT(*) as count FROM users WHERE role = "admin"');
  if (row.count === 0) {
    // Generate a secure hash for "admin123"
    // Using bcrypt requires it, but here we can just use the precomputed hash or require bcrypt
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await runOnDb(database, 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
  }
}

async function initializeDatabase() {
  await createSchema();
  await seedStatuses();
  await seedAdmin();
}

module.exports = {
  getDb, setDb, resetDb,
  run, get, all,
  runOnDb, getOnDb, allOnDb,
  createSchema, seedStatuses, initializeDatabase,
};
