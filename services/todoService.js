const { getSqliteSummary } = require('../sqliteService');
const { buildCsvContent, DATA_FILE, parseCsvLine, readTodos, writeTodos } = require('./csvService');
const { normalizeImportedTodos, normalizePayload, validateTodo } = require('../utils/validation');

function listTodos(filters = {}) {
  const todos = readTodos();
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status;
  const priority = filters.priority;
  const category = filters.category;

  const filtered = todos.filter((todo) => {
    const matchesSearch = !search || [todo.title, todo.description, todo.category].join(' ').toLowerCase().includes(search);
    const matchesStatus = !status || todo.status === status;
    const matchesPriority = !priority || todo.priority === priority;
    const matchesCategory = !category || todo.category === category;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  return {
    items: filtered,
    summary: buildSummary(filtered)
  };
}

function getTodoById(id) {
  return readTodos().find((item) => item.id === id) || null;
}

function createTodo(body) {
  const todos = readTodos();
  const payload = normalizePayload(body);
  const validationError = validateTodo(payload);

  if (validationError) {
    return { error: validationError, statusCode: 400 };
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
  return { item: newTodo, statusCode: 201 };
}

function updateTodo(id, body) {
  const todos = readTodos();
  const index = todos.findIndex((item) => item.id === id);

  if (index === -1) {
    return { error: 'Task not found', statusCode: 404 };
  }

  const payload = normalizePayload(body);
  const validationError = validateTodo(payload);

  if (validationError) {
    return { error: validationError, statusCode: 400 };
  }

  const updatedTodo = {
    ...todos[index],
    ...payload,
    updatedAt: new Date().toISOString()
  };

  todos[index] = updatedTodo;
  writeTodos(todos);
  return { item: updatedTodo, statusCode: 200 };
}

function deleteTodo(id) {
  const todos = readTodos();
  const index = todos.findIndex((item) => item.id === id);

  if (index === -1) {
    return { error: 'Task not found', statusCode: 404 };
  }

  const [deleted] = todos.splice(index, 1);
  writeTodos(todos);
  return {
    item: deleted,
    message: 'Task deleted',
    statusCode: 200
  };
}

function groupTodos(groupBy = 'status') {
  const allowed = new Set(['status', 'priority', 'category']);
  if (!allowed.has(groupBy)) {
    return { error: 'Invalid by parameter. Use status, priority, or category.', statusCode: 400 };
  }

  const todos = readTodos();
  const groups = todos.reduce((acc, todo) => {
    const key = todo[groupBy] || 'No value';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    statusCode: 200,
    payload: {
      groupBy,
      groups: Object.entries(groups).map(([value, total]) => ({ value, total }))
    }
  };
}

function getStorageStatus() {
  const todos = readTodos();
  return {
    csv: {
      file: DATA_FILE,
      total: todos.length
    },
    sqlite: getSqliteSummary()
  };
}

function importTodos({ format = '', mode = 'append', content = '' }) {
  const normalizedFormat = String(format).trim().toLowerCase();
  const normalizedMode = String(mode).trim().toLowerCase();
  const normalizedContent = typeof content === 'string' ? content : '';

  if (!['csv', 'json'].includes(normalizedFormat)) {
    return { error: 'Invalid import format. Use csv or json.', statusCode: 400 };
  }

  if (!['append', 'replace'].includes(normalizedMode)) {
    return { error: 'Invalid import mode. Use append or replace.', statusCode: 400 };
  }

  if (!normalizedContent.trim()) {
    return { error: 'Import content is required.', statusCode: 400 };
  }

  const todos = readTodos();
  let importedTodos;
  let normalizedTodos;

  try {
    importedTodos = parseImportContent(normalizedContent, normalizedFormat);
    normalizedTodos = normalizeImportedTodos(importedTodos, normalizedMode === 'replace' ? [] : todos);
  } catch (error) {
    return { error: error.message, statusCode: 400 };
  }

  const mergedTodos = normalizedMode === 'replace'
    ? normalizedTodos
    : [...normalizedTodos, ...todos];

  writeTodos(mergedTodos);

  return {
    statusCode: 200,
    payload: {
      message: `Imported ${normalizedTodos.length} task${normalizedTodos.length === 1 ? '' : 's'} successfully.`,
      imported: normalizedTodos.length,
      total: mergedTodos.length,
      mode: normalizedMode
    }
  };
}

function exportTodos(format = 'csv') {
  const normalizedFormat = String(format || 'csv').trim().toLowerCase();
  if (!['csv', 'json'].includes(normalizedFormat)) {
    return { error: 'Invalid export format. Use csv or json.', statusCode: 400 };
  }

  const todos = readTodos();
  const timestamp = new Date().toISOString().slice(0, 10);

  if (normalizedFormat === 'json') {
    return {
      statusCode: 200,
      contentType: 'application/json; charset=utf-8',
      fileName: `todos-${timestamp}.json`,
      body: JSON.stringify({ items: todos }, null, 2)
    };
  }

  return {
    statusCode: 200,
    contentType: 'text/csv; charset=utf-8',
    fileName: `todos-${timestamp}.csv`,
    body: buildCsvContent(todos)
  };
}

function parseImportContent(content, format) {
  if (format === 'json') {
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error('The JSON file could not be parsed.');
    }

    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items)) {
      throw new Error('The JSON file must contain an array of tasks or an "items" array.');
    }

    return items;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  const [headerLine, ...rows] = trimmed.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  if (!headers.length) {
    throw new Error('The CSV file must include a header row.');
  }

  return rows.filter(Boolean).map((row) => {
    const values = parseCsvLine(row);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || '';
      return acc;
    }, {});
  });
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

module.exports = {
  buildSummary,
  createTodo,
  deleteTodo,
  exportTodos,
  getStorageStatus,
  getTodoById,
  groupTodos,
  importTodos,
  listTodos,
  parseImportContent,
  updateTodo
};
