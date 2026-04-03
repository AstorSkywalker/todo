const { readBody, sendJson } = require('../utils/http');
const {
  createTodo,
  deleteTodo,
  exportTodos,
  getStorageStatus,
  getTodoById,
  groupTodos,
  importTodos,
  listTodos,
  updateTodo
} = require('../services/todoService');

async function handleTodosApi(req, res, requestUrl) {
  const pathParts = requestUrl.pathname.split('/').filter(Boolean);

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && pathParts[2] === 'export') {
    const result = exportTodos(requestUrl.searchParams.get('format') || 'csv');

    if (result.error) {
      sendJson(res, result.statusCode, { error: result.error });
      return;
    }

    res.writeHead(result.statusCode, {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(result.body);
    return;
  }

  if (req.method === 'GET' && pathParts[2] === 'storage') {
    sendJson(res, 200, getStorageStatus());
    return;
  }

  if (req.method === 'POST' && pathParts[2] === 'import') {
    let body;

    try {
      body = await readBody(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    const result = importTodos(body);
    if (result.error) {
      sendJson(res, result.statusCode, { error: result.error });
      return;
    }

    sendJson(res, result.statusCode, result.payload);
    return;
  }

  if (req.method === 'GET' && pathParts.length === 2) {
    const result = listTodos({
      search: requestUrl.searchParams.get('search'),
      status: requestUrl.searchParams.get('status'),
      priority: requestUrl.searchParams.get('priority'),
      category: requestUrl.searchParams.get('category')
    });

    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && pathParts[2] === 'group') {
    const result = groupTodos(requestUrl.searchParams.get('by') || 'status');

    if (result.error) {
      sendJson(res, result.statusCode, { error: result.error });
      return;
    }

    sendJson(res, result.statusCode, result.payload);
    return;
  }

  if (req.method === 'GET' && pathParts.length === 3) {
    const todo = getTodoById(pathParts[2]);

    if (!todo) {
      sendJson(res, 404, { error: 'Task not found' });
      return;
    }

    sendJson(res, 200, todo);
    return;
  }

  if (req.method === 'POST' && pathParts.length === 2) {
    const body = await readBody(req);
    const result = createTodo(body);

    if (result.error) {
      sendJson(res, result.statusCode, { error: result.error });
      return;
    }

    sendJson(res, result.statusCode, result.item);
    return;
  }

  if (req.method === 'PUT' && pathParts.length === 3) {
    const body = await readBody(req);
    const result = updateTodo(pathParts[2], body);

    if (result.error) {
      sendJson(res, result.statusCode, { error: result.error });
      return;
    }

    sendJson(res, result.statusCode, result.item);
    return;
  }

  if (req.method === 'DELETE' && pathParts.length === 3) {
    const result = deleteTodo(pathParts[2]);

    if (result.error) {
      sendJson(res, result.statusCode, { error: result.error });
      return;
    }

    sendJson(res, result.statusCode, { message: result.message, item: result.item });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

module.exports = {
  handleTodosApi
};
