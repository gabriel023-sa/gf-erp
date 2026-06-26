require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { WebSocket, WebSocketServer } = require('ws');

const { createInitialData } = require('./initial-data');

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-this-secret';
const publicDir = path.resolve(__dirname, '..');
const localDbPath = path.resolve(publicDir, 'data', 'gf-erp.local.json');
const migrationsDir = path.resolve(__dirname, 'migrations');
const usePostgres = Boolean(process.env.DATABASE_URL);
const staticMaxAge = process.env.NODE_ENV === 'production' ? '1h' : 0;

const pool = usePostgres
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })
  : null;

if (!usePostgres) {
  console.warn('DATABASE_URL nao configurada. Usando banco local em arquivo para desenvolvimento.');
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: false
}));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (request, response) => {
  response.json({ ok: true, service: 'gf-erp', time: new Date().toISOString() });
});

app.post('/api/auth/login', asyncHandler(async (request, response) => {
  const { email, password } = request.body || {};
  const user = await findUserByEmail(email || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return response.status(401).json({ error: 'Credenciais invalidas.' });
  }

  const token = signToken(user);
  await writeAudit(user.id, 'login', { email: user.email });
  return response.json({ token, user: publicUser(user) });
}));

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

app.get('/api/data', requireAuth, asyncHandler(async (request, response) => {
  const state = await getCurrentState();
  response.json({ data: state.data, updatedAt: state.updatedAt });
}));

app.put('/api/data', requireAuth, asyncHandler(async (request, response) => {
  const nextData = request.body && request.body.data;
  if (!nextData || typeof nextData !== 'object' || Array.isArray(nextData)) {
    return response.status(400).json({ error: 'Dados invalidos.' });
  }

  const updatedAt = new Date().toISOString();
  await updateCurrentState(nextData, updatedAt, request.user.id);
  await writeAudit(request.user.id, 'data:update', { updatedAt });
  broadcast({ type: 'data-updated', data: nextData, updatedAt });
  response.json({ ok: true, updatedAt });
}));

app.post('/api/admin/seed', requireAuth, asyncHandler(async (request, response) => {
  if (request.user.role !== 'admin') return response.status(403).json({ error: 'Acesso negado.' });
  const data = createInitialData();
  const updatedAt = new Date().toISOString();
  await updateCurrentState(data, updatedAt, request.user.id);
  await writeAudit(request.user.id, 'data:seed', { updatedAt });
  broadcast({ type: 'data-updated', data, updatedAt });
  response.json({ ok: true, data, updatedAt });
}));

app.get('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (request, response) => {
  response.json({ users: await listUsers() });
}));

app.post('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (request, response) => {
  const { email, password, name, role } = request.body || {};
  if (!email || !password || !name) {
    return response.status(400).json({ error: 'Informe email, nome e senha.' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const user = {
    id: makeId('user'),
    email,
    name,
    role: role === 'admin' ? 'admin' : 'user',
    created_at: new Date().toISOString()
  };
  await insertUser({ ...user, password_hash: hash });
  await writeAudit(request.user.id, 'user:create', { userId: user.id, email: user.email });
  response.status(201).json({ user });
}));

app.get('/', serveIndex);
app.get('/index.html', serveIndex);

app.use(express.static(publicDir, {
  extensions: ['html'],
  index: false,
  maxAge: staticMaxAge,
  setHeaders(response, filePath) {
    if (filePath.endsWith('manifest.webmanifest')) {
      response.type('application/manifest+json');
    }
    if (filePath.endsWith('service-worker.js')) {
      response.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('*', (request, response) => {
  if (isStaticAssetRequest(request.path)) {
    return response.status(404).json({ error: 'Arquivo estatico nao encontrado.' });
  }
  return serveIndex(request, response);
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: 'Erro interno do servidor.' });
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', async (socket, request) => {
  const user = await authenticateSocket(request);
  if (!user) {
    socket.close(1008, 'Unauthorized');
    return;
  }

  socket.userId = user.id;
  const state = await getCurrentState();
  socket.send(JSON.stringify({
    type: 'data-updated',
    data: state.data,
    updatedAt: state.updatedAt
  }));
});

bootstrap().then(() => {
  server.listen(port, () => {
    console.log(`GF ERP rodando em http://localhost:${port}`);
  });
}).catch(error => {
  console.error('Falha ao iniciar GF ERP:', error);
  process.exit(1);
});

async function bootstrap() {
  if (!usePostgres) {
    ensureLocalDbFile();
    await ensureInitialUser();
    await ensureInitialState();
    return;
  }

  await pool.query('SELECT 1');
  await runMigrations();

  await ensureInitialUser();
  await ensureInitialState();
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL
    );
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await pool.query('SELECT id FROM schema_migrations WHERE id = $1', [file]);
    if (applied.rowCount > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)',
        [file, new Date().toISOString()]
      );
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}

async function ensureInitialUser() {
  if (await countUsers() > 0) return;

  const email = process.env.ADMIN_EMAIL || 'admin@gfimpressao3d.com.br';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 12);
  await insertUser({
    id: makeId('user'),
    email,
    password_hash: hash,
    name: 'Administrador GF',
    role: 'admin',
    created_at: new Date().toISOString()
  });

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('Usuario inicial criado com senha padrao admin123. Altere ADMIN_PASSWORD em producao.');
  }
}

async function ensureInitialState() {
  if (await hasCurrentState()) return;
  await insertCurrentState(createInitialData(), new Date().toISOString(), 'system');
}

function requireAdmin(request, response, next) {
  if (request.user.role !== 'admin') {
    return response.status(403).json({ error: 'Acesso negado.' });
  }
  next();
}

function requireAuth(request, response, next) {
  const token = getBearerToken(request);
  if (!token) return response.status(401).json({ error: 'Token ausente.' });

  jwt.verify(token, jwtSecret, async (error, payload) => {
    if (error) return response.status(401).json({ error: 'Token invalido.' });
    const user = await findUserById(payload.sub);
    if (!user) return response.status(401).json({ error: 'Usuario invalido.' });
    request.user = user;
    next();
  });
}

async function authenticateSocket(request) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const payload = jwt.verify(token, jwtSecret);
    return findUserById(payload.sub);
  } catch {
    return null;
  }
}

async function findUserByEmail(email) {
  if (!usePostgres) {
    const db = readLocalDb();
    return db.users.find(user => user.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  if (!usePostgres) {
    const db = readLocalDb();
    return db.users.find(user => user.id === id) || null;
  }

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '12h' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

async function getCurrentState() {
  if (!usePostgres) {
    const db = readLocalDb();
    return {
      data: db.appState.data,
      updatedAt: db.appState.updated_at
    };
  }

  const result = await pool.query('SELECT data, updated_at FROM app_state WHERE id = $1', ['main']);
  return {
    data: result.rows[0].data,
    updatedAt: result.rows[0].updated_at
  };
}

function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

async function writeAudit(userId, action, details) {
  if (!usePostgres) {
    const db = readLocalDb();
    db.audit.push({
      id: makeId('audit'),
      user_id: userId,
      action,
      created_at: new Date().toISOString(),
      details: details || {}
    });
    writeLocalDb(db);
    return;
  }

  await pool.query(`
    INSERT INTO audit_log (id, user_id, action, created_at, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [makeId('audit'), userId, action, new Date().toISOString(), details || {}]);
}

async function countUsers() {
  if (!usePostgres) return readLocalDb().users.length;
  const result = await pool.query('SELECT COUNT(*)::int AS total FROM users');
  return result.rows[0].total;
}

async function listUsers() {
  if (!usePostgres) {
    return readLocalDb().users
      .map(({ password_hash, ...user }) => user)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const result = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC');
  return result.rows;
}

async function insertUser(user) {
  if (!usePostgres) {
    const db = readLocalDb();
    if (db.users.some(existing => existing.email.toLowerCase() === user.email.toLowerCase())) {
      const error = new Error('Usuario ja existe.');
      error.code = 'DUPLICATE_USER';
      throw error;
    }
    db.users.push(user);
    writeLocalDb(db);
    return;
  }

  await pool.query(`
    INSERT INTO users (id, email, password_hash, name, role, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [user.id, user.email, user.password_hash, user.name, user.role, user.created_at]);
}

async function hasCurrentState() {
  if (!usePostgres) return Boolean(readLocalDb().appState);
  const current = await pool.query('SELECT id FROM app_state WHERE id = $1', ['main']);
  return current.rowCount > 0;
}

async function insertCurrentState(data, updatedAt, updatedBy) {
  if (!usePostgres) {
    const db = readLocalDb();
    db.appState = { id: 'main', data, updated_at: updatedAt, updated_by: updatedBy };
    writeLocalDb(db);
    return;
  }

  await pool.query(`
    INSERT INTO app_state (id, data, updated_at, updated_by)
    VALUES ($1, $2, $3, $4)
  `, ['main', data, updatedAt, updatedBy]);
}

async function updateCurrentState(data, updatedAt, updatedBy) {
  if (!usePostgres) {
    const db = readLocalDb();
    db.appState = { id: 'main', data, updated_at: updatedAt, updated_by: updatedBy };
    writeLocalDb(db);
    return;
  }

  await pool.query(
    'UPDATE app_state SET data = $1, updated_at = $2, updated_by = $3 WHERE id = $4',
    [data, updatedAt, updatedBy, 'main']
  );
}

function ensureLocalDbFile() {
  fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
  if (fs.existsSync(localDbPath)) return;
  writeLocalDb({ users: [], appState: null, audit: [] });
}

function readLocalDb() {
  ensureLocalDbFile();
  return JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
}

function writeLocalDb(db) {
  fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
  fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2));
}

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function serveIndex(request, response) {
  response.sendFile(path.join(publicDir, 'index.html'));
}

function isStaticAssetRequest(requestPath) {
  return path.extname(requestPath) !== '';
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}
