const fs = require('fs');
const path = require('path');
const { syncTodosToSqlite } = require('../sqliteService');

const DATA_DIR = process.env.TODO_DATA_DIR
  ? path.resolve(process.env.TODO_DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DATA_FILE = process.env.TODO_DATA_FILE
  ? path.resolve(process.env.TODO_DATA_FILE)
  : path.join(DATA_DIR, 'todos.csv');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const header = 'id,title,description,status,priority,category,dueDate,createdAt,updatedAt\n';
    fs.writeFileSync(DATA_FILE, header, 'utf8');
  }
}

function readTodos() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  if (!raw) {
    return [];
  }

  const [headerLine, ...rows] = raw.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return rows.filter(Boolean).map((row) => {
    const values = parseCsvLine(row);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || '';
      return acc;
    }, {});
  });
}

function writeTodos(todos) {
  fs.writeFileSync(DATA_FILE, buildCsvContent(todos), 'utf8');
  syncTodosToSqlite(todos);
}

function buildCsvContent(todos) {
  const headers = ['id', 'title', 'description', 'status', 'priority', 'category', 'dueDate', 'createdAt', 'updatedAt'];
  const lines = [headers.join(',')];

  for (const todo of todos) {
    lines.push(headers.map((header) => escapeCsvValue(todo[header] || '')).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function escapeCsvValue(value) {
  const stringValue = String(value).replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
}

module.exports = {
  DATA_DIR,
  DATA_FILE,
  buildCsvContent,
  ensureDataFile,
  escapeCsvValue,
  parseCsvLine,
  readTodos,
  writeTodos
};
