# TaskFlow CSV

TaskFlow CSV is a modern task management application built with vanilla HTML, CSS, JavaScript, and Node.js. It combines a polished dashboard UI with a lightweight backend, CSV persistence, SQLite mirroring, automated tests, and interactive Swagger/OpenAPI documentation.

## Overview

The project started as a CSV-based To Do application and evolved into a richer full-stack app with:

- a responsive dashboard interface
- light and dark mode
- multiple saved color schemes
- card and compact table-like task views
- CSV as the primary storage layer
- SQLite as a synchronized mirror
- a modular backend architecture
- import/export support
- automated backend tests
- OpenAPI documentation with Swagger UI

## Key URLs

Run the app locally with `npm start`, then open:

- App: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`
- Todos API: `http://localhost:3000/api/todos`
- Storage status API: `http://localhost:3000/api/todos/storage`

## Main Features

### Dashboard and UI

- Modern responsive dashboard layout
- Light and dark theme toggle
- Multiple color schemes saved in the browser
- Task cards view
- Compact table-like view
- Comfortable and dense display modes
- Collapsible dashboard sections for filters, grouping, and chart
- Active filter pills with one-click removal
- Custom themed delete confirmation modal

### Task management

- Create tasks
- Read tasks
- Update tasks
- Delete tasks
- Group tasks by status, priority, or category
- Sort tasks by title, due date, priority, status, category, flag, and created date
- Filter tasks by search, status, priority, category, due-state pills, and due date range

### Date handling

- Honduras-style `DD/MM/YYYY` display in the interface
- Masked date inputs with `DD/MM/YYYY`
- Native calendar picker button integrated into the masked inputs
- Validation for impossible dates such as `31/02/2026`
- Visual highlighting for:
  - overdue tasks
  - due today tasks
  - due soon tasks

### Storage

- Primary storage in `data/todos.csv`
- Mirrored SQLite storage in `data/todos.db`
- Storage status panel showing CSV and SQLite totals
- Sync timestamp returned by the API

### Import and export

- Export to CSV
- Export to JSON
- Import from CSV
- Import from JSON
- Import modes:
  - append
  - replace all

### API documentation and testing

- OpenAPI 3.0 spec in `openapi.json`
- Interactive Swagger UI at `/docs`
- Automated backend test suite
- Expanded API coverage including validation, CRUD, grouping, filtering, storage sync, and import/export scenarios

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- SQLite via `better-sqlite3`
- CSV for primary persistence
- Swagger UI via CDN
- OpenAPI 3.0

## Project Structure

- [index.html](c:\Users\Nelson\Documents\GitHub\todo\index.html): main dashboard markup
- [styles.css](c:\Users\Nelson\Documents\GitHub\todo\styles.css): theming, layout, and component styling
- [app.js](c:\Users\Nelson\Documents\GitHub\todo\app.js): frontend state, rendering, filtering, sorting, charting, and interactions
- [server.js](c:\Users\Nelson\Documents\GitHub\todo\server.js): server startup and static file serving
- [routes/todos.js](c:\Users\Nelson\Documents\GitHub\todo\routes\todos.js): `/api/todos` route handling
- [services/csvService.js](c:\Users\Nelson\Documents\GitHub\todo\services\csvService.js): CSV file management and parsing
- [services/todoService.js](c:\Users\Nelson\Documents\GitHub\todo\services\todoService.js): business logic for CRUD, grouping, import/export, and storage status
- [utils/http.js](c:\Users\Nelson\Documents\GitHub\todo\utils\http.js): shared HTTP helpers
- [utils/validation.js](c:\Users\Nelson\Documents\GitHub\todo\utils\validation.js): payload normalization and validation helpers
- [sqliteService.js](c:\Users\Nelson\Documents\GitHub\todo\sqliteService.js): SQLite initialization and sync support
- [data/todos.csv](c:\Users\Nelson\Documents\GitHub\todo\data\todos.csv): primary data store
- [openapi.json](c:\Users\Nelson\Documents\GitHub\todo\openapi.json): OpenAPI specification
- [docs.html](c:\Users\Nelson\Documents\GitHub\todo\docs.html): Swagger UI page
- [scripts/run-tests.js](c:\Users\Nelson\Documents\GitHub\todo\scripts\run-tests.js): automated backend test runner
- [package.json](c:\Users\Nelson\Documents\GitHub\todo\package.json): scripts and package metadata

## Requirements

- Node.js 18 or newer recommended

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm start
```

### 3. Open the browser

- Main app: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`

## Running Tests

Run the backend test suite with:

```bash
node scripts/run-tests.js
```

If you prefer package scripts:

```bash
npm.cmd test
```

Note for Windows PowerShell: `npm test` may be blocked by execution policy on some machines, so `npm.cmd test` or `node scripts/run-tests.js` is the safest option.

## Storage Model

The current storage strategy is:

- CSV is the primary source of truth
- SQLite is synchronized on server startup and on every write operation
- Reads still come from CSV for now

CSV row format:

```text
id,title,description,status,priority,category,dueDate,createdAt,updatedAt
```

## REST API

Base URL:

```text
http://localhost:3000
```

### `GET /api/todos`

Returns the task list plus a summary object.

Supported server-side query parameters:

- `search`
- `status`
- `priority`
- `category`

Example:

```bash
curl "http://localhost:3000/api/todos?search=demo&status=pending&priority=high"
```

### `GET /api/todos/:id`

Returns a single task by id.

Example:

```bash
curl http://localhost:3000/api/todos/1
```

### `POST /api/todos`

Creates a new task.

Example:

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Prepare demo\",\"description\":\"Review UI and endpoints\",\"status\":\"pending\",\"priority\":\"medium\",\"category\":\"Frontend\",\"dueDate\":\"2026-04-12\"}"
```

### `PUT /api/todos/:id`

Updates an existing task.

Example:

```bash
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Prepare final demo\",\"description\":\"Validate styling and CRUD flow\",\"status\":\"in_progress\",\"priority\":\"high\",\"category\":\"Frontend\",\"dueDate\":\"2026-04-14\"}"
```

### `DELETE /api/todos/:id`

Deletes a task.

Example:

```bash
curl -X DELETE http://localhost:3000/api/todos/1
```

### `GET /api/todos/group?by=status`

Groups tasks by one of the allowed fields.

Allowed values for `by`:

- `status`
- `priority`
- `category`

Example:

```bash
curl "http://localhost:3000/api/todos/group?by=status"
```

### `GET /api/todos/export?format=csv`
### `GET /api/todos/export?format=json`

Exports the current task dataset.

Example:

```bash
curl -OJ "http://localhost:3000/api/todos/export?format=csv"
curl -OJ "http://localhost:3000/api/todos/export?format=json"
```

### `POST /api/todos/import`

Imports tasks into the system.

Allowed values:

- `format`: `csv` or `json`
- `mode`: `append` or `replace`

Example:

```bash
curl -X POST http://localhost:3000/api/todos/import \
  -H "Content-Type: application/json" \
  -d "{\"format\":\"json\",\"mode\":\"append\",\"content\":\"[{\\\"title\\\":\\\"Imported task\\\",\\\"description\\\":\\\"Added from import\\\",\\\"status\\\":\\\"pending\\\",\\\"priority\\\":\\\"medium\\\",\\\"category\\\":\\\"Imported\\\",\\\"dueDate\\\":\\\"2026-04-25\\\"}]\"}"
```

### `GET /api/todos/storage`

Returns CSV and SQLite storage counts and sync information.

Example:

```bash
curl http://localhost:3000/api/todos/storage
```

## Swagger and OpenAPI

The project includes built-in API documentation:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

The docs page also supports:

- the same light/dark mode as the app
- the same color scheme selector as the app
- browser-persisted theme settings through `localStorage`

## Validation Rules

Backend validation currently enforces:

- `title` is required
- `status` must be `pending`, `in_progress`, or `done`
- `priority` must be `low`, `medium`, or `high`
- `dueDate` must be a valid ISO date when provided

Frontend validation also adds:

- masked `DD/MM/YYYY` date entry
- invalid date detection
- visual inline feedback

## Automated Test Coverage

The backend tests currently cover:

- CSV parsing with commas and escaped quotes
- validation rules
- imported id deduplication
- CRUD API flow
- storage sync between CSV and SQLite
- JSON import/export
- grouping endpoint behavior
- list endpoint filtering
- negative API cases
- CSV import/export round-trip behavior

## Architecture Notes

- No Express is used
- The backend is modularized into `routes`, `services`, and `utils`
- CSV parsing and writing are isolated from HTTP route handling
- Business logic is separated from server bootstrap code
- SQLite support is kept as a synchronized mirror for now
- OpenAPI is documented separately from the route implementation

## Roadmap

- [x] Full CRUD for tasks
- [x] CSV persistence
- [x] SQLite mirroring
- [x] Light and dark themes
- [x] Multiple color schemes
- [x] Compact and card task views
- [x] Grouping and filtering
- [x] Import and export
- [x] Automated backend tests
- [x] OpenAPI documentation
- [x] Swagger UI
- [ ] Auto-refresh when storage changes
- [ ] Frontend smoke tests
- [ ] Optional move to SQLite-primary reads
- [ ] Authentication or user accounts

## Future Improvements

- Real-time refresh when the CSV or database changes
- Frontend integration tests or browser-based smoke tests
- Stronger API versioning if the backend grows
- Optional authentication and user separation
- Optional SQLite-primary mode when the project moves beyond CSV-first

## License

This project may be distributed under the MIT license.
