const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const db = require('./db');
const games = require('./games');
const shop = require('./shop');
const { findProfanity } = require('./profanity');
const { RoomManager } = require('./rooms');

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.set('trust proxy', 1); // yalnız Traefik-ə etibar et (X-Forwarded-For saxtalaşdırılmasın)
app.use(express.json({ limit: '10kb' }));

// ---------- HTTP API ----------

const NICK_RE = /^[\p{L}\p{M}\p{N}_. -]{2,20}$/u;
const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
const NICK_ERROR = 'Nickname 2-20 simvol olmalıdır (hərf, rəqəm, _ .)';
const TAKEN_ERROR = 'Bu nickname artıq götürülüb, başqasını seç';
const RUDE_NICK_ERROR = 'Bu nickname uyğun deyil, başqasını seç';
// Nickname-in formatı və ədəbi; xəta mətni və ya null
const nickError = (n) => (!NICK_RE.test(n) ? NICK_ERROR : findProfanity(n) ? RUDE_NICK_ERROR : null);

function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 6) return 'Şifrə ən azı 6 simvol olmalıdır';
  if (pw.length > 100) return 'Şifrə çox uzundur';
  return null;
}

// Şifrə təxmin etməyə qarşı: bir IP-dən 15 dəqiqədə ən çox 10 uğursuz giriş
const failures = new Map(); // ip -> { n, until }
const FAIL_WINDOW = 15 * 60 * 1000;
function tooManyFailures(ip) {
  const f = failures.get(ip);
  if (f && f.until < Date.now()) failures.delete(ip);
  return (failures.get(ip)?.n || 0) >= 10;
}
function recordFailure(ip) {
  const f = failures.get(ip) || { n: 0, until: Date.now() + FAIL_WINDOW };
  f.n++;
  failures.set(ip, f);
}
setInterval(() => {
  for (const [ip, f] of failures) if (f.until < Date.now()) failures.delete(ip);
}, FAIL_WINDOW).unref();

function authToken(req) {
  return (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
}

function authUser(req) {
  return db.userByToken(authToken(req));
}

// Sürətli giriş: yalnız nickname (şifrəsiz hesab)
app.post('/api/quick', (req, res) => {
  const nickname = clean(req.body.nickname);
  if (nickError(nickname)) return res.status(400).json({ error: nickError(nickname) });
  const created = db.createUser({ nickname });
  if (!created) return res.status(409).json({ error: TAKEN_ERROR });
  res.json(created);
});

app.post('/api/register', (req, res) => {
  const nickname = clean(req.body.nickname);
  if (nickError(nickname)) return res.status(400).json({ error: nickError(nickname) });
  const pwError = checkPassword(req.body.password);
  if (pwError) return res.status(400).json({ error: pwError });
  const created = db.createUser({ nickname, password: req.body.password });
  if (!created) return res.status(409).json({ error: TAKEN_ERROR });
  res.json(created);
});

app.post('/api/login', (req, res) => {
  if (tooManyFailures(req.ip)) return res.status(429).json({ error: 'Çox cəhd oldu, 15 dəqiqə sonra yenidən yoxla' });
  const nickname = clean(req.body.nickname);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const result = NICK_RE.test(nickname) && password ? db.login(nickname, password) : null;
  if (!result) {
    recordFailure(req.ip);
    return res.status(401).json({ error: 'Nickname və ya şifrə səhvdir' });
  }
  res.json(result);
});

// Şifrə qoymaq (sürətli giriş hesabını qorumaq) və ya dəyişmək
app.post('/api/password', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (user.hasPassword && tooManyFailures(req.ip)) return res.status(429).json({ error: 'Çox cəhd oldu, 15 dəqiqə sonra yenidən yoxla' });
  const pwError = checkPassword(req.body.password);
  if (pwError) return res.status(400).json({ error: pwError });
  if (!db.setPassword(user.id, req.body.password, req.body.oldPassword)) {
    recordFailure(req.ip);
    return res.status(403).json({ error: 'Köhnə şifrə səhvdir' });
  }
  res.json({ user: { ...user, hasPassword: true } });
});

// Yazarkən yoxlama: nickname boşdurmu?
app.get('/api/nickname', (req, res) => {
  const nickname = clean(req.query.n);
  if (nickError(nickname)) return res.json({ status: 'invalid', error: nickError(nickname) });
  const user = authUser(req);
  res.json({ status: db.nicknameStatus(nickname, user ? user.id : null) });
});

// Tez girişlə oynayan qonaq qeydiyyatdan keçir (nickname-i də dəyişə bilər)
app.post('/api/upgrade', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const nickname = clean(req.body.nickname);
  if (nickError(nickname)) return res.status(400).json({ error: nickError(nickname) });
  const pwError = checkPassword(req.body.password);
  if (pwError) return res.status(400).json({ error: pwError });
  const error = db.upgradeGuest(user.id, nickname, req.body.password);
  if (error === 'taken') return res.status(409).json({ error: TAKEN_ERROR });
  if (error) return res.status(400).json({ error });
  if (nickname !== user.nickname) rooms.renamed(user.id, nickname);
  res.json({ user: db.userByToken(authToken(req)) });
});

app.post('/api/logout', (req, res) => {
  db.logout(authToken(req));
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  res.json({ user });
});

app.get('/api/games', (_req, res) => res.json(games.list()));

// Giriş ekranında: "N nəfər onlayn · bu gün M oyun"
app.get('/api/stats', (_req, res) => res.json({ online: online.size, ...db.publicStats() }));

// ---------- Müraciət (yalnız admin görür) ----------

app.post('/api/feedback', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const kind = db.FEEDBACK_KINDS.includes(req.body.kind) ? req.body.kind : 'other';
  const text = String(req.body.text ?? '').trim().slice(0, 1000);
  if (text.length < 5) return res.status(400).json({ error: 'Bir az ətraflı yaz (ən azı 5 simvol)' });
  const error = db.addFeedback(user.id, kind, text);
  if (error) return res.status(400).json({ error });
  res.json({ ok: true });
});

// ---------- Rəylər (hamıya açıq) ----------

app.get('/api/reviews', (req, res) => {
  const user = authUser(req);
  res.json(db.publicReviews(user ? user.id : null));
});

app.post('/api/reviews', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  if (!user.hasPassword) return res.status(403).json({ error: 'Rəy yazmaq üçün qeydiyyatdan keç', needsAccount: true });
  const stars = Number(req.body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ error: 'Ulduz seç (1–5)' });
  const text = clean(req.body.text).slice(0, 300);
  if (findProfanity(text)) return res.status(400).json({ error: 'Rəydə nalayiq söz var, düzəlt və yenidən yoxla' });
  db.upsertReview(user.id, stars, text);
  res.json(db.publicReviews(user.id));
});

app.post('/api/reviews/delete', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  db.deleteOwnReview(user.id);
  res.json(db.publicReviews(user.id));
});

app.post('/api/daily', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const r = db.claimDaily(user.id);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({ ...r, user: db.userByToken(authToken(req)) });
});

// ---------- Reytinq və mağaza ----------

function requireUser(req, res) {
  const user = authUser(req);
  if (!user) res.status(401).json({ error: 'unauthorized' });
  return user;
}

app.get('/api/leaderboard', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(db.leaderboard(req.query.period === 'all' ? 'all' : 'month', user.id));
});

app.get('/api/shop', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json({
    types: shop.TYPES, items: shop.ITEMS, rewards: db.getRewards(), owned: db.ownedItems(user.id), user,
    ads: { plans: shop.AD_PLANS, themes: shop.AD_THEMES, limits: shop.AD_LIMITS, mine: db.myAd(user.id), active: db.activeAds().length },
    buy: { packs: shop.INNO_PACKS, whatsapp: shop.WHATSAPP, starter: shop.STARTER_PACK },
    deal: shop.weeklyDeal(),
  });
});

app.post('/api/shop/buy', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const error = db.buyItem(user.id, String(req.body.itemId || ''));
  if (error === 'needs-account') return res.status(403).json({ error: 'Alış etmək üçün qeydiyyatdan keç', needsAccount: true });
  if (error) return res.status(400).json({ error });
  res.json({ owned: db.ownedItems(user.id), user: db.userByToken(authToken(req)) });
});

app.post('/api/shop/equip', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const error = db.equip(user.id, String(req.body.type || ''), req.body.itemId ? String(req.body.itemId) : null);
  if (error) return res.status(400).json({ error });
  rooms.lookChanged(user.id);
  res.json({ user: db.userByToken(authToken(req)) });
});

// ---------- Elanlar ----------

app.get('/api/elan', (_req, res) => res.json({ ads: db.activeAds(), minPrice: Math.min(...shop.AD_PLANS.map((p) => p.price)) }));

app.post('/api/elan', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const title = clean(req.body.title);
  const body = clean(req.body.body);
  const L = shop.AD_LIMITS;
  if (title.length < 3 || title.length > L.title) return res.status(400).json({ error: `Başlıq 3-${L.title} simvol olmalıdır` });
  if (body.length > L.body) return res.status(400).json({ error: `Mətn ən çox ${L.body} simvol ola bilər` });
  if (findProfanity(`${title} ${body}`)) return res.status(400).json({ error: 'Elanda nalayiq söz var, düzəlt və yenidən yoxla' });
  const r = db.createAd(user.id, { title, body, theme: String(req.body.theme || ''), planId: String(req.body.planId || '') });
  if (r.error === 'needs-account') return res.status(403).json({ error: 'Elan vermək üçün qeydiyyatdan keç', needsAccount: true });
  if (r.error) return res.status(400).json({ error: r.error });
  io.emit('ads:changed');
  res.json({ ad: r.ad, user: db.userByToken(authToken(req)) });
});

app.post('/api/elan/:id/stop', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const error = db.stopAd(user.id, Number(req.params.id));
  if (error) return res.status(400).json({ error });
  io.emit('ads:changed');
  res.json({ ok: true });
});

// ---------- Admin paneli (yalnız PG_ADMINS-dəki qeydiyyatlı hesablar) ----------

function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (!user.isAdmin) {
    res.status(403).json({ error: 'Bu bölmə yalnız admin üçündür' });
    return null;
  }
  return user;
}

app.get('/api/admin/overview', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ stats: { ...db.adminStats(), rooms: rooms.stats().rooms, playing: rooms.stats().playing, online: online.size }, rewards: db.getRewards(), prizes: db.getPrizes() });
});

app.post('/api/admin/rewards', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const b = req.body || {};
  const nums = [b.win?.points, b.win?.coins, b.lose?.points, b.lose?.coins].map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 100000)) return res.status(400).json({ error: 'Məbləğ düzgün deyil' });
  res.json({ rewards: db.setRewards(b) });
});

app.post('/api/admin/prizes', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const arr = Array.isArray(req.body.prizes) ? req.body.prizes.map(Number) : [];
  if (arr.length !== 3 || arr.some((n) => !Number.isInteger(n) || n < 0 || n > 100000)) return res.status(400).json({ error: 'Məbləğ düzgün deyil' });
  res.json({ prizes: db.setPrizes(arr) });
});

app.get('/api/admin/feedback', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ feedback: db.adminFeedback(req.query.status === 'new' ? 'new' : 'all') });
});
app.post('/api/admin/feedback/:id/status', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = ['new', 'read', 'done'].includes(req.body.status) ? req.body.status : null;
  if (!status || !db.setFeedbackStatus(Number(req.params.id), status)) return res.status(400).json({ error: 'Bu hərəkət indi mümkün deyil' });
  res.json({ ok: true });
});
app.post('/api/admin/feedback/:id/delete', (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.deleteFeedback(Number(req.params.id));
  res.json({ ok: true });
});
app.get('/api/admin/reviews', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ reviews: db.adminReviews() });
});
app.post('/api/admin/reviews/:id/hide', (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.setReviewHidden(Number(req.params.id), !!req.body.hidden);
  res.json({ ok: true });
});
app.post('/api/admin/reviews/:id/delete', (req, res) => {
  if (!requireAdmin(req, res)) return;
  db.deleteReview(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/users', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const kind = ['real', 'seed'].includes(req.query.kind) ? req.query.kind : 'all';
  res.json({ users: db.adminUsers(clean(req.query.q).slice(0, 20), kind) });
});

app.post('/api/admin/seed/delete', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ deleted: db.adminDeleteSeed() });
});

app.post('/api/admin/users/:id/coins', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const delta = Math.trunc(Number(req.body.delta));
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) return res.status(400).json({ error: 'Məbləğ düzgün deyil' });
  const coins = db.adminAddCoins(Number(req.params.id), delta);
  if (coins == null) return res.status(404).json({ error: 'Hesab tapılmadı' });
  res.json({ coins });
});

// Xal / inno: 0 – 10 000 000 tam ədəd; boşdursa null (dəyişmir)
function amount(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 1e7 ? n : NaN;
}

app.post('/api/admin/users', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const nickname = clean(req.body.nickname);
  if (nickError(nickname)) return res.status(400).json({ error: nickError(nickname) });
  const pwError = checkPassword(req.body.password);
  if (pwError) return res.status(400).json({ error: pwError });
  const points = amount(req.body.points) ?? 0;
  const coins = amount(req.body.coins) ?? 0;
  if (Number.isNaN(points) || Number.isNaN(coins)) return res.status(400).json({ error: 'Məbləğ düzgün deyil' });
  const r = db.adminCreateUser({ nickname, password: req.body.password, points, coins });
  if (r.error === 'taken') return res.status(409).json({ error: TAKEN_ERROR });
  res.json({ id: r.id });
});

app.post('/api/admin/users/:id/update', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  const patch = {};
  if (req.body.nickname != null) {
    patch.nickname = clean(req.body.nickname);
    if (nickError(patch.nickname)) return res.status(400).json({ error: nickError(patch.nickname) });
  }
  patch.points = amount(req.body.points);
  patch.coins = amount(req.body.coins);
  if (Number.isNaN(patch.points) || Number.isNaN(patch.coins)) return res.status(400).json({ error: 'Məbləğ düzgün deyil' });
  if (req.body.password) {
    const pwError = checkPassword(req.body.password);
    if (pwError) return res.status(400).json({ error: pwError });
    patch.password = req.body.password;
  }
  const r = db.adminUpdateUser(id, patch);
  if (r.error === 'taken') return res.status(409).json({ error: TAKEN_ERROR });
  if (r.error) return res.status(400).json({ error: r.error });
  if (r.renamed) rooms.renamed(id, patch.nickname);
  if (r.passwordChanged) {
    io.to(`user:${id}`).emit('session:ended');
    io.in(`user:${id}`).disconnectSockets(true);
  } else {
    io.to(`user:${id}`).emit('me:changed'); // oyunçunun ekranında xal/inno dərhal yenilənsin
  }
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/delete', (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const id = Number(req.params.id);
  if (id === admin.id) return res.status(400).json({ error: 'Öz hesabını silə bilməzsən' });
  const error = db.adminDeleteUser(id, admin.nickname);
  if (error) return res.status(400).json({ error });
  rooms.leave({ id }); // otaqdadırsa çıxar
  io.to(`user:${id}`).emit('account:deleted');
  io.in(`user:${id}`).disconnectSockets(true); // açıq telefonlar dərhal çıxsın
  io.emit('ads:changed');
  res.json({ ok: true });
});

app.get('/api/admin/elan', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ ads: db.adminAds() });
});

app.get('/healthz', (_req, res) => res.json({ ok: true, ...rooms.stats(), online: online.size }));

// Axtarış sistemləri üçün statik səhifələr (qaydalar, sitemap.xml, robots.txt)
require('./landing').mount(app);

app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    // Fayllar kiçikdir: brauzer hər dəfə yoxlasın (ETag ilə), yeni versiya dərhal görünsün
    // Səs faylları dəyişmir, bir həftə yaddaşda qalsın
    setHeaders: (res, file) => res.setHeader('Cache-Control', file.includes(`${path.sep}audio${path.sep}`) ? 'public, max-age=604800' : 'no-cache'),
  })
);

// ---------- Socket.IO ----------

const server = http.createServer(app);
const io = new Server(server, {
  // Mobil internet bəzən bir neçə saniyə donur, ona görə cavab üçün 20 san. gözlənilir
  pingInterval: 10000,
  pingTimeout: 20000,
  maxHttpBufferSize: 10 * 1024,
});

const online = new Map(); // userId -> açıq socket sayı
const isOnline = (userId) => (online.get(userId) || 0) > 0;
const rooms = new RoomManager(io, isOnline);

// Ay bitəndə (Bakı vaxtı) reytinqin ilk yerlərinə inno: işə düşəndə və hər 10 dəqiqədən bir yoxla
function checkMonthlyPrizes() {
  try {
    const winners = db.runMonthlyPrizes();
    for (const id of winners) io.to(`user:${id}`).emit('me:changed');
    if (winners.length) console.log('Aylıq mükafat verildi:', winners.join(', '));
  } catch (e) {
    console.error('Aylıq mükafat xətası:', e);
  }
}
setInterval(checkMonthlyPrizes, 10 * 60 * 1000).unref();
setTimeout(checkMonthlyPrizes, 5000).unref();

io.use((socket, next) => {
  const user = db.userByToken(socket.handshake.auth && socket.handshake.auth.token);
  if (!user) return next(new Error('unauthorized'));
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  online.set(user.id, (online.get(user.id) || 0) + 1);

  // Yenidən qoşulanda oyunçu otağına və roluna avtomatik qayıdır
  rooms.sendTo(user.id, rooms.roomOf(user.id));
  rooms.presenceChanged(user.id);

  const on = (event, handler) => {
    socket.on(event, (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const result = handler(payload || {});
        reply({ ok: true, ...(result || {}) });
      } catch (err) {
        if (!err.expose) console.error(`[${event}]`, err);
        reply({ ok: false, error: err.expose ? err.message : 'Xəta baş verdi, yenidən cəhd et' });
      }
    });
  };

  on('room:create', (p) => rooms.create(user, p.gameId));
  on('room:join', (p) => rooms.join(user, p.code));
  on('room:leave', () => rooms.leave(user));
  on('room:kick', (p) => rooms.kick(user, p.userId));
  on('room:settings', (p) => rooms.updateSettings(user, p.settings));
  on('room:start', () => rooms.start(user));
  on('room:assign', (p) => rooms.assign(user, p.userId));
  on('room:lobby', () => rooms.backToLobby(user));
  on('game:action', (p) => rooms.action(user, p));

  socket.on('disconnect', () => {
    const n = (online.get(user.id) || 1) - 1;
    if (n <= 0) online.delete(user.id);
    else online.set(user.id, n);
    rooms.presenceChanged(user.id);
  });
});

const restored = rooms.restore();
server.listen(PORT, () => {
  console.log(`Partygames ${PORT} portunda işləyir (bərpa olunan otaq: ${restored})`);
});

function shutdown() {
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
