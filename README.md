# TaskFlow CSV

Modern To Do app with CSV persistence, light/dark mode, SQLite mirroring, and a simple CRUD API.

## Features

- Modern and responsive interface
- Light and dark themes
- Simple persistence in `data/todos.csv`
- SQLite mirror in `data/todos.db`
- REST API for creating, reading, updating, and deleting tasks
- Grouped summaries by status, priority, or category
- Sectioned dashboard with dedicated Filters, Grouping, and Tasks panels
- Active filter pills with one-click removal and a clear-all action
- Quick date filters for overdue, due today, and due soon tasks
- Dates displayed in Honduras-friendly `dd/mm/yyyy` format in the interface

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- CSV for local storage
- SQLite via `better-sqlite3`

## Project structure

- [index.html](c:\Users\Nelson\Documents\GitHub\todo\index.html): main UI structure
- [styles.css](c:\Users\Nelson\Documents\GitHub\todo\styles.css): themes, layout, and component styling
- [app.js](c:\Users\Nelson\Documents\GitHub\todo\app.js): frontend logic, rendering, and API integration
- [server.js](c:\Users\Nelson\Documents\GitHub\todo\server.js): HTTP server and CRUD API
- [data/todos.csv](c:\Users\Nelson\Documents\GitHub\todo\data\todos.csv): primary task storage
- [sqliteService.js](c:\Users\Nelson\Documents\GitHub\todo\sqliteService.js): SQLite setup and mirroring
- [package.json](c:\Users\Nelson\Documents\GitHub\todo\package.json): package metadata and start script

## Requirements

- Node.js 18 or newer recommended

## Run locally

1. Open a terminal in the project folder.
2. Run:

```bash
npm start
```

3. Open this URL in your browser:

```text
http://localhost:3000
```

## Dashboard layout

The main dashboard is organized into clear working sections:

- `Filters`: search, status, priority, category, sort order, and quick date filters
- `Grouping`: summary chips grouped by status, priority, or category
- `Tasks`: visible task count, active filter count, active filter pills, feedback, and task cards

This keeps filtering, analysis, and execution visually separated so the UI stays easier to scan as features grow.

## Data storage

Tasks are stored in:

```text
data/todos.csv
```

And mirrored to:

```text
data/todos.db
```

Current storage model:

- CSV is the primary source of truth
- SQLite is synchronized on server startup and every write operation
- Reads still come from the CSV for now

Each row uses this structure:

```text
id,title,description,status,priority,category,dueDate,createdAt,updatedAt
```

## REST API

Base URL:

```text
http://localhost:3000
```

### 1. List tasks

`GET /api/todos`

Example `curl`:

```bash
curl http://localhost:3000/api/todos
```

Response:

```json
{
  "items": [
    {
      "id": "1",
      "title": "Define scope",
      "description": "Outline the screens and initial CRUD flow",
      "status": "pending",
      "priority": "high",
      "category": "Planning",
      "dueDate": "2026-04-05",
      "createdAt": "2026-04-02T09:00:00.000Z",
      "updatedAt": "2026-04-02T09:00:00.000Z"
    }
  ],
  "summary": {
    "total": 1,
    "pending": 1,
    "inProgress": 0,
    "done": 0,
    "highPriority": 1
  }
}
```

Supported filters:

- `search`
- `status`
- `priority`
- `category`

The UI also includes client-side quick filters for:

- `Overdue`
- `Due today`
- `Due soon`

These quick filters can be combined, so for example you can view overdue and due-today tasks together.

Example:

```text
GET /api/todos?search=demo&status=pending&priority=high
```

Example `curl`:

```bash
curl "http://localhost:3000/api/todos?search=demo&status=pending&priority=high"
```

### 2. Get a task by id

`GET /api/todos/:id`

Example:

```text
GET /api/todos/1
```

Example `curl`:

```bash
curl http://localhost:3000/api/todos/1
```

### 3. Create a task

`POST /api/todos`

Body:

```json
{
  "title": "Prepare demo",
  "description": "Review UI and endpoints",
  "status": "pending",
  "priority": "medium",
  "category": "Frontend",
  "dueDate": "2026-04-12"
}
```

Example `curl`:

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Prepare demo\",\"description\":\"Review UI and endpoints\",\"status\":\"pending\",\"priority\":\"medium\",\"category\":\"Frontend\",\"dueDate\":\"2026-04-12\"}"
```

### 4. Update a task

`PUT /api/todos/:id`

Body:

```json
{
  "title": "Prepare final demo",
  "description": "Validate styling and CRUD flow",
  "status": "in_progress",
  "priority": "high",
  "category": "Frontend",
  "dueDate": "2026-04-14"
}
```

Example `curl`:

```bash
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Prepare final demo\",\"description\":\"Validate styling and CRUD flow\",\"status\":\"in_progress\",\"priority\":\"high\",\"category\":\"Frontend\",\"dueDate\":\"2026-04-14\"}"
```

### 5. Delete a task

`DELETE /api/todos/:id`

Example:

```text
DELETE /api/todos/1
```

Example `curl`:

```bash
curl -X DELETE http://localhost:3000/api/todos/1
```

### 6. Group results

`GET /api/todos/group?by=status`

Allowed values for `by`:

- `status`
- `priority`
- `category`

Example response:

```json
{
  "groupBy": "status",
  "groups": [
    { "value": "pending", "total": 3 },
    { "value": "in_progress", "total": 2 },
    { "value": "done", "total": 4 }
  ]
}
```

Example `curl`:

```bash
curl "http://localhost:3000/api/todos/group?by=status"
```

### 7. Export tasks

`GET /api/todos/export?format=csv`

`GET /api/todos/export?format=json`

Example `curl`:

```bash
curl -OJ "http://localhost:3000/api/todos/export?format=csv"
curl -OJ "http://localhost:3000/api/todos/export?format=json"
```

### 8. Import tasks

`POST /api/todos/import`

Body:

```json
{
  "format": "json",
  "mode": "append",
  "content": "[{\"title\":\"Imported task\",\"description\":\"Added from import\",\"status\":\"pending\",\"priority\":\"medium\",\"category\":\"Imported\",\"dueDate\":\"2026-04-25\"}]"
}
```

Allowed values:

- `format`: `csv` or `json`
- `mode`: `append` or `replace`

Example `curl`:

```bash
curl -X POST http://localhost:3000/api/todos/import \
  -H "Content-Type: application/json" \
  -d "{\"format\":\"json\",\"mode\":\"append\",\"content\":\"[{\\\"title\\\":\\\"Imported task\\\",\\\"description\\\":\\\"Added from import\\\",\\\"status\\\":\\\"pending\\\",\\\"priority\\\":\\\"medium\\\",\\\"category\\\":\\\"Imported\\\",\\\"dueDate\\\":\\\"2026-04-25\\\"}]\"}"
```

### 9. Storage status

`GET /api/todos/storage`

Returns the CSV file path and row count, plus the SQLite database path and row count.

Example `curl`:

```bash
curl http://localhost:3000/api/todos/storage
```

## Validation rules

- `title` is required
- `status` must be `pending`, `in_progress`, or `done`
- `priority` must be `low`, `medium`, or `high`

## Technical notes

- No Express is used
- The CSV file is parsed and rewritten directly from Node
- SQLite is mirrored locally through `better-sqlite3`
- Menus and date inputs adapt to light and dark themes
- The UI translates status and priority values into friendly labels

## Roadmap

- [x] Full CRUD for tasks
- [x] CSV persistence
- [x] Light and dark themes
- [x] Filtering and grouping
- [x] Basic API documentation
- [x] `curl` examples
- [x] Visual validation for invalid dates
- [ ] Auto-refresh when the CSV changes
- [ ] Swagger / OpenAPI
- [ ] Import and export tasks
- [ ] Automated tests
- [ ] Optional migration to SQLite

## Possible improvements

- Add Swagger or OpenAPI documentation for the API
- Detect CSV file changes in real time
- Add CSV import/export
- Highlight overdue or upcoming tasks
- Add authentication
- Add automated tests
- Migrate from CSV to SQLite if the project grows

## License

This project may be distributed under the MIT license.
