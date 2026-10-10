const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const telegram = require('./telegram');
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
  const created = db.createUser({ nickname, ref: req.body.ref });
  if (!created) return res.status(409).json({ error: TAKEN_ERROR });
  res.json(created);
});

app.post('/api/register', (req, res) => {
  const nickname = clean(req.body.nickname);
  if (nickError(nickname)) return res.status(400).json({ error: nickError(nickname) });
  const pwError = checkPassword(req.body.password);
  if (pwError) return res.status(400).json({ error: pwError });
  const created = db.createUser({ nickname, password: req.body.password, ref: req.body.ref });
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

// ---------- İnno sifarişləri (Telegram admin təsdiqi ilə) ----------

const publicOrder = (o) => ({ id: o.id, inno: o.inno, price: o.price, starter: o.starter, status: o.status, payLink: o.status === 'link_sent' || o.status === 'claimed' ? o.payLink : null, createdAt: o.createdAt });

app.get('/api/inno/orders', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json({ enabled: telegram.enabled(), orders: db.innoOrdersOf(user.id, 5).map(publicOrder) });
});

app.post('/api/inno/order', async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  if (!telegram.enabled()) return res.status(503).json({ error: 'Sifariş sistemi hazırda işləmir' });
  if (!user.hasPassword) return res.status(403).json({ error: 'İnno almaq üçün əvvəlcə qeydiyyatdan keç', needsAccount: true });
  const starter = req.body.pack === 'starter';
  const pack = starter ? shop.STARTER_PACK : shop.INNO_PACKS[Number(req.body.pack)];
  if (!pack) return res.status(400).json({ error: 'Belə paket yoxdur' });
  const r = db.createInnoOrder(user.id, pack.inno, pack.price, starter);
  if (r.error) return res.status(400).json({ error: r.error });
  try {
    await telegram.sendRequest(r.order, user.nickname);
  } catch (e) {
    console.error('telegram sendRequest:', e.message);
    db.updateInnoOrder(r.order.id, { status: 'cancelled' });
    return res.status(502).json({ error: 'Sorğu göndərilmədi, bir az sonra yenə cəhd et' });
  }
  res.json({ ok: true, orders: db.innoOrdersOf(user.id, 5).map(publicOrder) });
});

app.post('/api/inno/order/:id/claim', async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const o = db.innoOrder(Number(req.params.id));
  if (!o || o.userId !== user.id) return res.status(404).json({ error: 'Sifariş tapılmadı' });
  if (o.status !== 'link_sent') return res.status(400).json({ error: 'Əvvəlcə ödəniş linkini gözlə' });
  try {
    await telegram.sendClaim(o, user.nickname);
  } catch (e) {
    console.error('telegram sendClaim:', e.message);
    return res.status(502).json({ error: 'Bildiriş göndərilmədi, yenə cəhd et' });
  }
  db.updateInnoOrder(o.id, { status: 'claimed' });
  res.json({ ok: true, orders: db.innoOrdersOf(user.id, 5).map(publicOrder) });
});

app.post('/api/inno/order/:id/cancel', async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const r = db.cancelInnoOrder(Number(req.params.id), user.id);
  if (r.error) return res.status(400).json({ error: r.error });
  telegram.markCancelled(r.order, user.nickname, 'oyunçu');
  res.json({ ok: true, orders: db.innoOrdersOf(user.id, 5).map(publicOrder) });
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

app.post('/api/shop/char', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const error = db.setChar(user.id, req.body || {});
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

app.get('/api/admin/prices', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ prices: db.getPrices() });
});
app.post('/api/admin/prices', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const r = db.setPrices(req.body || {});
  if (r.error) return res.status(400).json({ error: r.error });
  res.json(r);
});
app.post('/api/admin/prices/reset', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ prices: db.resetPrices() });
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

// Əsas səhifə: canonical / og ünvanları PG_DOMAIN-dən götürülür (domen dəyişəndə kodu dəyişmək lazım olmur)
const INDEX_HTML = require('fs').readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8').split('https://oyun.innotex.az').join(require('./landing').BASE);
app.get(['/', '/index.html'], (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(INDEX_HTML);
});

app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    // Fayllar kiçikdir: brauzer hər dəfə yoxlasın (ETag ilə), yeni versiya dərhal görünsün
    // Səs faylları dəyişmir, bir həftə yaddaşda qalsın
    setHeaders: (res, file) => res.setHeader('Cache-Control', file.includes(`${path.sep}audio${path.sep}`) ? 'public, max-age=604800' : file.includes(`${path.sep}img${path.sep}`) || /og(-\w+)?\.jpg$/.test(file) ? 'public, max-age=86400' : 'no-cache'),
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
class UserErr extends Error { constructor(m) { super(m); this.expose = true; } }
function notifyFriendsLater(id) {
  if (db.isInvisible(id)) return;
  for (const f of db.friendIds(id)) io.to(`user:${f}`).emit('social:presence', { id, online: (online.get(id) || 0) > 0 });
}
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
  if (online.get(user.id) === 1) notifyFriendsLater(user.id);

  const on = (event, handler) => {
    socket.on(event, (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const result = handler(payload || {});
        reply({ ok: true, ...(result || {}) });
      } catch (err) {
        if (!err.expose) console.error(`[${event}]`, err);
        reply({ ok: false, error: err.expose ? err.message : 'Xəta baş verdi, yenidən cəhd et', needsPassword: !!err.needsPassword, needsAccount: !!err.needsAccount });
      }
    });
  };

  // ---------- Dostlar, profil, şəxsi mesajlar ----------
  const needAcc = (r) => { if (r && r.error === 'needs-account') throw Object.assign(new UserErr('Bunun üçün qeydiyyatdan keç'), { needsAccount: true }); if (r && r.error) throw new UserErr(r.error); return r; };
  const showFor = (viewerId, id) => db.isBot(id) || (online.has(id) && !db.isInvisible(id)); // görünməz oyunçu oflayn kimi görünür
  const notifyFriends = (id) => { if (db.isInvisible(id)) return; for (const f of db.friendIds(id)) io.to(`user:${f}`).emit('social:presence', { id, online: isOnline(id) }); };
  on('social:profile', (p) => { const pr = db.profileOf(user.id, Number(p.id)); if (!pr) throw new UserErr('Oyunçu tapılmadı'); return { profile: { ...pr, online: pr.status === 'friends' && showFor(user.id, pr.id) } }; });
  on('social:search', (p) => ({ users: db.searchUsers(user.id, p.q, !!user.isAdmin) }));
  on('social:list', () => {
    const o = db.socialOverview(user.id);
    o.friends = o.friends.map((f) => ({ ...f, online: showFor(user.id, f.id), invisible: undefined }));
    return { social: o };
  });
  on('social:request', (p) => {
    const r = needAcc(db.friendRequest(user.id, Number(p.id)));
    const target = Number(p.id);
    io.to(`user:${target}`).emit('social:update', { kind: r.status === 'friends' ? 'friend' : 'request', from: user.id });
    if (r.status === 'sent' && db.isBot(target)) { // test botu sorğunu 1 san. sonra qəbul edir
      setTimeout(() => { if (db.friendRespond(target, user.id, true).status === 'friends') io.to(`user:${user.id}`).emit('social:update', { kind: 'friend', from: target }); }, 1000);
    }
    return { status: r.status };
  });
  on('social:respond', (p) => {
    const r = needAcc(db.friendRespond(user.id, Number(p.id), !!p.accept));
    io.to(`user:${Number(p.id)}`).emit('social:update', { kind: p.accept ? 'friend' : 'declined', from: user.id });
    return { status: r.status };
  });
  on('social:remove', (p) => { db.friendRemove(user.id, Number(p.id)); io.to(`user:${Number(p.id)}`).emit('social:update', { kind: 'removed', from: user.id }); return { status: 'none' }; });
  on('social:history', (p) => needAcc(db.dmHistory(user.id, Number(p.id))));
  on('social:send', (p) => {
    const text = String(p.text ?? '').trim().replace(/\s+/g, ' ').slice(0, 300);
    if (!text) throw new UserErr('Boş mesaj');
    if (findProfanity(text)) throw new UserErr('Mesajda nalayiq söz var');
    const r = needAcc(db.dmSend(user.id, Number(p.id), text));
    io.to(`user:${r.message.to}`).emit('social:dm', { ...r.message, nickname: user.nickname });
    if (db.isBot(r.message.to)) { // test botu cavab yazır
      const botId = r.message.to;
      const LINES = ['Salam! Test botuyam 🤖', 'Mesajını aldım ✅', 'Oyuna girək? 🎮', 'Bu avtomatik cavabdır.', 'Hə, eşidirəm 👍'];
      setTimeout(() => {
        const msg = db.dmSend(botId, user.id, LINES[Math.floor(Math.random() * LINES.length)]);
        if (msg.message) io.to(`user:${user.id}`).emit('social:dm', { ...msg.message, nickname: (db.profileOf(user.id, botId) || {}).nickname || 'bot' });
      }, 1200);
    }
    return { message: r.message };
  });
  on('social:invisible', (p) => { db.setInvisible(user.id, !!p.on); notifyFriends(user.id); if (p.on) for (const f of db.friendIds(user.id)) io.to(`user:${f}`).emit('social:presence', { id: user.id, online: false }); return { invisible: !!p.on }; });

  on('room:create', (p) => rooms.create(user, p.gameId, p.visibility, { name: p.name, password: p.password, langs: p.langs, lang: p.lang }));
  on('room:quick', (p) => rooms.quick(user, p.gameId || 'village', p.lang));
  on('room:test', (p) => {
    const res = rooms.createTest(user, p.role);
    // Qəbul etmə axınını sınamaq üçün: ilk bot 3 san. sonra sənə dostluq sorğusu göndərir
    const room = rooms.roomOf(user.id);
    const bot = room && room.players.find((x) => x.bot);
    if (bot) setTimeout(() => {
      if (db.friendStatus(user.id, bot.id) === 'none' && db.friendRequest(bot.id, user.id).status === 'sent') io.to(`user:${user.id}`).emit('social:update', { kind: 'request', from: bot.id });
    }, 3000);
    return res;
  });
  on('room:testauto', () => rooms.toggleTestAuto(user));
  on('room:list', () => ({ rooms: rooms.listPublic() }));
  on('room:langs', (p) => rooms.setLangs(user, p.langs));
  on('room:visibility', (p) => rooms.setVisibility(user, p.visibility));
  on('room:join', (p) => rooms.join(user, p.code, p.password));
  on('room:leave', () => rooms.leave(user));
  on('room:kick', (p) => rooms.kick(user, p.userId));
  on('room:settings', (p) => rooms.updateSettings(user, p.settings));
  on('room:start', () => rooms.start(user));
  on('room:lobby', () => rooms.backToLobby(user));
  on('game:action', (p) => rooms.action(user, p));

  socket.on('disconnect', () => {
    const n = (online.get(user.id) || 1) - 1;
    if (n <= 0) online.delete(user.id);
    else online.set(user.id, n);
    rooms.presenceChanged(user.id);
    if (!online.has(user.id)) notifyFriendsLater(user.id);
  });
});

const restored = rooms.restore();
telegram.start((userId, paid) => {
  io.to(`user:${userId}`).emit('inno:changed', { paid: !!paid });
  if (paid) io.to(`user:${userId}`).emit('me:changed');
});
server.listen(PORT, () => {
  console.log(`Partygames ${PORT} portunda işləyir (bərpa olunan otaq: ${restored})`);
});

function shutdown() {
  telegram.stop();
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
