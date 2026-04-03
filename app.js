const state = {
  items: [],
  editingId: null,
  groupBy: 'status',
  sortBy: 'newest'
};

const todoForm = document.querySelector('#todoForm');
const titleInput = document.querySelector('#title');
const titleError = document.querySelector('#titleError');
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
const filterCategory = document.querySelector('#filterCategory');
const overdueOnly = document.querySelector('#overdueOnly');
const dueTodayOnly = document.querySelector('#dueTodayOnly');
const dueSoonOnly = document.querySelector('#dueSoonOnly');
const sortTasks = document.querySelector('#sortTasks');
const todoList = document.querySelector('#todoList');
const activeFilters = document.querySelector('#activeFilters');
const visibleCount = document.querySelector('#visibleCount');
const activeFilterCount = document.querySelector('#activeFilterCount');
const feedback = document.querySelector('#feedback');
const formTitle = document.querySelector('#formTitle');
const submitButton = document.querySelector('#submitButton');
const cancelEditButton = document.querySelector('#cancelEditButton');
const refreshButton = document.querySelector('#refreshButton');
const importMode = document.querySelector('#importMode');
const importButton = document.querySelector('#importButton');
const exportCsvButton = document.querySelector('#exportCsvButton');
const exportJsonButton = document.querySelector('#exportJsonButton');
const importFileInput = document.querySelector('#importFileInput');
const themeToggle = document.querySelector('#themeToggle');
const themeLabel = document.querySelector('#themeLabel');
const template = document.querySelector('#todoCardTemplate');
const groupButtons = Array.from(document.querySelectorAll('[data-group]'));
const groupResults = document.querySelector('#groupResults');
const confirmModal = document.querySelector('#confirmModal');
const confirmCancel = document.querySelector('#confirmCancel');
const confirmAccept = document.querySelector('#confirmAccept');
const confirmTaskName = document.querySelector('#confirmTaskName');
const modalCloseDelay = 180;
const csvCount = document.querySelector('#csvCount');
const sqliteCount = document.querySelector('#sqliteCount');
const storageNote = document.querySelector('#storageNote');
const storageTimestamp = document.querySelector('#storageTimestamp');
const listPreferencesKey = 'todo-list-preferences';

let pendingDeleteId = null;
let pendingDeleteTitle = '';
let modalCloseTimer = null;
let lastFocusedElement = null;

const counters = {
  total: document.querySelector('#totalCount'),
  pending: document.querySelector('#pendingCount'),
  progress: document.querySelector('#progressCount'),
  done: document.querySelector('#doneCount')
};

initialize();

function initialize() {
  restoreListPreferences();
  bindEvents();
  applySavedTheme();
  loadTodos();
  loadGroupSummary();
  loadCategoryOptions();
  loadStorageStatus();
}

function bindEvents() {
  todoForm.addEventListener('submit', handleSubmit);
  searchInput.addEventListener('input', debounce(refreshList, 250));
  filterStatus.addEventListener('change', refreshList);
  filterPriority.addEventListener('change', refreshList);
  filterCategory.addEventListener('change', refreshList);
  overdueOnly.addEventListener('change', refreshList);
  dueTodayOnly.addEventListener('change', refreshList);
  dueSoonOnly.addEventListener('change', refreshList);
  sortTasks.addEventListener('change', handleSortChange);
  titleInput.addEventListener('input', validateTitleField);
  titleInput.addEventListener('blur', validateTitleField);
  dueDateInput.addEventListener('input', handleDueDateInput);
  dueDateInput.addEventListener('blur', normalizeDueDateField);
  dueDateButton.addEventListener('click', openDueDatePicker);
  dueDatePicker.addEventListener('change', syncDatePickerToInput);
  cancelEditButton.addEventListener('click', resetForm);
  importButton.addEventListener('click', openImportPicker);
  exportCsvButton.addEventListener('click', () => exportTodos('csv'));
  exportJsonButton.addEventListener('click', () => exportTodos('json'));
  importFileInput.addEventListener('change', handleImportFile);
  confirmCancel.addEventListener('click', closeDeleteModal);
  confirmAccept.addEventListener('click', confirmDeleteTask);
  confirmModal.addEventListener('click', handleModalBackdropClick);
  document.addEventListener('keydown', handleGlobalKeydown);
  refreshButton.addEventListener('click', async () => {
    await loadTodos();
    await loadGroupSummary();
    await loadCategoryOptions();
    await loadStorageStatus();
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
  if (filterCategory.value) params.set('category', filterCategory.value);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`/api/todos${query}`);
  const data = await response.json();

  const filteredItems = applyQuickFilters(data.items || []);

  state.items = sortTodoItems(filteredItems);
  renderSummary(data.summary || emptySummary());
  renderActiveFilters();
  renderResultsStrip();
  renderTodos();
}

async function loadGroupSummary() {
  const response = await fetch(`/api/todos/group?by=${encodeURIComponent(state.groupBy)}`);
  const data = await response.json();
  renderGroupResults(data.groups || []);
}

async function loadCategoryOptions() {
  const currentValue = filterCategory.value || filterCategory.dataset.savedValue || '';
  const response = await fetch('/api/todos/group?by=category');
  const data = await response.json();
  const categories = (data.groups || [])
    .map((group) => group.value)
    .filter(Boolean)
    .sort((left, right) => compareText(left, right));

  filterCategory.innerHTML = '<option value="">All categories</option>';

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    filterCategory.appendChild(option);
  });

  if (categories.includes(currentValue)) {
    filterCategory.value = currentValue;
  }

  delete filterCategory.dataset.savedValue;
}

async function loadStorageStatus() {
  const response = await fetch('/api/todos/storage');
  const data = await response.json();

  csvCount.textContent = data.csv?.total ?? 0;
  sqliteCount.textContent = data.sqlite?.total ?? 0;

  if (data.csv?.total === data.sqlite?.total) {
    storageNote.textContent = 'CSV and SQLite are currently in sync.';
  } else {
    storageNote.textContent = 'CSV and SQLite counts differ. A sync check may be needed.';
  }

  storageTimestamp.textContent = data.sqlite?.lastSyncAt
    ? `Last sync: ${formatDateTime(data.sqlite.lastSyncAt)}`
    : 'Last sync: not available yet.';
}

function renderTodos() {
  todoList.innerHTML = '';

  if (!state.items.length) {
    todoList.innerHTML = '<article class="todo-card"><h4>No tasks to display</h4><p class="todo-description">Try creating a new task or adjusting the filters.</p></article>';
    return;
  }

  state.items.forEach((item) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.todo-card');
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
    const dueState = getDueState(item);
    if (dueState.cardClass) {
      card.classList.add(dueState.cardClass);
    }

    const metaParts = [
      `<span>Priority: ${formatPriority(item.priority)}</span>`,
      `<span>Category: ${item.category || 'General'}</span>`,
      `<span>Due: ${formatDate(item.dueDate)}</span>`
    ];

    if (dueState.label) {
      metaParts.push(`<span class="due-pill ${dueState.toneClass}">${dueState.label}</span>`);
    }

    meta.innerHTML = metaParts.join('');

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

  const titleValidation = validateTitleField();
  const dueDateValidation = validateDueDateField();
  if (!titleValidation.valid) {
    showTitleError(titleValidation.message);
    titleInput.focus();
    return;
  }

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
  await loadCategoryOptions();
  await loadStorageStatus();
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
  clearTitleError();
  clearDueDateError();
  formTitle.textContent = 'Edit task';
  submitButton.textContent = 'Update task';
  cancelEditButton.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function removeTodo(id) {
  pendingDeleteId = id;
  pendingDeleteTitle = state.items.find((item) => item.id === id)?.title || 'Untitled task';
  openDeleteModal();
}

async function confirmDeleteTask() {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  closeDeleteModal({ restoreFocus: false });

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
  await loadCategoryOptions();
  await loadStorageStatus();
}

function openImportPicker() {
  importFileInput.value = '';
  importFileInput.click();
}

async function handleImportFile(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const format = inferImportFormat(file.name);
  if (!format) {
    showFeedback('Select a CSV or JSON file to import.', true);
    return;
  }

  const content = await file.text();
  const response = await fetch('/api/todos/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format,
      mode: importMode.value,
      content
    })
  });

  const result = await response.json();

  if (!response.ok) {
    showFeedback(result.error || 'The file could not be imported.', true);
    return;
  }

  showFeedback(result.message || 'Tasks imported successfully.');
  await loadTodos();
  await loadGroupSummary();
  await loadCategoryOptions();
  await loadStorageStatus();
}

async function exportTodos(format) {
  const response = await fetch(`/api/todos/export?format=${encodeURIComponent(format)}`);

  if (!response.ok) {
    showFeedback('The export could not be generated.', true);
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fileName = getDownloadFileName(response, format);

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetForm() {
  state.editingId = null;
  todoForm.reset();
  dueDateInput.value = '';
  dueDatePicker.value = '';
  clearTitleError();
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
  saveListPreferences();
  loadTodos();
}

function handleSortChange() {
  state.sortBy = sortTasks.value;
  saveListPreferences();
  state.items = sortTodoItems(state.items);
  renderTodos();
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

function sortTodoItems(items) {
  const priorityRank = { high: 3, medium: 2, low: 1 };
  const statusRank = { pending: 1, in_progress: 2, done: 3 };
  const sortedItems = [...items];

  sortedItems.sort((left, right) => {
    switch (state.sortBy) {
      case 'oldest':
        return compareDates(left.createdAt, right.createdAt);
      case 'due_soon':
        return compareDueDates(left.dueDate, right.dueDate);
      case 'due_late':
        return compareDueDates(right.dueDate, left.dueDate);
      case 'priority_high':
        return (priorityRank[right.priority] || 0) - (priorityRank[left.priority] || 0);
      case 'priority_low':
        return (priorityRank[left.priority] || 0) - (priorityRank[right.priority] || 0);
      case 'status':
        return (statusRank[left.status] || 99) - (statusRank[right.status] || 99) || compareText(left.title, right.title);
      case 'title':
        return compareText(left.title, right.title);
      case 'newest':
      default:
        return compareDates(right.createdAt, left.createdAt);
    }
  });

  return sortedItems;
}

function compareDates(left, right) {
  const leftValue = left ? new Date(left).getTime() : 0;
  const rightValue = right ? new Date(right).getTime() : 0;
  return leftValue - rightValue;
}

function compareDueDates(left, right) {
  const leftValue = left ? new Date(`${left}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  const rightValue = right ? new Date(`${right}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  return leftValue - rightValue;
}

function inferImportFormat(fileName = '') {
  const normalized = fileName.trim().toLowerCase();

  if (normalized.endsWith('.csv')) return 'csv';
  if (normalized.endsWith('.json')) return 'json';
  return '';
}

function getDownloadFileName(response, format) {
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename=\"([^\"]+)\"/i);

  if (match) {
    return match[1];
  }

  return `todos-export.${format}`;
}

function saveListPreferences() {
  const preferences = {
    search: searchInput.value,
    status: filterStatus.value,
    priority: filterPriority.value,
    category: filterCategory.value,
    overdueOnly: overdueOnly.checked,
    dueTodayOnly: dueTodayOnly.checked,
    dueSoonOnly: dueSoonOnly.checked,
    sortBy: sortTasks.value
  };

  localStorage.setItem(listPreferencesKey, JSON.stringify(preferences));
}

function restoreListPreferences() {
  const rawPreferences = localStorage.getItem(listPreferencesKey);
  if (!rawPreferences) {
    return;
  }

  try {
    const preferences = JSON.parse(rawPreferences);
    searchInput.value = preferences.search || '';
    filterStatus.value = preferences.status || '';
    filterPriority.value = preferences.priority || '';
    filterCategory.dataset.savedValue = preferences.category || '';
    overdueOnly.checked = Boolean(preferences.overdueOnly);
    dueTodayOnly.checked = Boolean(preferences.dueTodayOnly);
    dueSoonOnly.checked = Boolean(preferences.dueSoonOnly);
    sortTasks.value = preferences.sortBy || 'newest';
    state.sortBy = sortTasks.value;
  } catch (error) {
    localStorage.removeItem(listPreferencesKey);
  }
}

function applyQuickFilters(items) {
  const selectedTones = [];

  if (overdueOnly.checked) {
    selectedTones.push('overdue');
  }

  if (dueTodayOnly.checked) {
    selectedTones.push('due-today');
  }

  if (dueSoonOnly.checked) {
    selectedTones.push('due-soon');
  }

  if (!selectedTones.length) {
    return items;
  }

  return items.filter((item) => selectedTones.includes(getDueState(item).toneClass));
}

function renderActiveFilters() {
  const filters = [];

  if (searchInput.value.trim()) {
    filters.push({ key: 'search', label: `Search: ${searchInput.value.trim()}` });
  }

  if (filterStatus.value) {
    filters.push({ key: 'status', label: `Status: ${formatStatus(filterStatus.value)}` });
  }

  if (filterPriority.value) {
    filters.push({ key: 'priority', label: `Priority: ${formatPriority(filterPriority.value)}` });
  }

  if (filterCategory.value) {
    filters.push({ key: 'category', label: `Category: ${filterCategory.value}` });
  }

  if (overdueOnly.checked) {
    filters.push({ key: 'overdueOnly', label: 'Overdue' });
  }

  if (dueTodayOnly.checked) {
    filters.push({ key: 'dueTodayOnly', label: 'Due today' });
  }

  if (dueSoonOnly.checked) {
    filters.push({ key: 'dueSoonOnly', label: 'Due soon' });
  }

  if (sortTasks.value !== 'newest') {
    filters.push({ key: 'sortBy', label: `Sort: ${formatSortOption(sortTasks.value)}` });
  }

  if (!filters.length) {
    activeFilters.classList.add('hidden');
    activeFilters.innerHTML = '';
    return;
  }

  activeFilters.classList.remove('hidden');
  activeFilters.innerHTML = [
    ...filters.map((filter) => (
      `<button class="active-filter-pill" type="button" data-filter-key="${filter.key}" aria-label="Remove ${filter.label}"><span>${filter.label}</span><span class="filter-pill-close" aria-hidden="true">x</span></button>`
    )),
    '<button class="clear-filters-button" type="button" data-filter-key="clearAll">Clear all</button>'
  ].join('');
}

function renderResultsStrip() {
  visibleCount.textContent = state.items.length;
  activeFilterCount.textContent = getActiveFilterEntries().length;
}

function getActiveFilterEntries() {
  const filters = [];

  if (searchInput.value.trim()) {
    filters.push('search');
  }

  if (filterStatus.value) {
    filters.push('status');
  }

  if (filterPriority.value) {
    filters.push('priority');
  }

  if (filterCategory.value) {
    filters.push('category');
  }

  if (overdueOnly.checked) {
    filters.push('overdueOnly');
  }

  if (dueTodayOnly.checked) {
    filters.push('dueTodayOnly');
  }

  if (dueSoonOnly.checked) {
    filters.push('dueSoonOnly');
  }

  if (sortTasks.value !== 'newest') {
    filters.push('sortBy');
  }

  return filters;
}

activeFilters.addEventListener('click', handleActiveFilterClick);

function handleActiveFilterClick(event) {
  const button = event.target.closest('[data-filter-key]');
  if (!button) {
    return;
  }

  const { filterKey } = button.dataset;

  if (filterKey === 'clearAll') {
    clearAllFilters();
    return;
  }

  clearFilter(filterKey);
}

function clearFilter(filterKey) {
  switch (filterKey) {
    case 'search':
      searchInput.value = '';
      break;
    case 'status':
      filterStatus.value = '';
      break;
    case 'priority':
      filterPriority.value = '';
      break;
    case 'category':
      filterCategory.value = '';
      break;
    case 'overdueOnly':
      overdueOnly.checked = false;
      break;
    case 'dueTodayOnly':
      dueTodayOnly.checked = false;
      break;
    case 'dueSoonOnly':
      dueSoonOnly.checked = false;
      break;
    case 'sortBy':
      sortTasks.value = 'newest';
      state.sortBy = 'newest';
      break;
    default:
      return;
  }

  refreshList();
}

function clearAllFilters() {
  searchInput.value = '';
  filterStatus.value = '';
  filterPriority.value = '';
  filterCategory.value = '';
  overdueOnly.checked = false;
  dueTodayOnly.checked = false;
  dueSoonOnly.checked = false;
  sortTasks.value = 'newest';
  state.sortBy = 'newest';
  refreshList();
}

function compareText(left = '', right = '') {
  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

function getDueState(item) {
  if (!item.dueDate || item.status === 'done') {
    return { label: '', toneClass: '', cardClass: '' };
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(`${item.dueDate}T00:00:00`));
  const differenceInDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

  if (differenceInDays < 0) {
    return { label: 'Overdue', toneClass: 'overdue', cardClass: 'is-overdue' };
  }

  if (differenceInDays === 0) {
    return { label: 'Due today', toneClass: 'due-today', cardClass: 'is-due-today' };
  }

  if (differenceInDays <= 3) {
    return { label: 'Due soon', toneClass: 'due-soon', cardClass: 'is-due-soon' };
  }

  return { label: '', toneClass: '', cardClass: '' };
}

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatDateTime(dateValue) {
  const safeDate = new Date(dateValue);
  if (Number.isNaN(safeDate.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(safeDate);
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

function formatSortOption(sortValue) {
  return {
    newest: 'Newest first',
    oldest: 'Oldest first',
    due_soon: 'Due date, soonest first',
    due_late: 'Due date, latest first',
    priority_high: 'Priority, high to low',
    priority_low: 'Priority, low to high',
    status: 'Status',
    title: 'Title A-Z'
  }[sortValue] || sortValue;
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

function validateTitleField() {
  const rawValue = titleInput.value.trim();
  if (rawValue) {
    clearTitleError();
    return { valid: true, message: '' };
  }

  const message = 'Title is required.';
  showTitleError(message);
  return { valid: false, message };
}

function showTitleError(message) {
  titleInput.setAttribute('aria-invalid', 'true');
  titleInput.classList.add('field-input', 'is-invalid');
  titleError.textContent = message;
  titleError.classList.remove('hidden');
}

function clearTitleError() {
  titleInput.removeAttribute('aria-invalid');
  titleInput.classList.remove('field-input', 'is-invalid');
  titleError.textContent = '';
  titleError.classList.add('hidden');
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

function openDeleteModal() {
  window.clearTimeout(modalCloseTimer);
  lastFocusedElement = document.activeElement;
  confirmModal.classList.remove('hidden', 'is-closing');
  confirmTaskName.textContent = pendingDeleteTitle;
  confirmModal.setAttribute('aria-hidden', 'false');
  confirmAccept.textContent = `Delete "${pendingDeleteTitle}"`;
  document.body.style.overflow = 'hidden';
  confirmCancel.focus();
}

function closeDeleteModal({ restoreFocus = true } = {}) {
  if (confirmModal.classList.contains('hidden') || confirmModal.classList.contains('is-closing')) {
    return;
  }

  pendingDeleteId = null;
  pendingDeleteTitle = '';
  confirmModal.classList.add('is-closing');
  confirmModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  modalCloseTimer = window.setTimeout(() => {
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('is-closing');
    confirmTaskName.textContent = '';
    confirmAccept.textContent = 'Delete task';
    if (restoreFocus && lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }, modalCloseDelay);
}

function handleModalBackdropClick(event) {
  if (event.target === confirmModal) {
    closeDeleteModal();
  }
}

function handleGlobalKeydown(event) {
  if (confirmModal.classList.contains('hidden')) {
    return;
  }

  if (event.key === 'Escape') {
    closeDeleteModal();
    return;
  }

  if (event.key === 'Tab') {
    trapModalFocus(event);
  }
}

function trapModalFocus(event) {
  const focusableElements = Array.from(
    confirmModal.querySelectorAll('button:not([disabled])')
  );

  if (!focusableElements.length) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}


function emptySummary() {
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    done: 0
  };
}



