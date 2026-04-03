const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { DB_FILE, initializeSqlite, syncTodosToSqlite } = require('./sqliteService');
const {
  DATA_DIR,
  DATA_FILE,
  buildCsvContent,
  ensureDataFile,
  escapeCsvValue,
  parseCsvLine,
  readTodos,
  writeTodos
} = require('./services/csvService');
const { handleTodosApi } = require('./routes/todos');
const { sendJson } = require('./utils/http');
const {
  buildSummary,
  parseImportContent
} = require('./services/todoService');
const {
  generateUniqueId,
  isValidDateTime,
  isValidIsoDate,
  normalizeImportedTodos,
  normalizePayload,
  validateTodo
} = require('./utils/validation');

const PORT = process.env.PORT || 3000;
const PUBLIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/docs': 'docs.html',
  '/docs.html': 'docs.html',
  '/openapi.json': 'openapi.json',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js'
};

function createAppServer() {
  ensureDataFile();
  initializeSqlite();
  syncTodosToSqlite(readTodos());

  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname.startsWith('/api/todos')) {
      try {
        await handleTodosApi(req, res, requestUrl);
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
}

function startServer(port = PORT) {
  const server = createAppServer();
  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

function serveStaticFile(res, fileName) {
  const filePath = path.join(__dirname, fileName);
  const extension = path.extname(fileName);
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
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

if (require.main === module) {
  startServer(PORT).then((server) => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : PORT;
    console.log(`Todo app listening on http://localhost:${activePort}`);
  });
}

module.exports = {
  DATA_DIR,
  DATA_FILE,
  DB_FILE,
  buildSummary,
  createAppServer,
  generateUniqueId,
  isValidDateTime,
  isValidIsoDate,
  normalizeImportedTodos,
  normalizePayload,
  parseImportContent,
  parseCsvLine,
  buildCsvContent,
  escapeCsvValue,
  readTodos,
  startServer,
  validateTodo,
  writeTodos
};
