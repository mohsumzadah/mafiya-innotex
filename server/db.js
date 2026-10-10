const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const shop = require('./shop');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'partygames.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  -- Aktiv otaqlar. Oyunun bütün vəziyyəti "data" sütununda JSON kimi saxlanır,
  -- server yenidən başlayanda oyunlar qaldığı yerdən davam edir.
  CREATE TABLE IF NOT EXISTS rooms (
    code       TEXT PRIMARY KEY,
    game_id    TEXT NOT NULL,
    host_id    INTEGER NOT NULL,
    status     TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS game_results (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code   TEXT NOT NULL,
    game_id     TEXT NOT NULL,
    winner      TEXT,
    players     TEXT NOT NULL,
    started_at  INTEGER,
    finished_at INTEGER NOT NULL
  );
`);

// ---------- Sxem versiyaları ----------
// v1: users (ad, soyad, nickname, tək token)
// v2: users yalnız nickname + istəyə bağlı şifrə + xal; girişlər ayrıca "sessions" cədvəlində
const migrations = [
  () => db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name   TEXT NOT NULL,
      last_name    TEXT NOT NULL,
      nickname     TEXT NOT NULL UNIQUE COLLATE NOCASE,
      token        TEXT NOT NULL UNIQUE,
      created_at   INTEGER NOT NULL,
      last_seen_at INTEGER
    );
  `),
  () => db.exec(`
    CREATE TABLE users_v2 (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,            -- NULL = sürətli giriş (qonaq) hesabı
      points        INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL,
      last_seen_at  INTEGER
    );
    INSERT INTO users_v2 (id, nickname, created_at, last_seen_at)
      SELECT id, nickname, created_at, last_seen_at FROM users;

    CREATE TABLE sessions (
      token        TEXT PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL
    );
    INSERT INTO sessions (token, user_id, created_at, last_used_at)
      SELECT token, id, created_at, COALESCE(last_seen_at, created_at) FROM users;

    DROP TABLE users;
    ALTER TABLE users_v2 RENAME TO users;
    CREATE INDEX sessions_user ON sessions(user_id);

    ALTER TABLE game_results ADD COLUMN points TEXT; -- {userId: qazanılan xal}
  `),
  () => {
    db.exec(`
      ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN look TEXT; -- taxılmış əşyalar: {"name":"gold","bg":"mint","badge":"fire"}

      -- Hər oyunçunun hər oyundan qazancı. Aylıq reytinq buradan hesablanır.
      CREATE TABLE score_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id    TEXT NOT NULL,
        points     INTEGER NOT NULL,
        coins      INTEGER NOT NULL,
        won        INTEGER NOT NULL,
        month      TEXT NOT NULL, -- '2026-09' (Bakı vaxtı ilə)
        created_at INTEGER NOT NULL
      );
      CREATE INDEX score_events_month ON score_events(month, user_id);

      CREATE TABLE user_items (
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id    TEXT NOT NULL,
        price      INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, item_id)
      );
    `);
    // Bu günə qədər toplanmış xallar cari ayın reytinqinə düşür
    db.prepare(`INSERT INTO score_events (user_id, game_id, points, coins, won, month, created_at)
                SELECT id, 'legacy', points, 0, 0, ?, ? FROM users WHERE points > 0`).run(monthKey(), Date.now());
  },
  () => db.exec(`
    -- Oyunçuların inno ilə aldığı elanlar (ana ekranda fırlanır)
    CREATE TABLE ads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      nickname   TEXT NOT NULL, -- yayım anındakı ad
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      theme      TEXT NOT NULL,
      plan       TEXT NOT NULL,
      price      INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      ends_at    INTEGER NOT NULL,
      stopped_at INTEGER, -- sahibi və ya admin dayandırıb
      stopped_by TEXT
    );
    CREATE INDEX ads_active ON ads(ends_at);
  `),
  () => db.exec(`
    -- Admin paneldən dəyişən ayarlar (JSON dəyər)
    CREATE TABLE settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `),
  () => db.exec(`
    -- Ayın sonunda reytinqin ilk yerlərinə verilən inno
    CREATE TABLE month_prizes (
      month      TEXT NOT NULL,     -- '2026-09'
      rank       INTEGER NOT NULL,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      nickname   TEXT NOT NULL,
      points     INTEGER NOT NULL,
      coins      INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (month, rank)
    );
  `),
  () => db.exec(`
    -- Gündəlik bonus: son götürülən gün (Bakı vaxtı, 'YYYY-MM-DD') və ardıcıl gün sayı
    ALTER TABLE users ADD COLUMN daily_last TEXT;
    ALTER TABLE users ADD COLUMN daily_streak INTEGER NOT NULL DEFAULT 0;
  `),
  () => db.exec(`
    -- Təklif / şikayət / xəta: yalnız admin görür
    CREATE TABLE feedback (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      nickname   TEXT NOT NULL,
      kind       TEXT NOT NULL,           -- idea | complaint | bug | other
      text       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'new', -- new | read | done
      created_at INTEGER NOT NULL
    );
    -- Platforma haqqında açıq rəylər (hər hesaba bir rəy)
    CREATE TABLE reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      nickname   TEXT NOT NULL,
      stars      INTEGER NOT NULL,
      text       TEXT NOT NULL,
      hidden     INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `),
  () => db.exec(`
    -- Dəvət: kim dəvət edib və bonus ödənilibmi
    ALTER TABLE users ADD COLUMN referred_by INTEGER;
    ALTER TABLE users ADD COLUMN ref_paid INTEGER NOT NULL DEFAULT 0;
  `),
  () => db.exec(`
    -- Dostluq və şəxsi mesajlar
    ALTER TABLE users ADD COLUMN invisible INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE friends (
      a INTEGER NOT NULL,          -- kiçik id
      b INTEGER NOT NULL,          -- böyük id
      status TEXT NOT NULL,        -- pending | accepted
      requester INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (a, b)
    );
    CREATE INDEX friends_b ON friends(b);
    CREATE TABLE dms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id INTEGER NOT NULL,
      to_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      read_at INTEGER
    );
    CREATE INDEX dms_pair ON dms(from_id, to_id, id);
    CREATE INDEX dms_unread ON dms(to_id, read_at);
  `),
  () => db.exec(`
    -- İnno sifarişləri: sorğu -> ödəniş linki (Telegram) -> "ödədim" -> təsdiq -> inno hesaba yazılır
    CREATE TABLE inno_orders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      inno        INTEGER NOT NULL,
      price       REAL NOT NULL,
      starter     INTEGER NOT NULL DEFAULT 0,
      status      TEXT NOT NULL,      -- requested | link_sent | claimed | paid | cancelled
      provider    TEXT NOT NULL DEFAULT 'manual',
      pay_link    TEXT,
      tg_msg_id   INTEGER,            -- sorğu mesajı (admin buna Reply ilə link yazır)
      tg_claim_id INTEGER,            -- "ödədim" mesajı (təsdiq düymələri)
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      paid_at     INTEGER
    );
    CREATE INDEX inno_orders_user ON inno_orders(user_id, id);
    CREATE INDEX inno_orders_msg ON inno_orders(tg_msg_id);
  `),
];

// Reytinq ayı Bakı vaxtı ilə (UTC+4, yay vaxtı yoxdur)
function monthKey(t = Date.now()) {
  return new Date(t + 4 * 3600 * 1000).toISOString().slice(0, 7);
}

// Miqrasiya cədvəlləri yenidən qurur, ona görə xarici açarlar yalnız sonra yandırılır
// (better-sqlite3 onları standart olaraq açıq saxlayır, DROP TABLE kaskadla sessiyaları silərdi)
db.pragma('foreign_keys = OFF');
for (let v = db.pragma('user_version', { simple: true }); v < migrations.length; v++) {
  db.transaction(() => {
    migrations[v]();
    db.pragma(`user_version = ${v + 1}`);
  })();
}
db.pragma('foreign_keys = ON');

const q = {
  insertUser: db.prepare('INSERT INTO users (nickname, password_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?)'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByNickname: db.prepare('SELECT * FROM users WHERE nickname = ?'),
  userByToken: db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  setPassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
  upgradeGuest: db.prepare('UPDATE users SET nickname = ?, password_hash = ? WHERE id = ? AND password_hash IS NULL'),
  setReferrer: db.prepare('UPDATE users SET referred_by = ? WHERE id = ?'),
  refPaidCount: db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ? AND ref_paid = 1'),
  markRefPaid: db.prepare('UPDATE users SET ref_paid = ? WHERE id = ?'),
  addCoins: db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?'),
  touchUser: db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?'),
  addReward: db.prepare('UPDATE users SET points = points + ?, coins = coins + ? WHERE id = ?'),
  insertScore: db.prepare(`INSERT INTO score_events (user_id, game_id, points, coins, won, month, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`),
  monthBoard: db.prepare(`SELECT u.id, u.nickname, u.look, SUM(e.points) AS points, SUM(e.won) AS wins, COUNT(*) AS games
                          FROM score_events e JOIN users u ON u.id = e.user_id
                          WHERE e.month = ? GROUP BY u.id HAVING SUM(e.points) > 0
                          ORDER BY points DESC, wins DESC, MIN(e.created_at) ASC`),
  allTimeBoard: db.prepare(`SELECT u.id, u.nickname, u.look, u.points,
                              (SELECT COALESCE(SUM(won), 0) FROM score_events e WHERE e.user_id = u.id) AS wins
                            FROM users u WHERE u.points > 0 ORDER BY u.points DESC, u.id ASC`),
  ownedItems: db.prepare('SELECT item_id FROM user_items WHERE user_id = ?'),
  ownsItem: db.prepare('SELECT 1 FROM user_items WHERE user_id = ? AND item_id = ?'),
  insertItem: db.prepare('INSERT INTO user_items (user_id, item_id, price, created_at) VALUES (?, ?, ?, ?)'),
  spendCoins: db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?'),
  setLook: db.prepare('UPDATE users SET look = ? WHERE id = ?'),
  activeAds: db.prepare('SELECT * FROM ads WHERE stopped_at IS NULL AND ends_at > ? ORDER BY created_at'),
  activeAdOf: db.prepare('SELECT * FROM ads WHERE user_id = ? AND stopped_at IS NULL AND ends_at > ?'),
  adById: db.prepare('SELECT * FROM ads WHERE id = ?'),
  insertAd: db.prepare(`INSERT INTO ads (user_id, nickname, title, body, theme, plan, price, created_at, ends_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  stopAd: db.prepare('UPDATE ads SET stopped_at = ?, stopped_by = ? WHERE id = ? AND stopped_at IS NULL'),
  insertSession: db.prepare('INSERT INTO sessions (token, user_id, created_at, last_used_at) VALUES (?, ?, ?, ?)'),
  touchSession: db.prepare('UPDATE sessions SET last_used_at = ? WHERE token = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  sessionCount: db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?'),
  upsertRoom: db.prepare(`INSERT INTO rooms (code, game_id, host_id, status, data, created_at, updated_at)
                          VALUES (@code, @gameId, @hostId, @status, @data, @createdAt, @updatedAt)
                          ON CONFLICT(code) DO UPDATE SET host_id = @hostId, status = @status,
                            data = @data, updated_at = @updatedAt`),
  deleteRoom: db.prepare('DELETE FROM rooms WHERE code = ?'),
  allRooms: db.prepare('SELECT data FROM rooms'),
  insertResult: db.prepare(`INSERT INTO game_results (room_code, game_id, winner, players, points, started_at, finished_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`),
};

// Bu qədər girilməyən qonaq hesabının nickname-i başqasına verilə bilər
const GUEST_TTL = 30 * 24 * 3600 * 1000;

const parseLook = (json) => { try { return JSON.parse(json) || {}; } catch { return {}; } };

// Adminlər (.env: PG_ADMINS=nick1,nick2) istənilən elanı dayandıra bilər
const ADMINS = new Set((process.env.PG_ADMINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
const isAdminRow = (row) => ADMINS.has(String(row.nickname).toLowerCase()) && !!row.password_hash;

// Bakı vaxtı ilə gün açarı
const dayKey = (t = Date.now()) => new Date(t + 4 * 3600e3).toISOString().slice(0, 10);

// Bu gün bonus götürülə bilərmi və hansı günə düşür (1..7)
function dailyStatus(row) {
  const today = dayKey();
  const yesterday = dayKey(Date.now() - 86400e3);
  const claimed = row.daily_last === today;
  const continues = row.daily_last === yesterday || claimed;
  const streak = continues ? row.daily_streak || 0 : 0;
  const nextDay = claimed ? ((streak - 1) % shop.DAILY.length) + 1 : (streak % shop.DAILY.length) + 1;
  return { available: !claimed, streak, day: nextDay, rewards: shop.DAILY };
}

function publicUser(row) {
  return {
    daily: dailyStatus(row),
    isAdmin: isAdminRow(row),
    id: row.id,
    nickname: row.nickname,
    points: row.points,
    coins: row.coins,
    look: shop.lookView(parseLook(row.look)),
    hasPassword: !!row.password_hash,
    ref: { code: refCode(row.id), count: q.refPaidCount.get(row.id).n, ...shop.REFERRAL },
  };
}

// ---------- Şifrə (scrypt, əlavə paket lazım deyil) ----------

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function checkPassword(password, stored) {
  if (!stored) return false;
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function newSession(userId) {
  const token = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  q.insertSession.run(token, userId, now, now);
  return token;
}

// Nickname boşdursa (və ya köhnə tərk edilmiş qonaq hesabınındırsa) yeni hesab yaradır.
// password verilməsə qonaq hesabıdır. Nickname tutulubsa null qaytarır.
// Dəvət kodu: istifadəçi nömrəsinin 36-lıq yazılışı (sabit və qısa)
const refCode = (id) => Number(id).toString(36);
const decodeRef = (code) => {
  const c = String(code || '').toLowerCase();
  return /^[0-9a-z]{1,8}$/.test(c) ? parseInt(c, 36) : 0;
};

const createUser = db.transaction(({ nickname, password, ref }) => {
  const existing = q.userByNickname.get(nickname);
  if (existing) {
    if (!isAbandoned(existing)) return null;
    q.deleteUser.run(existing.id);
  }
  const now = Date.now();
  const hash = password ? hashPassword(password) : null;
  const { lastInsertRowid } = q.insertUser.run(nickname, hash, now, now);
  const id = Number(lastInsertRowid);
  const inviter = decodeRef(ref);
  if (inviter && inviter !== id && q.userById.get(inviter)) q.setReferrer.run(inviter, id);
  return { token: newSession(id), user: publicUser(q.userById.get(id)) };
});

// Tərk edilmiş qonaq hesabının nickname-i yenidən istifadə oluna bilər
const isAbandoned = (row) => !row.password_hash && (row.last_seen_at || row.created_at) < Date.now() - GUEST_TTL;

// Nickname-in vəziyyəti: 'free' | 'taken' | 'mine' (selfId-nin özününküdür)
function nicknameStatus(nickname, selfId) {
  const row = q.userByNickname.get(nickname);
  if (!row || isAbandoned(row)) return 'free';
  return row.id === selfId ? 'mine' : 'taken';
}

// Qonaq hesabını qeydiyyatlı hesaba çevirir: xallar, inno, əşyalar qalır, nickname dəyişə bilər.
// Xəta olsa mətn, uğurlu olsa null qaytarır.
const upgradeGuest = db.transaction((userId, nickname, password) => {
  const row = q.userById.get(userId);
  if (!row) return 'Hesab tapılmadı';
  if (row.password_hash) return 'Sən artıq qeydiyyatdan keçmisən';
  const other = q.userByNickname.get(nickname);
  if (other && other.id !== userId) {
    if (!isAbandoned(other)) return 'taken';
    q.deleteUser.run(other.id);
  }
  q.upgradeGuest.run(nickname, hashPassword(password), userId);
  return null;
});

function login(nickname, password) {
  const row = q.userByNickname.get(nickname);
  if (!row || !checkPassword(password, row.password_hash)) return null;
  q.touchUser.run(Date.now(), row.id);
  return { token: newSession(row.id), user: publicUser(row) };
}

function userByToken(token) {
  if (!token || typeof token !== 'string') return null;
  const row = q.userByToken.get(token);
  if (!row) return null;
  const now = Date.now();
  q.touchUser.run(now, row.id);
  q.touchSession.run(now, token);
  return publicUser(row);
}

// Qonaq hesabına şifrə qoyur (xallar qalır). Artıq şifrəsi varsa köhnəsi düzgün olmalıdır.
function setPassword(userId, password, oldPassword) {
  const row = q.userById.get(userId);
  if (!row) return false;
  if (row.password_hash && !checkPassword(oldPassword || '', row.password_hash)) return false;
  q.setPassword.run(hashPassword(password), userId);
  return true;
}

// Çıxış. Şifrəsiz hesabın son girişi bağlanırsa, hesabın özü də silinir (ona bir daha girmək mümkün deyil).
const logout = db.transaction((token) => {
  const row = q.userByToken.get(token);
  if (!row) return;
  q.deleteSession.run(token);
  if (!row.password_hash && q.sessionCount.get(row.id).n === 0) q.deleteUser.run(row.id);
});

function saveRoom(room) {
  q.upsertRoom.run({
    code: room.code,
    gameId: room.gameId,
    hostId: room.hostId,
    status: room.status,
    data: JSON.stringify(room),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  });
}

function deleteRoom(code) {
  q.deleteRoom.run(code);
}

function loadRooms() {
  return q.allRooms.all().map((r) => JSON.parse(r.data));
}

// Nəticəni yazır və qazancları bir tranzaksiyada əlavə edir.
// rewards: { userId: { points, coins, won } }
const saveResult = db.transaction(({ roomCode, gameId, winner, players, rewards = {}, startedAt }) => {
  const now = Date.now();
  const month = monthKey(now);
  q.insertResult.run(roomCode, gameId, winner ?? null, JSON.stringify(players), JSON.stringify(rewards),
    startedAt ?? null, now);
  for (const [userId, r] of Object.entries(rewards)) {
    const id = Number(userId);
    if (!q.userById.get(id)) continue; // oyun zamanı hesabını silən qonaq
    q.addReward.run(r.points, r.coins, id);
    q.insertScore.run(id, gameId, r.points, r.coins, r.won ? 1 : 0, month, now);
    payReferral(id, players);
  }
});

// Dəvət olunan oyunçu ilk oyununu (ən azı 3 nəfərlik) bitirəndə dəvət edən və özü inno alır.
// ref_paid: 0 = gözləyir, 1 = ödənildi, 2 = ödənmədi (dəvət edənin limiti dolub)
function payReferral(userId, players) {
  const row = q.userById.get(userId);
  if (!row || !row.referred_by || row.ref_paid) return;
  if (!Array.isArray(players) || players.length < 3) return;
  const inviter = q.userById.get(row.referred_by);
  if (!inviter) return q.markRefPaid.run(2, userId);
  if (q.refPaidCount.get(inviter.id).n >= shop.REFERRAL.max) return q.markRefPaid.run(2, userId);
  q.addCoins.run(shop.REFERRAL.inviter, inviter.id);
  q.addCoins.run(shop.REFERRAL.invitee, userId);
  q.markRefPaid.run(1, userId);
}

// ---------- Reytinq ----------

function leaderboard(period, userId, limit = 50) {
  // Adminlər reytinqdə görünmür (xalları test/idarə üçündür)
  const rows = (period === 'all' ? q.allTimeBoard.all() : q.monthBoard.all(monthKey()))
    .filter((r) => !ADMINS.has(String(r.nickname).toLowerCase()));
  const toView = (r, i) => ({
    rank: i + 1,
    id: r.id,
    nickname: r.nickname,
    look: shop.lookView(parseLook(r.look)),
    points: r.points,
    wins: r.wins,
  });
  const myIndex = rows.findIndex((r) => r.id === userId);
  return {
    period,
    rewards: getRewards(),
    prizes: getPrizes(),
    lastWinners: lastPrizeWinners(),
    month: monthKey(),
    top: rows.slice(0, limit).map(toView),
    me: myIndex >= 0 ? toView(rows[myIndex], myIndex) : null,
    total: rows.length,
  };
}

// ---------- Mağaza ----------

function ownedItems(userId) {
  return q.ownedItems.all(userId).map((r) => r.item_id);
}

// Uğurlu olsa null, olmasa istifadəçiyə göstəriləcək xəta mətni qaytarır
const buyItem = db.transaction((userId, itemId) => {
  const item = shop.byId.get(itemId);
  if (!item) return 'Belə əşya yoxdur';
  if (!q.userById.get(userId).password_hash) return 'needs-account';
  if (q.ownsItem.get(userId, itemId)) return 'Bu artıq səndədir';
  const price = shop.priceOf(item); // həftənin təklifi endirimli
  if (q.spendCoins.run(price, userId, price).changes === 0) return 'Kifayət qədər inno yoxdur';
  q.insertItem.run(userId, itemId, price, Date.now());
  return null;
});

// Gündəlik bonusu götür: { coins, day, streak } və ya { error }
const claimDaily = db.transaction((userId) => {
  const row = q.userById.get(userId);
  if (!row) return { error: 'Hesab tapılmadı' };
  const st = dailyStatus(row);
  if (!st.available) return { error: 'Bu günün bonusu artıq götürülüb' };
  const coins = shop.DAILY[st.day - 1];
  db.prepare('UPDATE users SET coins = coins + ?, daily_last = ?, daily_streak = ? WHERE id = ?').run(coins, dayKey(), st.streak + 1, userId);
  return { coins, day: st.day, streak: st.streak + 1 };
});

// Giriş ekranı üçün canlılıq göstəricisi
function publicStats() {
  const dayAgo = Date.now() - 86400e3;
  return { gamesToday: db.prepare('SELECT COUNT(*) n FROM game_results WHERE finished_at > ?').get(dayAgo).n };
}

// itemId null olsa həmin növü çıxarır
// Pulsuz personaj redaktoru: look.char = { skin, hair, hairColor, shirt }
function setChar(userId, char) {
  const c = shop.cleanChar(char);
  if (!c) return 'Düzgün seçim deyil';
  const row = q.userById.get(userId);
  const look = parseLook(row.look);
  look.char = c;
  q.setLook.run(JSON.stringify(look), userId);
  lookCache.delete(userId);
  return null;
}

function equip(userId, type, itemId) {
  if (!shop.TYPES.some((t) => t.id === type)) return 'Belə növ yoxdur';
  const row = q.userById.get(userId);
  const look = parseLook(row.look);
  if (itemId) {
    const item = shop.byId.get(itemId);
    if (!item || item.type !== type) return 'Belə əşya yoxdur';
    if (!q.ownsItem.get(userId, itemId)) return 'Əvvəlcə bu əşyanı al';
    look[type] = itemId;
  } else {
    delete look[type];
  }
  q.setLook.run(JSON.stringify(look), userId);
  lookCache.delete(userId);
  return null;
}

// ---------- Reklam ----------

const adView = (a) => ({ id: a.id, userId: a.user_id, nickname: a.nickname, title: a.title, body: a.body, theme: a.theme, endsAt: a.ends_at });

function activeAds() {
  return q.activeAds.all(Date.now()).map(adView);
}

function myAd(userId) {
  const a = q.activeAdOf.get(userId, Date.now());
  return a ? adView(a) : null;
}

// Uğurlu olsa { ad }, olmasa { error } qaytarır (mətnlər artıq yoxlanılıb)
const createAd = db.transaction((userId, { title, body, theme, planId }) => {
  const plan = shop.AD_PLANS.find((p) => p.id === planId);
  if (!plan) return { error: 'Belə paket yoxdur' };
  if (!shop.AD_THEMES.includes(theme)) return { error: 'Belə rəng yoxdur' };
  const row = q.userById.get(userId);
  if (!row.password_hash) return { error: 'needs-account' };
  const now = Date.now();
  if (q.activeAdOf.get(userId, now)) return { error: 'Artıq aktiv elanın var' };
  if (q.activeAds.all(now).length >= shop.AD_LIMITS.maxActive) return { error: 'Hazırda bütün yerlər doludur, bir az sonra yoxla' };
  if (q.spendCoins.run(plan.price, userId, plan.price).changes === 0) return { error: 'Kifayət qədər inno yoxdur' };
  const { lastInsertRowid } = q.insertAd.run(userId, row.nickname, title, body, theme, plan.id, plan.price, now, now + plan.days * 86400000);
  return { ad: adView(q.adById.get(Number(lastInsertRowid))) };
});

// Sahibi öz elanını, admin istənilən elanı dayandırır (inno qaytarılmır)
function stopAd(userId, adId) {
  const row = q.userById.get(userId);
  const ad = q.adById.get(adId);
  if (!row || !ad) return 'Elan tapılmadı';
  const admin = isAdminRow(row);
  if (ad.user_id !== userId && !admin) return 'Bu elan sənin deyil';
  q.stopAd.run(Date.now(), admin && ad.user_id !== userId ? `admin:${row.nickname}` : 'owner', adId);
  return null;
}

// ---------- Ayarlar ----------

let rewardsCache = null;
const clampReward = (n) => Math.max(0, Math.min(100000, Math.trunc(Number(n)) || 0));

// { win: { points, coins }, lose: { points, coins } }
// ---------- Qiymətlər (admin paneldən dəyişir) ----------
// Əşya, inno paketi, başlanğıc paketi və reklam qiymətləri settings cədvəlində saxlanılır və shop obyektlərinin üzərinə tətbiq olunur.
const defaultPrices = {
  items: Object.fromEntries(shop.ITEMS.map((i) => [i.id, i.price])),
  packs: shop.INNO_PACKS.map((p) => ({ ...p })),
  starter: { ...shop.STARTER_PACK },
  ads: Object.fromEntries(shop.AD_PLANS.map((p) => [p.id, p.price])),
};
function applyPrices(v) {
  for (const i of shop.ITEMS) if (v.items && Number.isInteger(v.items[i.id])) i.price = v.items[i.id];
  (v.packs || []).forEach((p, idx) => { if (shop.INNO_PACKS[idx] && p) { shop.INNO_PACKS[idx].inno = p.inno; shop.INNO_PACKS[idx].price = p.price; } });
  if (v.starter) { shop.STARTER_PACK.inno = v.starter.inno; shop.STARTER_PACK.price = v.starter.price; }
  for (const p of shop.AD_PLANS) if (v.ads && Number.isInteger(v.ads[p.id])) p.price = v.ads[p.id];
}
function currentPrices() {
  return {
    items: Object.fromEntries(shop.ITEMS.map((i) => [i.id, i.price])),
    packs: shop.INNO_PACKS.map((p) => ({ inno: p.inno, price: p.price })),
    starter: { inno: shop.STARTER_PACK.inno, price: shop.STARTER_PACK.price },
    ads: Object.fromEntries(shop.AD_PLANS.map((p) => [p.id, p.price])),
  };
}
function getPrices() {
  const cur = currentPrices();
  const d = defaultPrices;
  return {
    types: shop.TYPES,
    items: shop.ITEMS.map((i) => ({ id: i.id, type: i.type, name: i.name, price: cur.items[i.id], def: d.items[i.id] })),
    packs: cur.packs.map((p, idx) => ({ ...p, defInno: d.packs[idx].inno, defPrice: d.packs[idx].price })),
    starter: { ...cur.starter, defInno: d.starter.inno, defPrice: d.starter.price },
    ads: shop.AD_PLANS.map((p) => ({ id: p.id, days: p.days, price: cur.ads[p.id], def: d.ads[p.id] })),
  };
}
function setPrices(b) {
  const int = (n, max) => (Number.isInteger(n) && n >= 1 && n <= max ? n : null);
  const money = (n) => (typeof n === 'number' && isFinite(n) && n >= 0.01 && n <= 10000 ? Math.round(n * 100) / 100 : null);
  const cur = currentPrices();
  const next = { items: { ...cur.items }, packs: cur.packs.map((p) => ({ ...p })), starter: { ...cur.starter }, ads: { ...cur.ads } };
  for (const [id, raw] of Object.entries(b.items || {})) {
    if (!(id in next.items)) continue;
    const n = int(Number(raw), 100000);
    if (n == null) return { error: `Əşya qiyməti düzgün deyil: ${shop.byId.get(id).name}` };
    next.items[id] = n;
  }
  if (Array.isArray(b.packs)) {
    for (let idx = 0; idx < next.packs.length; idx++) {
      const p = b.packs[idx];
      if (!p) continue;
      const inno = int(Number(p.inno), 1000000); const price = money(Number(p.price));
      if (inno == null || price == null) return { error: `${idx + 1}-ci inno paketinin məlumatı düzgün deyil` };
      next.packs[idx] = { inno, price };
    }
  }
  if (b.starter) {
    const inno = int(Number(b.starter.inno), 1000000); const price = money(Number(b.starter.price));
    if (inno == null || price == null) return { error: 'Başlanğıc paketinin məlumatı düzgün deyil' };
    next.starter = { inno, price };
  }
  for (const [id, raw] of Object.entries(b.ads || {})) {
    if (!(id in next.ads)) continue;
    const n = int(Number(raw), 100000);
    if (n == null) return { error: 'Reklam qiyməti düzgün deyil' };
    next.ads[id] = n;
  }
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('prices', ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(JSON.stringify(next), Date.now());
  applyPrices(next);
  return { prices: getPrices() };
}
function resetPrices() {
  db.prepare("DELETE FROM settings WHERE key = 'prices'").run();
  applyPrices(defaultPrices);
  return getPrices();
}
(() => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'prices'").get();
  try { if (row) applyPrices(JSON.parse(row.value)); } catch (e) { console.error('prices:', e.message); }
})();

function getRewards() {
  if (!rewardsCache) {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'rewards'").get();
    let v = null;
    try { v = row && JSON.parse(row.value); } catch {}
    const d = shop.DEFAULT_REWARDS;
    rewardsCache = {
      win: { points: clampReward(v?.win?.points ?? d.win.points), coins: clampReward(v?.win?.coins ?? d.win.coins) },
      lose: { points: clampReward(v?.lose?.points ?? d.lose.points), coins: clampReward(v?.lose?.coins ?? d.lose.coins) },
    };
  }
  return rewardsCache;
}

function setRewards(r) {
  const v = {
    win: { points: clampReward(r?.win?.points), coins: clampReward(r?.win?.coins) },
    lose: { points: clampReward(r?.lose?.points), coins: clampReward(r?.lose?.coins) },
  };
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES ('rewards', ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(JSON.stringify(v), Date.now());
  rewardsCache = v;
  return v;
}

// ---------- Aylıq mükafat ----------

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  try { return row ? JSON.parse(row.value) : undefined; } catch { return undefined; }
}
function putSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, JSON.stringify(value), Date.now());
}

// [1-ci, 2-ci, 3-cü yer]; 0 = həmin yerə mükafat yoxdur
function getPrizes() {
  const v = getSetting('prizes');
  return (Array.isArray(v) ? v : shop.DEFAULT_PRIZES).slice(0, 3).map(clampReward);
}
function setPrizes(arr) {
  const v = [0, 1, 2].map((i) => clampReward(arr && arr[i]));
  putSetting('prizes', v);
  return v;
}

function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

// Keçən ayın qaliblərinə inno ver (bir dəfə). Adminlər və "seed" (saxta) hesablar mükafat almır.
// Qalib olanların id-lərini qaytarır.
const awardMonth = db.transaction((month) => {
  if (getSetting(`prizes_done:${month}`)) return [];
  const prizes = getPrizes();
  const seed = new Set(db.prepare("SELECT DISTINCT user_id AS id FROM score_events WHERE game_id = 'seed'").all().map((r) => r.id));
  const rows = q.monthBoard.all(month)
    .filter((r) => !ADMINS.has(String(r.nickname).toLowerCase()) && !seed.has(r.id))
    .slice(0, 3);
  const now = Date.now();
  const winners = [];
  rows.forEach((r, i) => {
    if (!prizes[i]) return;
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(prizes[i], r.id);
    db.prepare('INSERT INTO month_prizes (month, rank, user_id, nickname, points, coins, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(month, i + 1, r.id, r.nickname, r.points, prizes[i], now);
    winners.push(r.id);
  });
  putSetting(`prizes_done:${month}`, { at: now, winners });
  return winners;
});

// Yeni ay başlayıbsa keçən ayı yekunlaşdır
function runMonthlyPrizes() {
  return awardMonth(prevMonthKey(monthKey()));
}

function lastPrizeWinners() {
  const last = db.prepare('SELECT month FROM month_prizes ORDER BY month DESC LIMIT 1').get();
  if (!last) return null;
  return { month: last.month, list: db.prepare('SELECT rank, nickname, points, coins FROM month_prizes WHERE month = ? ORDER BY rank').all(last.month) };
}

// ---------- Müraciətlər (təklif / şikayət) ----------

const FEEDBACK_KINDS = ['idea', 'complaint', 'bug', 'other'];

function addFeedback(userId, kind, text) {
  const row = q.userById.get(userId);
  const recent = db.prepare('SELECT COUNT(*) n FROM feedback WHERE user_id = ? AND created_at > ?').get(userId, Date.now() - 86400e3).n;
  if (recent >= 5) return 'Bu gün çox müraciət göndərmisən, sabah yenə yaz';
  db.prepare('INSERT INTO feedback (user_id, nickname, kind, text, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, row.nickname, kind, text, Date.now());
  return null;
}

function adminFeedback(status = 'all') {
  const where = status === 'new' ? "WHERE status = 'new'" : '';
  return db.prepare(`SELECT * FROM feedback ${where} ORDER BY (status = 'new') DESC, created_at DESC LIMIT 200`).all()
    .map((f) => ({ id: f.id, userId: f.user_id, nickname: f.nickname, kind: f.kind, text: f.text, status: f.status, createdAt: f.created_at }));
}
const setFeedbackStatus = (id, status) => db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, id).changes;
const deleteFeedback = (id) => db.prepare('DELETE FROM feedback WHERE id = ?').run(id).changes;

// ---------- Rəylər (hamıya açıq) ----------

const reviewView = (r) => ({
  id: r.id, userId: r.user_id, nickname: r.nickname, stars: r.stars, text: r.text, hidden: !!r.hidden,
  look: r.user_id ? lookOf(r.user_id) : null, createdAt: r.created_at, updatedAt: r.updated_at,
});

function publicReviews(userId) {
  const visible = db.prepare('SELECT * FROM reviews WHERE hidden = 0 ORDER BY updated_at DESC').all();
  const dist = [0, 0, 0, 0, 0];
  for (const r of visible) dist[r.stars - 1] += 1;
  const count = visible.length;
  const avg = count ? Math.round((visible.reduce((a, r) => a + r.stars, 0) / count) * 10) / 10 : 0;
  const mine = userId ? db.prepare('SELECT * FROM reviews WHERE user_id = ?').get(userId) : null;
  return { avg, count, dist, list: visible.slice(0, 100).map(reviewView), mine: mine ? reviewView(mine) : null };
}

function upsertReview(userId, stars, text) {
  const row = q.userById.get(userId);
  const now = Date.now();
  db.prepare(`INSERT INTO reviews (user_id, nickname, stars, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET nickname = excluded.nickname, stars = excluded.stars, text = excluded.text, updated_at = excluded.updated_at`)
    .run(userId, row.nickname, stars, text, now, now);
}
const deleteOwnReview = (userId) => db.prepare('DELETE FROM reviews WHERE user_id = ?').run(userId).changes;
const adminReviews = () => db.prepare('SELECT * FROM reviews ORDER BY updated_at DESC LIMIT 300').all().map(reviewView);
const setReviewHidden = (id, hidden) => db.prepare('UPDATE reviews SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, id).changes;
const deleteReview = (id) => db.prepare('DELETE FROM reviews WHERE id = ?').run(id).changes;

// ---------- Admin ----------

function adminStats() {
  const now = Date.now();
  const dayAgo = now - 86400000;
  const n = (sql, ...a) => db.prepare(sql).get(...a).n;
  return {
    users: n('SELECT COUNT(*) n FROM users'),
    seedUsers: n(`SELECT COUNT(*) n FROM users WHERE ${SEED_SQL}`),
    newFeedback: n("SELECT COUNT(*) n FROM feedback WHERE status = 'new'"),
    reviews: n('SELECT COUNT(*) n FROM reviews'),
    registered: n('SELECT COUNT(*) n FROM users WHERE password_hash IS NOT NULL'),
    activeToday: n('SELECT COUNT(*) n FROM users WHERE last_seen_at > ?', dayAgo),
    games: n('SELECT COUNT(*) n FROM game_results'),
    gamesToday: n('SELECT COUNT(*) n FROM game_results WHERE finished_at > ?', dayAgo),
    activeAds: n('SELECT COUNT(*) n FROM ads WHERE stopped_at IS NULL AND ends_at > ?', now),
    // Adminlərin innosu (test/idarə üçün) dövriyyəyə daxil deyil
    coins: db.prepare('SELECT nickname, coins FROM users').all()
      .filter((r) => !ADMINS.has(String(r.nickname).toLowerCase()))
      .reduce((sum, r) => sum + r.coins, 0),
  };
}

// Saxta (reytinqi canlandırmaq üçün yaradılmış) hesab: score_events.game_id = 'seed'
const SEED_SQL = "EXISTS (SELECT 1 FROM score_events e WHERE e.user_id = users.id AND e.game_id = 'seed')";

// kind: 'all' | 'real' | 'seed'
function adminUsers(search = '', kind = 'all') {
  const where = kind === 'seed' ? `AND ${SEED_SQL}` : kind === 'real' ? `AND NOT ${SEED_SQL}` : '';
  return db.prepare(`SELECT id, nickname, password_hash IS NOT NULL AS registered, points, coins, look, created_at, last_seen_at, ${SEED_SQL} AS seed
                     FROM users WHERE nickname LIKE ? ESCAPE '\\' ${where} ORDER BY ${SEED_SQL} ASC, COALESCE(last_seen_at, created_at) DESC LIMIT 200`)
    .all(`%${String(search).replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    .map((r) => ({
      id: r.id, nickname: r.nickname, registered: !!r.registered, points: r.points, coins: r.coins, seed: !!r.seed,
      look: shop.lookView(parseLook(r.look)), createdAt: r.created_at, lastSeenAt: r.last_seen_at, isAdmin: isAdminRow({ ...r, password_hash: r.registered ? 'x' : null }),
    }));
}

// Bütün saxta hesabları sil; silinən sayını qaytarır
const adminDeleteSeed = db.transaction(() => {
  const ids = db.prepare(`SELECT id FROM users WHERE ${SEED_SQL}`).all().map((r) => r.id);
  for (const id of ids) { q.deleteUser.run(id); lookCache.delete(id); }
  return ids.length;
});

// Admin xalı dəyişəndə fərq aylıq reytinqə də yazılır (game_id = 'admin')
function adminPointsEvent(userId, delta, now = Date.now()) {
  if (delta) q.insertScore.run(userId, 'admin', delta, 0, 0, monthKey(now), now);
}

// Admin tərəfindən qeydiyyatlı hesab yaratmaq. { id } və ya { error }
const adminCreateUser = db.transaction(({ nickname, password, points, coins }) => {
  const existing = q.userByNickname.get(nickname);
  if (existing) {
    if (!isAbandoned(existing)) return { error: 'taken' };
    q.deleteUser.run(existing.id);
  }
  const now = Date.now();
  const id = Number(q.insertUser.run(nickname, hashPassword(password), now, null).lastInsertRowid);
  db.prepare('UPDATE users SET points = ?, coins = ? WHERE id = ?').run(points, coins, id);
  adminPointsEvent(id, points, now);
  return { id };
});

// Hesabı redaktə: patch = { nickname?, points?, coins?, password? }. { renamed, passwordChanged } və ya { error }
const adminUpdateUser = db.transaction((userId, patch) => {
  const row = q.userById.get(userId);
  if (!row) return { error: 'Hesab tapılmadı' };
  const out = { renamed: false, passwordChanged: false };
  if (patch.nickname != null && patch.nickname !== row.nickname) {
    if (isAdminRow(row)) return { error: 'Admin hesabının nickname-i .env faylından idarə olunur' };
    const other = q.userByNickname.get(patch.nickname);
    if (other && other.id !== userId) {
      if (!isAbandoned(other)) return { error: 'taken' };
      q.deleteUser.run(other.id);
    }
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(patch.nickname, userId);
    out.renamed = true;
  }
  if (patch.points != null && patch.points !== row.points) {
    db.prepare('UPDATE users SET points = ? WHERE id = ?').run(patch.points, userId);
    adminPointsEvent(userId, patch.points - row.points);
  }
  if (patch.coins != null) db.prepare('UPDATE users SET coins = ? WHERE id = ?').run(patch.coins, userId);
  if (patch.password) {
    q.setPassword.run(hashPassword(patch.password), userId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); // köhnə girişlər bağlanır
    out.passwordChanged = true;
  }
  lookCache.delete(userId);
  return out;
});

// Balansı dəyişir (mənfi olmur); yeni balansı qaytarır
function adminAddCoins(userId, delta) {
  const row = q.userById.get(userId);
  if (!row) return null;
  const coins = Math.max(0, row.coins + delta);
  db.prepare('UPDATE users SET coins = ? WHERE id = ?').run(coins, userId);
  return coins;
}

// Hesabı silir: girişlər, xal tarixçəsi, əşyalar kaskadla gedir; aktiv elanları dayandırılır
const adminDeleteUser = db.transaction((userId, adminNick) => {
  const row = q.userById.get(userId);
  if (!row) return 'Hesab tapılmadı';
  if (isAdminRow(row)) return 'Admin hesabını silmək olmaz';
  db.prepare('UPDATE ads SET stopped_at = ?, stopped_by = ? WHERE user_id = ? AND stopped_at IS NULL').run(Date.now(), `admin:${adminNick}`, userId);
  q.deleteUser.run(userId);
  lookCache.delete(userId);
  return null;
});

function adminAds() {
  const now = Date.now();
  return db.prepare('SELECT * FROM ads ORDER BY created_at DESC LIMIT 100').all().map((a) => ({
    ...adView(a),
    createdAt: a.created_at,
    price: a.price,
    status: a.stopped_at ? 'stopped' : a.ends_at > now ? 'active' : 'ended',
    stoppedBy: a.stopped_by,
  }));
}

// Otaqda hər yayımda lazım olur, ona görə yaddaşda saxlanır
const lookCache = new Map();
function lookOf(userId) {
  if (!lookCache.has(userId)) {
    const row = q.userById.get(userId);
    lookCache.set(userId, row ? shop.lookView(parseLook(row.look)) : null);
  }
  return lookCache.get(userId);
}

// ---------- Dostluq və şəxsi mesajlar ----------

const pair = (x, y) => (x < y ? [x, y] : [y, x]);
const friendRow = (x, y) => { const [a, b] = pair(x, y); return db.prepare('SELECT * FROM friends WHERE a = ? AND b = ?').get(a, b); };
const isRegistered = (id) => { const r = q.userById.get(id); return !!(r && r.password_hash); };

function friendStatus(viewerId, otherId) {
  if (viewerId === otherId) return 'self';
  const f = friendRow(viewerId, otherId);
  if (!f) return 'none';
  if (f.status === 'accepted') return 'friends';
  return f.requester === viewerId ? 'sent' : 'received';
}

// Digər oyunçunun profili (oyundan nickə basanda)
function profileOf(viewerId, targetId) {
  const row = q.userById.get(targetId);
  if (!row) return null;
  const st = db.prepare('SELECT COALESCE(SUM(won),0) AS wins, COUNT(*) AS games FROM score_events WHERE user_id = ? AND game_id NOT IN (\'seed\', \'admin\')').get(targetId);
  return {
    id: row.id, nickname: row.nickname, look: shop.lookView(parseLook(row.look)), points: row.points,
    wins: st.wins, games: st.games, registered: !!row.password_hash, status: friendStatus(viewerId, targetId),
  };
}

// Uğurlu olsa { status }, olmasa { error }
function friendRequest(fromId, toId) {
  if (fromId === toId) return { error: 'Özünə dostluq göndərə bilməzsən' };
  if (!isRegistered(fromId)) return { error: 'needs-account' };
  const target = q.userById.get(toId);
  if (!target) return { error: 'Oyunçu tapılmadı' };
  if (!target.password_hash) return { error: 'Bu oyunçu qonaqdır (hesabı yoxdur), dostluq göndərmək olmur' };
  const f = friendRow(fromId, toId);
  const [a, b] = pair(fromId, toId);
  if (f && f.status === 'accepted') return { error: 'Artıq dostsunuz' };
  if (f && f.requester === fromId) return { error: 'Sorğu artıq göndərilib' };
  if (f) { // qarşı tərəf əvvəl göndəribsə, birbaşa qəbul olunur
    db.prepare("UPDATE friends SET status = 'accepted' WHERE a = ? AND b = ?").run(a, b);
    return { status: 'friends' };
  }
  const n = db.prepare("SELECT COUNT(*) AS n FROM friends WHERE requester = ? AND status = 'pending'").get(fromId).n;
  if (n >= 30) return { error: 'Çox gözləyən sorğun var, bir az gözlə' };
  db.prepare("INSERT INTO friends (a, b, status, requester, created_at) VALUES (?, ?, 'pending', ?, ?)").run(a, b, fromId, Date.now());
  return { status: 'sent' };
}

function friendRespond(userId, otherId, accept) {
  const f = friendRow(userId, otherId);
  if (!f || f.status !== 'pending' || f.requester === userId) return { error: 'Sorğu tapılmadı' };
  const [a, b] = pair(userId, otherId);
  if (accept) db.prepare("UPDATE friends SET status = 'accepted' WHERE a = ? AND b = ?").run(a, b);
  else db.prepare('DELETE FROM friends WHERE a = ? AND b = ?').run(a, b);
  return { status: accept ? 'friends' : 'none' };
}

function friendRemove(userId, otherId) {
  const [a, b] = pair(userId, otherId);
  db.prepare('DELETE FROM friends WHERE a = ? AND b = ?').run(a, b);
  return { status: 'none' };
}

const friendIds = (userId) => db.prepare("SELECT CASE WHEN a = ? THEN b ELSE a END AS id FROM friends WHERE status = 'accepted' AND (a = ? OR b = ?)").all(userId, userId, userId).map((r) => r.id);

// Dostlar, gələn və göndərilən sorğular, oxunmamış mesajlar
function socialOverview(userId) {
  const rows = db.prepare('SELECT * FROM friends WHERE a = ? OR b = ?').all(userId, userId);
  const info = (id) => { const r = q.userById.get(id); return r ? { id, nickname: r.nickname, look: shop.lookView(parseLook(r.look)), invisible: !!r.invisible } : null; };
  const unread = new Map(db.prepare('SELECT from_id, COUNT(*) AS n FROM dms WHERE to_id = ? AND read_at IS NULL GROUP BY from_id').all(userId).map((r) => [r.from_id, r.n]));
  const last = (id) => db.prepare('SELECT text, from_id, created_at FROM dms WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY id DESC LIMIT 1').get(userId, id, id, userId);
  const friends = [], incoming = [], outgoing = [];
  for (const r of rows) {
    const other = r.a === userId ? r.b : r.a;
    const u = info(other);
    if (!u) continue;
    if (r.status === 'accepted') friends.push({ ...u, unread: unread.get(other) || 0, last: last(other) || null });
    else if (r.requester === userId) outgoing.push(u);
    else incoming.push(u);
  }
  return { friends, incoming, outgoing, unread: [...unread.values()].reduce((x, y) => x + y, 0), invisible: !!(q.userById.get(userId) || {}).invisible };
}

function dmSend(fromId, toId, text) {
  if (!isRegistered(fromId)) return { error: 'needs-account' };
  const f = friendRow(fromId, toId);
  if (!f || f.status !== 'accepted') return { error: 'Mesaj yazmaq üçün dost olmalısınız' };
  const now = Date.now();
  const lastMsg = db.prepare('SELECT created_at FROM dms WHERE from_id = ? ORDER BY id DESC LIMIT 1').get(fromId);
  if (lastMsg && now - lastMsg.created_at < 500) return { error: 'Bir az yavaş yaz' };
  const id = Number(db.prepare('INSERT INTO dms (from_id, to_id, text, created_at) VALUES (?, ?, ?, ?)').run(fromId, toId, text, now).lastInsertRowid);
  return { message: { id, from: fromId, to: toId, text, at: now } };
}

// Söhbət tarixçəsi (son 80) və oxunmuş kimi işarələ
function dmHistory(userId, otherId) {
  const f = friendRow(userId, otherId);
  if (!f || f.status !== 'accepted') return { error: 'Bu oyunçu dostun deyil' };
  db.prepare('UPDATE dms SET read_at = ? WHERE to_id = ? AND from_id = ? AND read_at IS NULL').run(Date.now(), userId, otherId);
  const rows = db.prepare('SELECT * FROM dms WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY id DESC LIMIT 80').all(userId, otherId, otherId, userId).reverse();
  return { messages: rows.map((m) => ({ id: m.id, from: m.from_id, text: m.text, at: m.created_at })) };
}

function searchUsers(viewerId, text, withBots = false) {
  const t = String(text || '').trim().slice(0, 20);
  if (t.length < 2) return [];
  const rows = db.prepare("SELECT id, nickname, look FROM users WHERE password_hash IS NOT NULL AND id != ? AND nickname LIKE ? ESCAPE '\\' ORDER BY length(nickname), nickname LIMIT 8").all(viewerId, `${t.replace(/[%_\\]/g, '\\$&')}%`);
  return rows.filter((r) => withBots || !/_bot$/.test(r.nickname)).map((r) => ({ id: r.id, nickname: r.nickname, look: shop.lookView(parseLook(r.look)), status: friendStatus(viewerId, r.id) }));
}

// Test rejimi botları: real hesablardır (nickname _bot ilə bitir), dostluq və mesajlaşmanı sınamaq üçün
function ensureBot(name) {
  const nick = `${name}_bot`;
  const row = q.userByNickname.get(nick);
  if (row) return { id: row.id, nickname: row.nickname };
  const id = Number(q.insertUser.run(nick, hashPassword(crypto.randomBytes(12).toString('hex')), Date.now(), null).lastInsertRowid);
  return { id, nickname: nick };
}
function isBot(userId) {
  const r = q.userById.get(userId);
  return !!(r && /_bot$/.test(r.nickname) && r.password_hash);
}

function setInvisible(userId, on) {
  db.prepare('UPDATE users SET invisible = ? WHERE id = ?').run(on ? 1 : 0, userId);
}
const isInvisible = (userId) => !!(q.userById.get(userId) || {}).invisible;


// ---------- İnno sifarişləri ----------

const OPEN_ORDER = ['requested', 'link_sent', 'claimed'];
const orderRow = (r) => r && ({
  id: r.id, userId: r.user_id, inno: r.inno, price: r.price, starter: !!r.starter, status: r.status, provider: r.provider,
  payLink: r.pay_link, tgMsgId: r.tg_msg_id, tgClaimId: r.tg_claim_id, createdAt: r.created_at, paidAt: r.paid_at,
});

function nicknameOf(userId) {
  const r = q.userById.get(userId);
  return r ? r.nickname : null;
}
function innoOrder(id) {
  return orderRow(db.prepare('SELECT * FROM inno_orders WHERE id = ?').get(id));
}
function innoOrderByMsg(msgId) {
  return orderRow(db.prepare('SELECT * FROM inno_orders WHERE tg_msg_id = ? OR tg_claim_id = ?').get(msgId, msgId));
}
function innoOrdersOf(userId, limit = 5) {
  return db.prepare('SELECT * FROM inno_orders WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit).map(orderRow);
}
// Yeni sifariş: eyni vaxtda ən çox 2 açıq sifariş; başlanğıc paketi yalnız bir dəfə
function createInnoOrder(userId, inno, price, starter) {
  return db.transaction(() => {
    const open = db.prepare(`SELECT COUNT(*) AS n FROM inno_orders WHERE user_id = ? AND status IN ('requested','link_sent','claimed')`).get(userId).n;
    if (open >= 2) return { error: 'Açıq sifarişin var. Əvvəlcə onu tamamla və ya ləğv et' };
    if (starter) {
      const used = db.prepare(`SELECT COUNT(*) AS n FROM inno_orders WHERE user_id = ? AND starter = 1 AND status != 'cancelled'`).get(userId).n;
      if (used) return { error: 'Başlanğıc paketi yalnız bir dəfə alınır' };
    }
    const now = Date.now();
    const r = db.prepare(`INSERT INTO inno_orders (user_id, inno, price, starter, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'requested', ?, ?)`)
      .run(userId, inno, price, starter ? 1 : 0, now, now);
    return { order: innoOrder(r.lastInsertRowid) };
  })();
}
function updateInnoOrder(id, fields) {
  const map = { status: 'status', payLink: 'pay_link', tgMsgId: 'tg_msg_id', tgClaimId: 'tg_claim_id' };
  const sets = []; const vals = [];
  for (const [k, col] of Object.entries(map)) if (k in fields) { sets.push(`${col} = ?`); vals.push(fields[k]); }
  db.prepare(`UPDATE inno_orders SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(...vals, Date.now(), id);
}
// Ödəniş təsdiqi: inno yalnız bir dəfə yazılır (açıq sifariş -> paid, eyni transaksiyada balans artır)
const confirmInnoOrder = db.transaction((id) => {
  const o = innoOrder(id);
  if (!o) return { error: 'Sifariş tapılmadı' };
  if (!OPEN_ORDER.includes(o.status)) return { error: o.status === 'paid' ? 'Bu sifariş artıq təsdiqlənib' : 'Sifariş ləğv olunub' };
  if (!q.userById.get(o.userId)) return { error: 'Hesab silinib' };
  const now = Date.now();
  db.prepare(`UPDATE inno_orders SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ?`).run(now, now, id);
  db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(o.inno, o.userId);
  return { order: innoOrder(id) };
});
function cancelInnoOrder(id, userId) {
  const o = innoOrder(id);
  if (!o || (userId != null && o.userId !== userId)) return { error: 'Sifariş tapılmadı' };
  if (!['requested', 'link_sent'].includes(o.status)) return { error: 'Bu mərhələdə ləğv etmək olmaz' };
  updateInnoOrder(id, { status: 'cancelled' });
  return { order: innoOrder(id) };
}

module.exports = {
  profileOf, searchUsers, ensureBot, isBot, friendRequest, friendRespond, friendRemove, friendIds, socialOverview, dmSend, dmHistory, setInvisible, isInvisible, friendStatus,
  createUser, login, logout, setPassword, userByToken, nicknameStatus, upgradeGuest,
  saveRoom, deleteRoom, loadRooms, saveResult,
  leaderboard, ownedItems, buyItem, equip, setChar, lookOf, monthKey,
  activeAds, myAd, createAd, stopAd, claimDaily, publicStats,
  getPrices, setPrices, resetPrices, getRewards, setRewards, getPrizes, setPrizes, runMonthlyPrizes, awardMonth, lastPrizeWinners, prevMonthKey,
  adminStats, adminUsers, adminDeleteSeed,
  nicknameOf, innoOrder, innoOrderByMsg, innoOrdersOf, createInnoOrder, updateInnoOrder, confirmInnoOrder, cancelInnoOrder,
  FEEDBACK_KINDS, addFeedback, adminFeedback, setFeedbackStatus, deleteFeedback,
  publicReviews, upsertReview, deleteOwnReview, adminReviews, setReviewHidden, deleteReview, adminAddCoins, adminDeleteUser, adminAds, adminCreateUser, adminUpdateUser,
};
