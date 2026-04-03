# TaskFlow CSV

Aplicacion To Do moderna con persistencia en archivo CSV, interfaz light/dark y API CRUD sin base de datos relacional.

## Caracteristicas

- Interfaz moderna y responsive
- Tema oscuro y claro
- Persistencia simple en `data/todos.csv`
- API REST para crear, consultar, editar y eliminar tareas
- Agrupacion de resultados por estado, prioridad o categoria
- Fechas mostradas en formato de Honduras (`dd/mm/aaaa` en la interfaz)

## Tecnologias usadas

- HTML5
- CSS3
- JavaScript vanilla
- Node.js
- CSV como almacenamiento local

## Estructura del proyecto

- [index.html](c:\Users\Nelson\Documents\GitHub\todo\index.html): estructura principal de la interfaz
- [styles.css](c:\Users\Nelson\Documents\GitHub\todo\styles.css): estilos, temas y componentes visuales
- [app.js](c:\Users\Nelson\Documents\GitHub\todo\app.js): logica de frontend, consumo de APIs y renderizado
- [server.js](c:\Users\Nelson\Documents\GitHub\todo\server.js): servidor HTTP y API CRUD
- [data/todos.csv](c:\Users\Nelson\Documents\GitHub\todo\data\todos.csv): almacenamiento de tareas
- [package.json](c:\Users\Nelson\Documents\GitHub\todo\package.json): metadata y script de inicio

## Requisitos

- Node.js 18 o superior recomendado

## Como ejecutar

1. Abre una terminal en la carpeta del proyecto.
2. Ejecuta:

```bash
npm start
```

3. Abre en el navegador:

```text
http://localhost:3000
```

## Como se guardan los datos

Las tareas se persisten en el archivo:

```text
data/todos.csv
```

Cada fila representa una tarea con estas columnas:

```text
id,title,description,status,priority,category,dueDate,createdAt,updatedAt
```

## API REST

Base URL:

```text
http://localhost:3000
```

### 1. Listar tareas

`GET /api/todos`

Ejemplo `curl`:

```bash
curl http://localhost:3000/api/todos
```

Respuesta:

```json
{
  "items": [
    {
      "id": "1",
      "title": "Definir alcance",
      "description": "Aterrizar las vistas y el flujo CRUD inicial",
      "status": "pending",
      "priority": "high",
      "category": "Planificacion",
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

Filtros soportados:

- `search`
- `status`
- `priority`
- `category`

Ejemplo:

```text
GET /api/todos?search=demo&status=pending&priority=high
```

Ejemplo `curl`:

```bash
curl "http://localhost:3000/api/todos?search=demo&status=pending&priority=high"
```

### 2. Obtener una tarea por id

`GET /api/todos/:id`

Ejemplo:

```text
GET /api/todos/1
```

Ejemplo `curl`:

```bash
curl http://localhost:3000/api/todos/1
```

### 3. Crear tarea

`POST /api/todos`

Body:

```json
{
  "title": "Preparar demo",
  "description": "Revisar UI y endpoints",
  "status": "pending",
  "priority": "medium",
  "category": "Frontend",
  "dueDate": "2026-04-12"
}
```

Ejemplo `curl`:

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Preparar demo\",\"description\":\"Revisar UI y endpoints\",\"status\":\"pending\",\"priority\":\"medium\",\"category\":\"Frontend\",\"dueDate\":\"2026-04-12\"}"
```

### 4. Actualizar tarea

`PUT /api/todos/:id`

Body:

```json
{
  "title": "Preparar demo final",
  "description": "Validar estilo y CRUD",
  "status": "in_progress",
  "priority": "high",
  "category": "Frontend",
  "dueDate": "2026-04-14"
}
```

Ejemplo `curl`:

```bash
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Preparar demo final\",\"description\":\"Validar estilo y CRUD\",\"status\":\"in_progress\",\"priority\":\"high\",\"category\":\"Frontend\",\"dueDate\":\"2026-04-14\"}"
```

### 5. Eliminar tarea

`DELETE /api/todos/:id`

Ejemplo:

```text
DELETE /api/todos/1
```

Ejemplo `curl`:

```bash
curl -X DELETE http://localhost:3000/api/todos/1
```

### 6. Agrupar resultados

`GET /api/todos/group?by=status`

Valores permitidos para `by`:

- `status`
- `priority`
- `category`

Ejemplo de respuesta:

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

Ejemplo `curl`:

```bash
curl "http://localhost:3000/api/todos/group?by=status"
```

## Reglas de validacion

- `title` es obligatorio
- `status` debe ser `pending`, `in_progress` o `done`
- `priority` debe ser `low`, `medium` o `high`

## Notas tecnicas

- No usa Express ni base de datos externa
- El CSV se parsea y reescribe desde Node
- Los menus y la fecha se adaptan al tema claro/oscuro
- La UI traduce al espanol los estados y prioridades visibles

## Roadmap

- [x] CRUD completo de tareas
- [x] Persistencia en CSV
- [x] Tema claro y oscuro
- [x] Filtros y agrupacion de tareas
- [x] Documentacion basica de la API
- [x] Ejemplos `curl`
- [x] Validacion visual de fechas invalidas
- [ ] Auto-refresh cuando cambie el CSV
- [ ] Swagger / OpenAPI
- [ ] Importar y exportar tareas
- [ ] Tests automatizados
- [ ] Migracion opcional a SQLite

## Posibles mejoras

- Agregar Swagger o OpenAPI para documentar la API
- Detectar cambios del archivo CSV en tiempo real
- Agregar exportacion/importacion de CSV
- Resaltar tareas vencidas o proximas a vencer
- Agregar autenticacion
- Agregar tests automatizados
- Migrar de CSV a SQLite si el proyecto crece

## Licencia

Este proyecto puede distribuirse bajo la licencia MIT.
