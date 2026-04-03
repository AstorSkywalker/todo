const state = {
  items: [],
  editingId: null,
  groupBy: 'status'
};

const todoForm = document.querySelector('#todoForm');
const titleInput = document.querySelector('#title');
const descriptionInput = document.querySelector('#description');
const statusInput = document.querySelector('#status');
const priorityInput = document.querySelector('#priority');
const categoryInput = document.querySelector('#category');
const dueDateInput = document.querySelector('#dueDate');
const dueDatePicker = document.querySelector('#dueDatePicker');
const dueDateButton = document.querySelector('#dueDateButton');
const dueDateError = document.querySelector('#dueDateError');
const searchInput = document.querySelector('#searchInput');
const filterStatus = document.querySelector('#filterStatus');
const filterPriority = document.querySelector('#filterPriority');
const todoList = document.querySelector('#todoList');
const feedback = document.querySelector('#feedback');
const formTitle = document.querySelector('#formTitle');
const submitButton = document.querySelector('#submitButton');
const cancelEditButton = document.querySelector('#cancelEditButton');
const refreshButton = document.querySelector('#refreshButton');
const themeToggle = document.querySelector('#themeToggle');
const themeLabel = document.querySelector('#themeLabel');
const template = document.querySelector('#todoCardTemplate');
const groupButtons = Array.from(document.querySelectorAll('[data-group]'));
const groupResults = document.querySelector('#groupResults');

const counters = {
  total: document.querySelector('#totalCount'),
  pending: document.querySelector('#pendingCount'),
  progress: document.querySelector('#progressCount'),
  done: document.querySelector('#doneCount')
};

initialize();

function initialize() {
  bindEvents();
  applySavedTheme();
  loadTodos();
  loadGroupSummary();
}

function bindEvents() {
  todoForm.addEventListener('submit', handleSubmit);
  searchInput.addEventListener('input', debounce(refreshList, 250));
  filterStatus.addEventListener('change', refreshList);
  filterPriority.addEventListener('change', refreshList);
  dueDateInput.addEventListener('input', handleDueDateInput);
  dueDateInput.addEventListener('blur', normalizeDueDateField);
  dueDateButton.addEventListener('click', openDueDatePicker);
  dueDatePicker.addEventListener('change', syncDatePickerToInput);
  cancelEditButton.addEventListener('click', resetForm);
  refreshButton.addEventListener('click', async () => {
    await loadTodos();
    await loadGroupSummary();
    showFeedback('Data reloaded from the CSV file.');
  });
  themeToggle.addEventListener('click', toggleTheme);

  groupButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.groupBy = button.dataset.group;
      groupButtons.forEach((chip) => chip.classList.toggle('active', chip === button));
      loadGroupSummary();
    });
  });
}

async function loadTodos() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (filterStatus.value) params.set('status', filterStatus.value);
  if (filterPriority.value) params.set('priority', filterPriority.value);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/todos${query}`);
  const data = await response.json();

  state.items = data.items || [];
  renderSummary(data.summary || emptySummary());
  renderTodos();
}

async function loadGroupSummary() {
  const response = await fetch(`/api/todos/group?by=${encodeURIComponent(state.groupBy)}`);
  const data = await response.json();
  renderGroupResults(data.groups || []);
}

function renderTodos() {
  todoList.innerHTML = '';

  if (!state.items.length) {
    todoList.innerHTML = '<article class="todo-card"><h4>No tasks to display</h4><p class="todo-description">Try creating a new task or adjusting the filters.</p></article>';
    return;
  }

  state.items.forEach((item) => {
    const fragment = template.content.cloneNode(true);
    const title = fragment.querySelector('.todo-title');
    const description = fragment.querySelector('.todo-description');
    const statusBadge = fragment.querySelector('.status-badge');
    const meta = fragment.querySelector('.todo-meta');
    const editButton = fragment.querySelector('.edit-button');
    const deleteButton = fragment.querySelector('.delete-button');

    title.textContent = item.title;
    description.textContent = item.description || 'No description';
    statusBadge.textContent = formatStatus(item.status);
    statusBadge.classList.add(item.status);

    meta.innerHTML = [
      `<span>Priority: ${formatPriority(item.priority)}</span>`,
      `<span>Category: ${item.category || 'General'}</span>`,
      `<span>Due: ${formatDate(item.dueDate)}</span>`
    ].join('');

    editButton.addEventListener('click', () => startEdit(item));
    deleteButton.addEventListener('click', () => removeTodo(item.id));
    todoList.appendChild(fragment);
  });
}

function renderSummary(summary) {
  counters.total.textContent = summary.total || 0;
  counters.pending.textContent = summary.pending || 0;
  counters.progress.textContent = summary.inProgress || 0;
  counters.done.textContent = summary.done || 0;
}

function renderGroupResults(groups) {
  groupResults.innerHTML = '';

  if (!groups.length) {
    groupResults.innerHTML = '<span class="group-pill">No data to group</span>';
    return;
  }

  groups.forEach((group) => {
    const pill = document.createElement('span');
    pill.className = 'group-pill';
    const toneClass = getToneClass(state.groupBy, group.value);
    if (toneClass) {
      pill.classList.add(toneClass);
    }
    pill.textContent = `${formatGroupValue(state.groupBy, group.value)}: ${group.total}`;
    groupResults.appendChild(pill);
  });

}

async function handleSubmit(event) {
  event.preventDefault();

  const dueDateValidation = validateDueDateField();
  if (!dueDateValidation.valid) {
    showDueDateError(dueDateValidation.message);
    dueDateInput.focus();
    return;
  }

  const payload = {
    title: titleInput.value,
    description: descriptionInput.value,
    status: statusInput.value,
    priority: priorityInput.value,
    category: categoryInput.value,
    dueDate: parseInputDateToIso(dueDateInput.value)
  };

  const isEditing = Boolean(state.editingId);
  const url = isEditing ? `/api/todos/${state.editingId}` : '/api/todos';
  const method = isEditing ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    showFeedback(result.error || 'The task could not be saved.', true);
    return;
  }

  showFeedback(isEditing ? 'Task updated successfully.' : 'Task created successfully.');
  resetForm();
  await loadTodos();
  await loadGroupSummary();
}

function startEdit(item) {
  state.editingId = item.id;
  titleInput.value = item.title;
  descriptionInput.value = item.description;
  statusInput.value = item.status;
  priorityInput.value = item.priority;
  categoryInput.value = item.category;
  dueDateInput.value = formatDateForInput(item.dueDate);
  dueDatePicker.value = item.dueDate || '';
  clearDueDateError();
  formTitle.textContent = 'Edit task';
  submitButton.textContent = 'Update task';
  cancelEditButton.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function removeTodo(id) {
  const confirmed = window.confirm('This action will remove the task from the CSV file. Do you want to continue?');
  if (!confirmed) return;

  const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
  const result = await response.json();

  if (!response.ok) {
    showFeedback(result.error || 'The task could not be deleted.', true);
    return;
  }

  if (state.editingId === id) {
    resetForm();
  }

  showFeedback('Task deleted successfully.');
  await loadTodos();
  await loadGroupSummary();
}

function resetForm() {
  state.editingId = null;
  todoForm.reset();
  dueDateInput.value = '';
  dueDatePicker.value = '';
  clearDueDateError();
  formTitle.textContent = 'New task';
  submitButton.textContent = 'Save task';
  cancelEditButton.classList.add('hidden');
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('todo-theme', isLight ? 'light' : 'dark');
  updateThemeLabel(isLight ? 'light' : 'dark');
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem('todo-theme') || 'dark';
  document.body.classList.toggle('light', savedTheme === 'light');
  updateThemeLabel(savedTheme);
}

function updateThemeLabel(theme) {
  themeLabel.textContent = theme === 'light' ? 'Light' : 'Dark';
}

function showFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.remove('hidden');
  feedback.style.background = isError ? 'rgba(255, 125, 125, 0.12)' : 'rgba(89, 216, 161, 0.12)';
  feedback.style.color = isError ? 'var(--danger)' : 'var(--success)';

  window.clearTimeout(showFeedback.timer);
  showFeedback.timer = window.setTimeout(() => {
    feedback.classList.add('hidden');
  }, 2600);
}

function refreshList() {
  loadTodos();
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

function formatStatus(status) {
  return {
    pending: 'Pending',
    in_progress: 'In progress',
    done: 'Completed'
  }[status] || status;
}

function formatPriority(priority) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[priority] || priority;
}

function formatGroupValue(groupBy, value) {
  if (groupBy === 'status') {
    return formatStatus(value);
  }

  if (groupBy === 'priority') {
    return formatPriority(value);
  }

  return value || 'No value';
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'No due date';
  }

  const safeDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(safeDate.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(safeDate);
}

function formatDateForInput(dateValue) {
  if (!dateValue) {
    return '';
  }

  const [year, month, day] = dateValue.split('-');
  if (!year || !month || !day) {
    return dateValue;
  }

  return `${day}/${month}/${year}`;
}

function parseInputDateToIso(value) {
  if (!value) {
    return '';
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) {
    return '';
  }

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const iso = `${year}-${month}-${day}`;
  const safeDate = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(safeDate.getTime())) {
    return '';
  }

  if (
    safeDate.getUTCFullYear() !== Number(year) ||
    safeDate.getUTCMonth() + 1 !== Number(month) ||
    safeDate.getUTCDate() !== Number(day)
  ) {
    return '';
  }

  return iso;
}

function handleDueDateInput(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
  const parts = [];

  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));

  event.target.value = parts.join('/');
  validateDueDateField();
}

function normalizeDueDateField() {
  const validation = validateDueDateField();
  const isoDate = validation.valid ? parseInputDateToIso(dueDateInput.value) : '';
  dueDateInput.value = isoDate ? formatDateForInput(isoDate) : dueDateInput.value;
  dueDatePicker.value = isoDate || '';
}

function getToneClass(groupBy, value) {
  if (groupBy !== 'status') {
    return '';
  }

  if (value === 'pending') return 'pending';
  if (value === 'in_progress') return 'in_progress';
  if (value === 'done') return 'done';
  return '';
}

function openDueDatePicker() {
  const currentIsoDate = parseInputDateToIso(dueDateInput.value);
  dueDatePicker.value = currentIsoDate || dueDatePicker.value || '';

  if (typeof dueDatePicker.showPicker === 'function') {
    dueDatePicker.showPicker();
    return;
  }

  dueDatePicker.focus();
  dueDatePicker.click();
}

function syncDatePickerToInput() {
  dueDateInput.value = formatDateForInput(dueDatePicker.value);
  clearDueDateError();
}

function validateDueDateField() {
  const rawValue = dueDateInput.value.trim();
  if (!rawValue) {
    clearDueDateError();
    return { valid: true, message: '' };
  }

  const digits = rawValue.replace(/\D/g, '');
  if (digits.length < 8) {
    const message = 'Complete the date using the DD/MM/YYYY format.';
    showDueDateError(message);
    return { valid: false, message };
  }

  const isoDate = parseInputDateToIso(rawValue);
  if (!isoDate) {
    const message = 'That date does not exist. Check the day, month, and year.';
    showDueDateError(message);
    return { valid: false, message };
  }

  clearDueDateError();
  return { valid: true, message: '' };
}

function showDueDateError(message) {
  dueDateInput.setAttribute('aria-invalid', 'true');
  dueDateInput.parentElement.classList.add('is-invalid');
  dueDateError.textContent = message;
  dueDateError.classList.remove('hidden');
}

function clearDueDateError() {
  dueDateInput.removeAttribute('aria-invalid');
  dueDateInput.parentElement.classList.remove('is-invalid');
  dueDateError.textContent = '';
  dueDateError.classList.add('hidden');
}


function emptySummary() {
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    done: 0
  };
}
