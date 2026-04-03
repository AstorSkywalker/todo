const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-app-tests-'));
process.env.TODO_DATA_DIR = tempRoot;
process.env.TODO_DATA_FILE = path.join(tempRoot, 'todos.csv');
process.env.TODO_DB_FILE = path.join(tempRoot, 'todos.db');
process.env.PORT = '0';

const { closeSqlite, syncTodosToSqlite, getSqliteSummary } = require('../sqliteService');
const {
  buildCsvContent,
  normalizeImportedTodos,
  parseCsvLine,
  startServer,
  validateTodo
} = require('../server');

let server;
let baseUrl;
let failures = 0;

function resetStorage(seedItems = []) {
  fs.mkdirSync(tempRoot, { recursive: true });
  fs.writeFileSync(process.env.TODO_DATA_FILE, buildCsvContent(seedItems), 'utf8');
  syncTodosToSqlite(seedItems);
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  return { response, data };
}

async function seedTasks(items) {
  for (const item of items) {
    const { response } = await requestJson(`${baseUrl}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });

    assert.equal(response.status, 201);
  }
}

async function runTest(name, fn) {
  try {
    resetStorage();
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message || String(error));
  }
}

async function main() {
  resetStorage();
  server = await startServer(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await runTest('parseCsvLine handles commas and escaped quotes correctly', async () => {
    const line = '"123","Review CSV escaping","Validate ""quoted"" values, commas","pending","high","Backend","2026-04-15","2026-04-03T10:00:00.000Z","2026-04-03T10:00:00.000Z"';
    const values = parseCsvLine(line);

    assert.equal(values[0], '123');
    assert.equal(values[1], 'Review CSV escaping');
    assert.equal(values[2], 'Validate "quoted" values, commas');
    assert.equal(values[6], '2026-04-15');
  });

  await runTest('validateTodo enforces required title and valid enums/date', async () => {
    assert.equal(validateTodo({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      category: 'General',
      dueDate: '2026-04-12'
    }), 'Title is required.');

    assert.equal(validateTodo({
      title: 'Bad date',
      description: '',
      status: 'pending',
      priority: 'medium',
      category: 'General',
      dueDate: '2026-02-31'
    }), 'Due date must be a valid date in YYYY-MM-DD format.');

    assert.equal(validateTodo({
      title: 'Bad status',
      description: '',
      status: 'started',
      priority: 'medium',
      category: 'General',
      dueDate: '2026-04-12'
    }), 'Status must be pending, in_progress, or done.');

    assert.equal(validateTodo({
      title: 'Looks good',
      description: '',
      status: 'done',
      priority: 'high',
      category: 'General',
      dueDate: '2026-04-12'
    }), null);
  });

  await runTest('normalizeImportedTodos deduplicates ids and preserves valid dates', async () => {
    const existing = [{
      id: '123',
      title: 'Existing',
      description: '',
      status: 'pending',
      priority: 'medium',
      category: 'General',
      dueDate: '2026-04-10',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z'
    }];

    const normalized = normalizeImportedTodos([{
      id: '123',
      title: 'Imported',
      description: 'Needs a new id',
      status: 'in_progress',
      priority: 'high',
      category: 'API',
      dueDate: '2026-04-21'
    }], existing);

    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].title, 'Imported');
    assert.notEqual(normalized[0].id, '123');
    assert.equal(normalized[0].dueDate, '2026-04-21');
  });

  await runTest('CRUD API flow works end-to-end', async () => {
    const createPayload = {
      title: 'Write backend tests',
      description: 'Cover CRUD and imports',
      status: 'pending',
      priority: 'high',
      category: 'QA',
      dueDate: '2026-04-18'
    };

    const created = await requestJson(`${baseUrl}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.data.title, createPayload.title);

    const listAfterCreate = await requestJson(`${baseUrl}/api/todos`);
    assert.equal(listAfterCreate.response.status, 200);
    assert.equal(listAfterCreate.data.items.length, 1);

    const updatePayload = {
      ...createPayload,
      status: 'done',
      priority: 'medium'
    };

    const updated = await requestJson(`${baseUrl}/api/todos/${created.data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.data.status, 'done');
    assert.equal(updated.data.priority, 'medium');

    const deleted = await requestJson(`${baseUrl}/api/todos/${created.data.id}`, {
      method: 'DELETE'
    });

    assert.equal(deleted.response.status, 200);

    const listAfterDelete = await requestJson(`${baseUrl}/api/todos`);
    assert.equal(listAfterDelete.data.items.length, 0);
  });

  await runTest('storage endpoint stays in sync with CSV and SQLite totals', async () => {
    const payloads = [
      {
        title: 'Task one',
        description: '',
        status: 'pending',
        priority: 'low',
        category: 'Planning',
        dueDate: '2026-04-11'
      },
      {
        title: 'Task two',
        description: '',
        status: 'in_progress',
        priority: 'high',
        category: 'Backend',
        dueDate: '2026-04-12'
      }
    ];

    await seedTasks(payloads);

    const storage = await requestJson(`${baseUrl}/api/todos/storage`);
    assert.equal(storage.response.status, 200);
    assert.equal(storage.data.csv.total, 2);
    assert.equal(storage.data.sqlite.total, 2);
    assert.ok(storage.data.sqlite.lastSyncAt);

    const sqliteSummary = getSqliteSummary();
    assert.equal(sqliteSummary.total, 2);
  });

  await runTest('import and export endpoints handle JSON payloads', async () => {
    const importBody = {
      format: 'json',
      mode: 'replace',
      content: JSON.stringify({
        items: [
          {
            title: 'Imported one',
            description: 'From JSON import',
            status: 'pending',
            priority: 'medium',
            category: 'Docs',
            dueDate: '2026-04-13'
          },
          {
            title: 'Imported two',
            description: 'From JSON import',
            status: 'done',
            priority: 'low',
            category: 'QA',
            dueDate: '2026-04-14'
          }
        ]
      })
    };

    const imported = await requestJson(`${baseUrl}/api/todos/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importBody)
    });

    assert.equal(imported.response.status, 200);
    assert.equal(imported.data.imported, 2);

    const exported = await fetch(`${baseUrl}/api/todos/export?format=json`);
    const exportedBody = await exported.json();

    assert.equal(exported.status, 200);
    assert.equal(exportedBody.items.length, 2);
    assert.equal(exportedBody.items[0].title, 'Imported one');
  });

  await runTest('grouping endpoint returns grouped totals and rejects invalid groups', async () => {
    await seedTasks([
      {
        title: 'API docs',
        description: '',
        status: 'pending',
        priority: 'medium',
        category: 'Docs',
        dueDate: '2026-04-13'
      },
      {
        title: 'Ship API',
        description: '',
        status: 'in_progress',
        priority: 'high',
        category: 'Backend',
        dueDate: '2026-04-14'
      },
      {
        title: 'Retrospective',
        description: '',
        status: 'pending',
        priority: 'low',
        category: 'Docs',
        dueDate: '2026-04-15'
      }
    ]);

    const grouped = await requestJson(`${baseUrl}/api/todos/group?by=category`);
    assert.equal(grouped.response.status, 200);
    const docsGroup = grouped.data.groups.find((group) => group.value === 'Docs');
    const backendGroup = grouped.data.groups.find((group) => group.value === 'Backend');
    assert.equal(docsGroup.total, 2);
    assert.equal(backendGroup.total, 1);

    const invalid = await requestJson(`${baseUrl}/api/todos/group?by=owner`);
    assert.equal(invalid.response.status, 400);
    assert.match(invalid.data.error, /Invalid by parameter/i);
  });

  await runTest('list endpoint filters by search, status, priority, and category', async () => {
    await seedTasks([
      {
        title: 'Review keyboard flow',
        description: 'Accessibility pass',
        status: 'in_progress',
        priority: 'high',
        category: 'Accessibility',
        dueDate: '2026-04-18'
      },
      {
        title: 'Publish release notes',
        description: 'Docs for rollout',
        status: 'pending',
        priority: 'medium',
        category: 'Docs',
        dueDate: '2026-04-19'
      },
      {
        title: 'Fix CSV export',
        description: 'Backend bugfix',
        status: 'done',
        priority: 'high',
        category: 'Backend',
        dueDate: '2026-04-20'
      }
    ]);

    const bySearch = await requestJson(`${baseUrl}/api/todos?search=keyboard`);
    assert.equal(bySearch.response.status, 200);
    assert.equal(bySearch.data.items.length, 1);
    assert.equal(bySearch.data.items[0].category, 'Accessibility');

    const byStatusPriority = await requestJson(`${baseUrl}/api/todos?status=in_progress&priority=high`);
    assert.equal(byStatusPriority.response.status, 200);
    assert.equal(byStatusPriority.data.items.length, 1);
    assert.equal(byStatusPriority.data.items[0].title, 'Review keyboard flow');

    const byCategory = await requestJson(`${baseUrl}/api/todos?category=Docs`);
    assert.equal(byCategory.response.status, 200);
    assert.equal(byCategory.data.items.length, 1);
    assert.equal(byCategory.data.items[0].title, 'Publish release notes');
  });

  await runTest('API returns expected errors for invalid requests', async () => {
    const invalidCreate = await requestJson(`${baseUrl}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Broken status',
        description: '',
        status: 'started',
        priority: 'medium',
        category: 'QA',
        dueDate: '2026-04-18'
      })
    });
    assert.equal(invalidCreate.response.status, 400);

    const missingUpdate = await requestJson(`${baseUrl}/api/todos/not-found-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Does not exist',
        description: '',
        status: 'pending',
        priority: 'low',
        category: 'General',
        dueDate: '2026-04-18'
      })
    });
    assert.equal(missingUpdate.response.status, 404);

    const missingDelete = await requestJson(`${baseUrl}/api/todos/not-found-id`, {
      method: 'DELETE'
    });
    assert.equal(missingDelete.response.status, 404);

    const invalidImport = await requestJson(`${baseUrl}/api/todos/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'xml',
        mode: 'append',
        content: '<todos />'
      })
    });
    assert.equal(invalidImport.response.status, 400);

    const invalidExport = await requestJson(`${baseUrl}/api/todos/export?format=xml`);
    assert.equal(invalidExport.response.status, 400);
  });

  await runTest('CSV import/export preserves quoted text and commas', async () => {
    const csvContent = [
      'id,title,description,status,priority,category,dueDate,createdAt,updatedAt',
      'abc123,"Quoted task","Keep ""quoted"" values, commas, and notes",pending,high,Backend,2026-04-22,2026-04-03T10:00:00.000Z,2026-04-03T10:00:00.000Z'
    ].join('\n');

    const imported = await requestJson(`${baseUrl}/api/todos/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        mode: 'replace',
        content: csvContent
      })
    });

    assert.equal(imported.response.status, 200);
    assert.equal(imported.data.imported, 1);

    const exported = await fetch(`${baseUrl}/api/todos/export?format=csv`);
    const exportedBody = await exported.text();

    assert.equal(exported.status, 200);
    assert.match(exportedBody, /"Keep ""quoted"" values, commas, and notes"/);
    assert.match(exportedBody, /abc123,Quoted task,/);
  });

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  closeSqlite();
  fs.rmSync(tempRoot, { recursive: true, force: true });

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('All automated tests passed.');
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  if (server) {
    server.close(() => {
      closeSqlite();
      fs.rmSync(tempRoot, { recursive: true, force: true });
      process.exit(1);
    });
    return;
  }

  closeSqlite();
  fs.rmSync(tempRoot, { recursive: true, force: true });
  process.exit(1);
});
