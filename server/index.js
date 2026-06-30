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
const {
  BIANCA_PERMISSIONS,
  COLLECTION_PERMISSIONS,
  hasPermission,
  normalizePermissions
} = require('./permissions');

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
  if (user.status === 'Inativo') {
    return response.status(403).json({ error: 'Usuario inativo.' });
  }

  const token = signToken(user);
  await writeAudit(user.id, 'login', { email: user.email, ip: request.ip });
  return response.json({ token, user: publicUser(user) });
}));

app.get('/api/auth/me', requireAuth, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

app.post('/api/auth/logout', requireAuth, asyncHandler(async (request, response) => {
  await writeAudit(request.user.id, 'logout', { email: request.user.email, ip: request.ip });
  response.json({ ok: true });
}));

app.get('/api/data', requireAuth, asyncHandler(async (request, response) => {
  const state = await getCurrentState();
  response.json({ data: state.data, updatedAt: state.updatedAt });
}));

app.put('/api/data', requireAuth, asyncHandler(async (request, response) => {
  const nextData = request.body && request.body.data;
  if (!nextData || typeof nextData !== 'object' || Array.isArray(nextData)) {
    return response.status(400).json({ error: 'Dados invalidos.' });
  }

  const currentState = await getCurrentState();
  const validation = validateDataUpdatePermissions(request.user, currentState.data, nextData);
  if (!validation.ok) {
    return response.status(403).json({ error: validation.error });
  }

  const updatedAt = new Date().toISOString();
  await updateCurrentState(nextData, updatedAt, request.user.id);
  await writeAudit(request.user.id, validation.action || 'data:update', { updatedAt, changes: validation.changes, ip: request.ip });
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
  const user = normalizeUserPayload(request.body || {}, true);
  if (!user.email || !user.password || !user.name) {
    return response.status(400).json({ error: 'Informe email, nome e senha.' });
  }

  const hash = bcrypt.hashSync(user.password, 12);
  const nextUser = {
    id: makeId('user'),
    email: user.email,
    password_hash: hash,
    name: user.name,
    photo_url: user.photo_url,
    role_title: user.role_title,
    role: user.profile === 'admin' ? 'admin' : 'user',
    profile: user.profile,
    status: user.status,
    permissions: normalizePermissions(user.profile, user.permissions),
    seller_id: user.seller_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await insertUser(nextUser);
  await writeAudit(request.user.id, 'user:create', { userId: nextUser.id, email: nextUser.email, ip: request.ip });
  response.status(201).json({ user: publicUser(nextUser, true) });
}));

app.put('/api/admin/users/:id', requireAuth, requireAdmin, asyncHandler(async (request, response) => {
  const existing = await findUserById(request.params.id);
  if (!existing) return response.status(404).json({ error: 'Usuario nao encontrado.' });

  const user = normalizeUserPayload(request.body || {}, false);
  const nextUser = {
    ...existing,
    email: user.email || existing.email,
    name: user.name || existing.name,
    photo_url: user.photo_url,
    role_title: user.role_title,
    profile: user.profile,
    role: user.profile === 'admin' ? 'admin' : 'user',
    status: user.status,
    permissions: normalizePermissions(user.profile, user.permissions),
    seller_id: user.seller_id,
    updated_at: new Date().toISOString()
  };

  if (request.body.password) {
    if (!hasPermission(request.user, 'special:changeOtherPassword')) {
      return response.status(403).json({ error: 'Sem permissao para alterar senha.' });
    }
    nextUser.password_hash = bcrypt.hashSync(String(request.body.password), 12);
  }

  const guard = await validateAdminGuard(existing, nextUser, request.user.id);
  if (!guard.ok) return response.status(400).json({ error: guard.error });

  await updateUser(nextUser);
  await writeAudit(request.user.id, 'user:update', { userId: nextUser.id, email: nextUser.email, ip: request.ip });
  response.json({ user: publicUser(nextUser, true) });
}));

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, asyncHandler(async (request, response) => {
  const existing = await findUserById(request.params.id);
  if (!existing) return response.status(404).json({ error: 'Usuario nao encontrado.' });
  const guard = await validateAdminGuard(existing, { ...existing, status: 'Inativo', profile: existing.profile }, request.user.id, true);
  if (!guard.ok) return response.status(400).json({ error: guard.error });
  await updateUser({ ...existing, status: 'Inativo', updated_at: new Date().toISOString() });
  await writeAudit(request.user.id, 'user:inactivate', { userId: existing.id, email: existing.email, ip: request.ip });
  response.json({ ok: true });
}));

app.get('/api/admin/audit', requireAuth, requireAdmin, asyncHandler(async (request, response) => {
  response.json({ audit: await listAudit() });
}));

app.get('/', serveIndex);
app.get('/index.html', serveIndex);
app.get('/vendor/chart.umd.js', (request, response) => {
  response.type('application/javascript');
  response.setHeader('Cache-Control', 'no-cache');
  response.sendFile(path.resolve(publicDir, 'node_modules', 'chart.js', 'dist', 'chart.umd.js'));
});

app.use(express.static(publicDir, {
  extensions: ['html'],
  index: false,
  maxAge: staticMaxAge,
  setHeaders(response, filePath) {
    if (filePath.endsWith('manifest.webmanifest')) {
      response.type('application/manifest+json');
    }
    if (isAppShellAsset(filePath)) {
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
  if (await countUsers() > 0) {
    await ensureBiancaUser();
    return;
  }

  const email = process.env.ADMIN_EMAIL || 'admin@gfimpressao3d.com.br';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 12);
  await insertUser({
    id: makeId('user'),
    email,
    password_hash: hash,
    name: 'Administrador GF',
    role: 'admin',
    photo_url: '',
    role_title: 'Administrador geral',
    profile: 'admin',
    status: 'Ativo',
    permissions: normalizePermissions('admin', []),
    seller_id: 'se2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  await ensureBiancaUser();

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('Usuario inicial criado com senha padrao admin123. Altere ADMIN_PASSWORD em producao.');
  }
}

async function ensureBiancaUser() {
  const existing = await findUserByEmail('bianca@gfimpressao3d.com.br');
  if (existing) return;
  await insertUser({
    id: makeId('user'),
    email: 'bianca@gfimpressao3d.com.br',
    password_hash: bcrypt.hashSync(process.env.BIANCA_PASSWORD || 'bianca123', 12),
    name: 'Bianca',
    role: 'user',
    photo_url: '',
    role_title: 'Vendedora',
    profile: 'custom',
    status: 'Ativo',
    permissions: BIANCA_PERMISSIONS,
    seller_id: 'se1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

async function ensureInitialState() {
  if (await hasCurrentState()) return;
  await insertCurrentState(createInitialData(), new Date().toISOString(), 'system');
}

function requireAdmin(request, response, next) {
  if (request.user.role !== 'admin' && request.user.profile !== 'admin') {
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
    if (user.status === 'Inativo') return response.status(403).json({ error: 'Usuario inativo.' });
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
    return normalizeStoredUser(db.users.find(user => user.email.toLowerCase() === String(email).toLowerCase())) || null;
  }

  const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return normalizeStoredUser(result.rows[0]) || null;
}

async function findUserById(id) {
  if (!usePostgres) {
    const db = readLocalDb();
    return normalizeStoredUser(db.users.find(user => user.id === id)) || null;
  }

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return normalizeStoredUser(result.rows[0]) || null;
}

function normalizeStoredUser(user) {
  if (!user) return null;
  const profile = user.profile || (user.role === 'admin' ? 'admin' : 'custom');
  return {
    ...user,
    photo_url: user.photo_url || '',
    role_title: user.role_title || '',
    role: user.role || (profile === 'admin' ? 'admin' : 'user'),
    profile,
    status: user.status || 'Ativo',
    permissions: normalizePermissions(profile, Array.isArray(user.permissions) ? user.permissions : []),
    seller_id: user.seller_id || '',
    updated_at: user.updated_at || user.created_at || new Date().toISOString()
  };
}

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, profile: user.profile },
    jwtSecret,
    { expiresIn: '12h' }
  );
}

function publicUser(user, adminView = false) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    photoUrl: user.photo_url || '',
    roleTitle: user.role_title || '',
    role: user.role,
    profile: user.profile || user.role || 'custom',
    status: user.status || 'Ativo',
    permissions: normalizePermissions(user.profile || user.role, user.permissions || []),
    sellerId: user.seller_id || '',
    createdAt: user.created_at,
    updatedAt: adminView ? user.updated_at : undefined
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

async function listAudit() {
  if (!usePostgres) {
    return readLocalDb().audit
      .slice()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 300);
  }

  const result = await pool.query('SELECT id, user_id, action, created_at, details FROM audit_log ORDER BY created_at DESC LIMIT 300');
  return result.rows;
}

async function countUsers() {
  if (!usePostgres) return readLocalDb().users.length;
  const result = await pool.query('SELECT COUNT(*)::int AS total FROM users');
  return result.rows[0].total;
}

async function listUsers() {
  if (!usePostgres) {
    return readLocalDb().users
      .map(normalizeStoredUser)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map(user => publicUser(user, true));
  }

  const result = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
  return result.rows.map(user => publicUser(user, true));
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
    INSERT INTO users (id, email, password_hash, name, role, created_at, photo_url, role_title, profile, status, permissions, seller_id, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    user.id,
    user.email,
    user.password_hash,
    user.name,
    user.role,
    user.created_at,
    user.photo_url || '',
    user.role_title || '',
    user.profile || user.role || 'custom',
    user.status || 'Ativo',
    JSON.stringify(user.permissions || []),
    user.seller_id || '',
    user.updated_at || user.created_at
  ]);
}

async function updateUser(user) {
  if (!usePostgres) {
    const db = readLocalDb();
    db.users = db.users.map(existing => existing.id === user.id ? user : existing);
    writeLocalDb(db);
    return;
  }

  await pool.query(`
    UPDATE users
    SET email = $2, password_hash = $3, name = $4, role = $5, photo_url = $6, role_title = $7,
        profile = $8, status = $9, permissions = $10, seller_id = $11, updated_at = $12
    WHERE id = $1
  `, [
    user.id,
    user.email,
    user.password_hash,
    user.name,
    user.role,
    user.photo_url || '',
    user.role_title || '',
    user.profile || user.role || 'custom',
    user.status || 'Ativo',
    JSON.stringify(user.permissions || []),
    user.seller_id || '',
    user.updated_at || new Date().toISOString()
  ]);
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

function normalizeUserPayload(body, creating) {
  return {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    password: creating || body.password ? String(body.password || '') : '',
    photo_url: String(body.photoUrl || body.photo_url || '').trim(),
    role_title: String(body.roleTitle || body.role_title || '').trim(),
    profile: normalizeProfile(body.profile),
    status: body.status === 'Inativo' ? 'Inativo' : 'Ativo',
    permissions: Array.isArray(body.permissions) ? body.permissions : [],
    seller_id: String(body.sellerId || body.seller_id || '').trim()
  };
}

function normalizeProfile(profile) {
  const value = String(profile || '').trim().toLowerCase();
  if (['admin', 'administrador'].includes(value)) return 'admin';
  if (['manager', 'gerente'].includes(value)) return 'manager';
  if (['vendedor'].includes(value)) return 'vendedor';
  if (['producao', 'produção'].includes(value)) return 'producao';
  if (['financeiro'].includes(value)) return 'financeiro';
  return 'custom';
}

async function validateAdminGuard(existingUser, nextUser, currentUserId, deleting = false) {
  const wasAdmin = existingUser.role === 'admin' || existingUser.profile === 'admin';
  const staysAdmin = nextUser.status !== 'Inativo' && (nextUser.role === 'admin' || nextUser.profile === 'admin');
  if (!wasAdmin || staysAdmin) return { ok: true };

  const admins = (await getAllStoredUsers()).filter(user => (
    user.id !== existingUser.id
    && user.status !== 'Inativo'
    && (user.role === 'admin' || user.profile === 'admin')
  ));
  if (!admins.length) {
    return {
      ok: false,
      error: deleting
        ? 'Nao e permitido inativar o ultimo administrador.'
        : 'Nao e permitido remover o ultimo administrador.'
    };
  }
  if (existingUser.id === currentUserId && !admins.length) {
    return { ok: false, error: 'Voce nao pode remover sua propria permissao de administrador se for o unico admin.' };
  }
  return { ok: true };
}

async function getAllStoredUsers() {
  if (!usePostgres) return readLocalDb().users.map(normalizeStoredUser);
  const result = await pool.query('SELECT * FROM users');
  return result.rows.map(normalizeStoredUser);
}

function validateDataUpdatePermissions(user, currentData, nextData) {
  if (user.role === 'admin' || user.profile === 'admin') {
    return summarizeDataChanges(currentData, nextData, true);
  }

  if (JSON.stringify(currentData.companySettings || {}) !== JSON.stringify(nextData.companySettings || {})) {
    return { ok: false, error: 'Sem permissao para alterar dados da empresa.' };
  }

  const changes = summarizeCollectionChanges(currentData, nextData);
  const changedSaleIds = new Set(changes.filter(change => change.collection === 'sales').map(change => change.id));
  for (const change of changes) {
    if (isAllowedSaleSideEffect(user, change, changedSaleIds, currentData, nextData)) continue;
    const rules = COLLECTION_PERMISSIONS[change.collection];
    if (!rules) continue;
    const permission = rules[change.type];
    if (!permission || !hasPermission(user, permission)) {
      return { ok: false, error: `Sem permissao para ${change.type} em ${change.collection}.` };
    }
    if (change.collection === 'commissions' && change.type === 'edit' && !hasPermission(user, 'special:payCommission')) {
      const before = findById(currentData.commissions || [], change.id);
      const after = findById(nextData.commissions || [], change.id);
      if (before && after && before.status !== 'Pago' && after.status === 'Pago') {
        return { ok: false, error: 'Sem permissao para marcar comissao como paga.' };
      }
    }
  }

  return summarizeDataChanges(currentData, nextData, false, changes);
}

function isAllowedSaleSideEffect(user, change, changedSaleIds, currentData, nextData) {
  if (!['stock', 'cash', 'receivables', 'commissions'].includes(change.collection)) return false;
  if (!hasPermission(user, 'create:sales') && !hasPermission(user, 'edit:sales')) return false;
  const row = findById(nextData[change.collection] || [], change.id) || findById(currentData[change.collection] || [], change.id);
  if (!row) return false;
  const sourceSaleId = row.sourceSaleId || row.saleId;
  return sourceSaleId && changedSaleIds.has(sourceSaleId);
}

function summarizeDataChanges(currentData, nextData, admin, existingChanges) {
  const changes = existingChanges || summarizeCollectionChanges(currentData, nextData);
  const action = changes.find(change => change.collection === 'sales')
    ? `sale:${changes.find(change => change.collection === 'sales').type}`
    : changes.find(change => change.type === 'delete')
    ? 'data:delete'
    : changes.find(change => change.collection === 'commissions')
    ? 'commission:update'
    : 'data:update';
  return { ok: true, action, changes, admin };
}

function summarizeCollectionChanges(currentData, nextData) {
  const collections = Object.keys({ ...currentData, ...nextData })
    .filter(key => Array.isArray(currentData[key]) || Array.isArray(nextData[key]));
  const changes = [];
  collections.forEach(collection => {
    const before = currentData[collection] || [];
    const after = nextData[collection] || [];
    const beforeIds = new Set(before.map(item => item.id));
    const afterIds = new Set(after.map(item => item.id));
    after.forEach(item => {
      if (!beforeIds.has(item.id)) changes.push({ collection, type: 'create', id: item.id });
      else if (JSON.stringify(findById(before, item.id)) !== JSON.stringify(item)) changes.push({ collection, type: 'edit', id: item.id });
    });
    before.forEach(item => {
      if (!afterIds.has(item.id)) changes.push({ collection, type: 'delete', id: item.id });
    });
  });
  return changes;
}

function findById(rows, id) {
  return rows.find(row => row.id === id);
}

function ensureLocalDbFile() {
  fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
  if (fs.existsSync(localDbPath)) return;
  writeLocalDb({ users: [], appState: null, audit: [] });
}

function readLocalDb() {
  ensureLocalDbFile();
  return JSON.parse(fs.readFileSync(localDbPath, 'utf8').replace(/^\uFEFF/, ''));
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
  response.setHeader('Cache-Control', 'no-cache');
  response.sendFile(path.join(publicDir, 'index.html'));
}

function isStaticAssetRequest(requestPath) {
  return path.extname(requestPath) !== '';
}

function isAppShellAsset(filePath) {
  return [
    'index.html',
    'app.js',
    'styles.css',
    'manifest.webmanifest',
    'service-worker.js'
  ].some(fileName => filePath.endsWith(fileName));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}
