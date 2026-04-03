const Database = require('better-sqlite3');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'todos.db');

let db;
let lastSyncAt = null;

function initializeSqlite() {
  if (db) {
    return db;
  }

  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      category TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  return db;
}

function syncTodosToSqlite(todos) {
  const database = initializeSqlite();
  const replaceAll = database.transaction((items) => {
    database.prepare('DELETE FROM todos').run();

    const insertTodo = database.prepare(`
      INSERT INTO todos (id, title, description, status, priority, category, dueDate, createdAt, updatedAt)
      VALUES (@id, @title, @description, @status, @priority, @category, @dueDate, @createdAt, @updatedAt)
    `);

    for (const todo of items) {
      insertTodo.run({
        id: String(todo.id || ''),
        title: String(todo.title || ''),
        description: String(todo.description || ''),
        status: String(todo.status || ''),
        priority: String(todo.priority || ''),
        category: String(todo.category || ''),
        dueDate: String(todo.dueDate || ''),
        createdAt: String(todo.createdAt || ''),
        updatedAt: String(todo.updatedAt || '')
      });
    }
  });

  replaceAll(todos);
  lastSyncAt = new Date().toISOString();
}

function getSqliteSummary() {
  const database = initializeSqlite();
  const total = database.prepare('SELECT COUNT(*) AS total FROM todos').get().total;
  return {
    dbFile: DB_FILE,
    total,
    lastSyncAt
  };
}

module.exports = {
  DB_FILE,
  getSqliteSummary,
  initializeSqlite,
  syncTodosToSqlite
};
