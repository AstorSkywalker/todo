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

  if (todo.dueDate && !isValidIsoDate(todo.dueDate)) {
    return 'Due date must be a valid date in YYYY-MM-DD format.';
  }

  if (!['pending', 'in_progress', 'done'].includes(todo.status)) {
    return 'Status must be pending, in_progress, or done.';
  }

  if (!['low', 'medium', 'high'].includes(todo.priority)) {
    return 'Priority must be low, medium, or high.';
  }

  return null;
}

function isValidDateTime(value) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const safeDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(safeDate.getTime())) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  return (
    safeDate.getUTCFullYear() === year &&
    safeDate.getUTCMonth() + 1 === month &&
    safeDate.getUTCDate() === day
  );
}

function generateUniqueId(existingIds) {
  let candidate = '';

  do {
    candidate = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

function normalizeImportedTodos(items, existingTodos) {
  const existingIds = new Set(existingTodos.map((item) => item.id));

  return items.map((item, index) => {
    const payload = normalizePayload(item);
    const validationError = validateTodo(payload);

    if (validationError) {
      throw new Error(`Import row ${index + 1}: ${validationError}`);
    }

    const createdAt = isValidDateTime(item.createdAt) ? item.createdAt : new Date().toISOString();
    const updatedAt = isValidDateTime(item.updatedAt) ? item.updatedAt : createdAt;
    let id = String(item.id || '').trim();

    if (!id || existingIds.has(id)) {
      id = generateUniqueId(existingIds);
    }

    existingIds.add(id);

    return {
      id,
      ...payload,
      createdAt,
      updatedAt
    };
  });
}

module.exports = {
  generateUniqueId,
  isValidDateTime,
  isValidIsoDate,
  normalizeImportedTodos,
  normalizePayload,
  validateTodo
};
