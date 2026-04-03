const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'todos.csv');
const PUBLIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js'
};

ensureDataFile();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname.startsWith('/api/todos')) {
    try {
      await handleApi(req, res, requestUrl);
    } catch (error) {
      sendJson(res, 500, { error: 'Internal server error', detail: error.message });
    }
    return;
  }

  if (PUBLIC_FILES[requestUrl.pathname]) {
    serveStaticFile(res, PUBLIC_FILES[requestUrl.pathname]);
    return;
  }

  sendJson(res, 404, { error: 'Resource not found' });
});

server.listen(PORT, () => {
  console.log(`Todo app listening on http://localhost:${PORT}`);
});

async function handleApi(req, res, requestUrl) {
  const pathParts = requestUrl.pathname.split('/').filter(Boolean);

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const todos = readTodos();

  if (req.method === 'GET' && pathParts.length === 2) {
    const search = requestUrl.searchParams.get('search')?.trim().toLowerCase();
    const status = requestUrl.searchParams.get('status');
    const priority = requestUrl.searchParams.get('priority');
    const category = requestUrl.searchParams.get('category');

    const filtered = todos.filter((todo) => {
      const matchesSearch = !search || [todo.title, todo.description, todo.category].join(' ').toLowerCase().includes(search);
      const matchesStatus = !status || todo.status === status;
      const matchesPriority = !priority || todo.priority === priority;
      const matchesCategory = !category || todo.category === category;
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    sendJson(res, 200, {
      items: filtered,
      summary: buildSummary(filtered)
    });
    return;
  }

  if (req.method === 'GET' && pathParts[2] === 'group') {
    const groupBy = requestUrl.searchParams.get('by') || 'status';
    const allowed = new Set(['status', 'priority', 'category']);

    if (!allowed.has(groupBy)) {
      sendJson(res, 400, { error: 'Invalid by parameter. Use status, priority, or category.' });
      return;
    }

    const groups = todos.reduce((acc, todo) => {
      const key = todo[groupBy] || 'No value';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    sendJson(res, 200, {
      groupBy,
      groups: Object.entries(groups).map(([value, total]) => ({ value, total }))
    });
    return;
  }

  if (req.method === 'GET' && pathParts.length === 3) {
    const todo = todos.find((item) => item.id === pathParts[2]);

    if (!todo) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    sendJson(res, 200, todo);
    return;
  }

  if (req.method === 'POST' && pathParts.length === 2) {
    const body = await readBody(req);
    const payload = normalizePayload(body);
    const validationError = validateTodo(payload);

    if (validationError) {
      sendJson(res, 400, { error: validationError });
      return;
    }

    const now = new Date().toISOString();
    const newTodo = {
      id: String(Date.now()),
      ...payload,
      createdAt: now,
      updatedAt: now
    };

    todos.unshift(newTodo);
    writeTodos(todos);
    sendJson(res, 201, newTodo);
    return;
  }

  if (req.method === 'PUT' && pathParts.length === 3) {
    const index = todos.findIndex((item) => item.id === pathParts[2]);

    if (index === -1) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    const body = await readBody(req);
    const payload = normalizePayload(body);
    const validationError = validateTodo(payload);

    if (validationError) {
      sendJson(res, 400, { error: validationError });
      return;
    }

    const updatedTodo = {
      ...todos[index],
      ...payload,
      updatedAt: new Date().toISOString()
    };

    todos[index] = updatedTodo;
    writeTodos(todos);
    sendJson(res, 200, updatedTodo);
    return;
  }

  if (req.method === 'DELETE' && pathParts.length === 3) {
    const index = todos.findIndex((item) => item.id === pathParts[2]);

    if (index === -1) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    const [deleted] = todos.splice(index, 1);
    writeTodos(todos);
    sendJson(res, 200, { message: 'Task deleted', item: deleted });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const header = 'id,title,description,status,priority,category,dueDate,createdAt,updatedAt\n';
    fs.writeFileSync(DATA_FILE, header, 'utf8');
  }
}

function serveStaticFile(res, fileName) {
  const filePath = path.join(__dirname, fileName);
  const extension = path.extname(fileName);
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8'
  }[extension] || 'text/plain; charset=utf-8';

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 500, { error: 'The requested file could not be loaded' });
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
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
  const headers = ['id', 'title', 'description', 'status', 'priority', 'category', 'dueDate', 'createdAt', 'updatedAt'];
  const lines = [headers.join(',')];

  for (const todo of todos) {
    lines.push(headers.map((header) => escapeCsvValue(todo[header] || '')).join(','));
  }

  fs.writeFileSync(DATA_FILE, `${lines.join('\n')}\n`, 'utf8');
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

function normalizePayload(body) {
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    status: String(body.status || 'pending').trim(),
    priority: String(body.priority || 'medium').trim(),
    category: String(body.category || 'General').trim(),
    dueDate: String(body.dueDate || '').trim()
  };
}

function validateTodo(todo) {
  if (!todo.title) {
    return 'Title is required.';
  }

  if (!['pending', 'in_progress', 'done'].includes(todo.status)) {
    return 'Status must be pending, in_progress, or done.';
  }

  if (!['low', 'medium', 'high'].includes(todo.priority)) {
    return 'Priority must be low, medium, or high.';
  }

  return null;
}

function buildSummary(todos) {
  return {
    total: todos.length,
    pending: todos.filter((item) => item.status === 'pending').length,
    inProgress: todos.filter((item) => item.status === 'in_progress').length,
    done: todos.filter((item) => item.status === 'done').length,
    highPriority: todos.filter((item) => item.priority === 'high').length
  };
}
