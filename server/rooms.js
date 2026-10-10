const crypto = require('crypto');
const db = require('./db');
const games = require('./games');
const { UserError } = require('./errors');
const { findProfanity } = require('./profanity');


const ROOM_LANGS = ['az', 'ru', 'en'];
const normLangs = (arr, fallback = ['az']) => {
  const list = (Array.isArray(arr) ? arr : []).filter((l, i, a) => ROOM_LANGS.includes(l) && a.indexOf(l) === i);
  return list.length ? ROOM_LANGS.filter((l) => list.includes(l)) : fallback;
};

const ROOM_TTL = 6 * 3600 * 1000; // bu qədər aktivlik olmayan otaq silinir
const EMPTY_ROOM_TTL = 30 * 60 * 1000; // heç kim onlayn deyilsə
const FINISHED_ROOM_TTL = 5 * 60 * 1000; // oyun bitəndən sonra yeni oyun başlamasa otaq bağlanır
const AUTO_START_MS = 25 * 1000; // açıq otaqda minimum say yığılandan sonra avtomatik başlama
const AUTO_START_FULL_MS = 4 * 1000; // otaq dolanda

class RoomManager {
  constructor(io, isOnline) {
    this.io = io;
    this.isOnline = isOnline;
    this.rooms = new Map(); // code -> room
    this.byUser = new Map(); // userId -> code
    this.timers = new Map(); // code -> timeout
    this.closeTimers = new Map(); // code -> bağlanma taymeri
    this.autoTimers = new Map(); // code -> avtomatik başlama taymeri
    this.botTimers = new Map(); // code -> test botlarının taymeri
  }

  // Server başlayanda aktiv otaqları bazadan geri yüklə və taymerləri bərpa et
  restore() {
    const now = Date.now();
    for (const room of db.loadRooms()) {
      if (now - room.updatedAt > ROOM_TTL || !games.get(room.gameId) || room.test) {
        db.deleteRoom(room.code);
        continue;
      }
      // Bu qayda gəlməmişdən əvvəl bitmiş otaqlar: bitmə vaxtından say
      if (room.status !== 'playing' && room.resultSaved && !room.closesAt) room.closesAt = room.updatedAt + FINISHED_ROOM_TTL;
      this.rooms.set(room.code, room);
      for (const p of room.players) this.byUser.set(p.id, room.code);
      this.schedule(room);
      this.scheduleClose(room);
      this.scheduleAuto(room);
    }
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
    return this.rooms.size;
  }

  roomOf(userId) {
    const code = this.byUser.get(userId);
    return code ? this.rooms.get(code) || null : null;
  }

  requireRoom(user) {
    const room = this.roomOf(user.id);
    if (!room) throw new UserError('Sən heç bir otaqda deyilsən');
    return room;
  }

  requireHost(user) {
    const room = this.requireRoom(user);
    if (room.hostId !== user.id) throw new UserError('Bunu yalnız host edə bilər');
    return room;
  }

  newCode() {
    for (let i = 0; i < 200; i++) {
      const code = String(crypto.randomInt(1000, 10000));
      if (!this.rooms.has(code)) return code;
    }
    throw new UserError('Hazırda boş otaq yoxdur, bir az sonra yenə cəhd et');
  }

  // ---------- Otaq əməliyyatları ----------

  hashPass(code, pw) {
    return crypto.createHash('sha256').update(`pg:${code}:${pw}`).digest('hex');
  }

  create(user, gameId, visibility = 'private', opts = {}) {
    const game = games.get(gameId);
    if (!game) throw new UserError('Belə oyun yoxdur');
    const name = String(opts.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
    if (name && findProfanity(name)) throw new UserError('Otaq adı uyğun deyil');
    const pw = String(opts.password ?? '').slice(0, 30);
    this.leave(user);
    const now = Date.now();
    const room = {
      code: this.newCode(),
      name,
      gameId,
      hostId: user.id,
      visibility: visibility === 'public' ? 'public' : 'private',
      langs: normLangs(opts.langs, [ROOM_LANGS.includes(opts.lang) ? opts.lang : 'az']), // otaqda danışılan dillər
      status: 'lobby', // lobby | playing | finished
      players: [{ id: user.id, nickname: user.nickname }],
      settings: games.defaultSettings(game),
      state: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
    };
    if (pw) room.passHash = this.hashPass(room.code, pw);
    this.rooms.set(room.code, room);
    this.byUser.set(user.id, room.code);
    this.commit(room);
    return { code: room.code };
  }

  // ---------- Test rejimi (yalnız admin): botlarla oyun ----------

  createTest(user, wantRole) {
    if (!user.isAdmin) throw new UserError('Test rejimi yalnız admin üçündür');
    const game = games.get('village');
    this.leave(user);
    const NAMES = ['Aysel', 'Rəşad', 'Nigar', 'Elnur', 'Leyla', 'Tural'];
    const bots = NAMES.map((n) => db.ensureBot(n));
    const now = Date.now();
    const room = {
      code: this.newCode(),
      name: '🧪 Test',
      gameId: 'village',
      hostId: user.id,
      visibility: 'private',
      test: true,
      testAuto: false,
      status: 'lobby',
      players: [{ id: user.id, nickname: user.nickname }, ...bots.map((b) => ({ id: b.id, nickname: b.nickname, bot: true }))],
      settings: { ...games.defaultSettings(game), discussionSec: '60' },
      state: null,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
    };
    this.rooms.set(room.code, room);
    this.byUser.set(user.id, room.code);
    const alerts = [];
    room.state = game.setup(room.players, room.settings, this.ctx(room, user.id, alerts));
    const s = room.state;
    s.settings.testGod = true; // test rejimində hamının rolu görünür
    if (['mafia', 'doctor', 'detective', 'citizen'].includes(wantRole) && s.roles[user.id] !== wantRole) {
      const other = Object.keys(s.roles).map(Number).find((id) => s.roles[id] === wantRole);
      if (other != null) [s.roles[user.id], s.roles[other]] = [s.roles[other], s.roles[user.id]];
    }
    room.status = 'playing';
    this.commit(room, alerts);
    return { code: room.code };
  }

  toggleTestAuto(user) {
    const room = this.requireRoom(user);
    if (!room.test) throw new UserError('Bu otaq test otağı deyil');
    room.testAuto = !room.testAuto;
    this.commit(room);
  }

  // Botlar hər ~1.2 san.-dən bir növbəti addımı atır (test otağında)
  scheduleBots(room) {
    const has = this.botTimers.has(room.code);
    if (!room.test || room.status !== 'playing') {
      if (has) { clearInterval(this.botTimers.get(room.code)); this.botTimers.delete(room.code); }
      return;
    }
    if (has) return;
    const t = setInterval(() => this.botTick(room.code), 1200);
    t.unref();
    this.botTimers.set(room.code, t);
  }

  botTick(code) {
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing' || !room.state) return;
    const game = games.get(room.gameId);
    const s = room.state;
    const alerts = [];
    const ctx = () => this.ctx(room, null, alerts);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const LINES = ['Mənə şübhəli gəlir…', 'Gecə kim səs-küy saldı?', 'Mən vətəndaşam, inanın!', 'Gəlin ehtiyatla səs verək.', 'Kimsə susur, bu qəribədir.', 'Mən kimisə yoxladım, sonra deyəcəm.', 'Bəlkə heç kimi qovmayaq?'];
    let changed = false;
    const actors = room.players.filter((p) => p.bot || (room.testAuto && p.id === room.hostId));
    for (const p of actors) {
      let v;
      try { v = game.view(s, p.id); } catch { continue; }
      const act = (payload) => {
        try { game.action(s, p.id, payload, ctx()); changed = true; } catch { /* qeyri-mümkün addım: keç */ }
      };
      if (s.phase === 'reveal' && !v.seen) act({ type: 'seen' });
      else if (s.phase === 'night' && v.amAlive && v.options && v.options.length && v.pick == null && Math.random() < 0.6) act({ type: 'target', targetId: pick(v.options) });
      else if (s.phase === 'discussion' && v.amAlive) {
        if (p.bot && Math.random() < 0.18) {
          const others = v.players.filter((x) => x.alive && x.id !== p.id);
          const line = Math.random() < 0.3 && others.length ? `${(room.players.find((q) => q.id === pick(others).id) || {}).nickname}, sən nə düşünürsən?` : pick(LINES);
          act({ type: 'chat', text: line });
        }
        const ready = v.ready && v.ready[p.id];
        if (!ready && Math.random() < (p.bot ? 0.05 : 0.15)) act({ type: 'ready' });
      } else if (s.phase === 'defense' && p.bot && v.accused === p.id && s.__defRound !== s.round) {
        s.__defRound = s.round;
        act({ type: 'chat', text: pick(['Mən günahsızam, inanın!', 'Məni asmayın, vətəndaşam!', 'Əsl mafia başqasıdır.']) });
      } else if (s.phase === 'verdict' && v.amAlive && v.accused !== p.id && !(v.verdicts && p.id in v.verdicts) && Math.random() < 0.5) {
        act({ type: 'verdict', choice: Math.random() < 0.55 ? 'hang' : 'spare' });
      } else if (s.phase === 'vote' && v.amAlive && !(v.votes && p.id in v.votes) && Math.random() < 0.5) {
        const others = v.players.filter((x) => x.alive && x.id !== p.id);
        act({ type: 'vote', targetId: Math.random() < 0.15 || !others.length ? 'skip' : pick(others).id });
      }
      if (s.finished || s.phase === 'over') break;
    }
    if (changed) this.commit(room, alerts);
  }

  // Açıq otaqlar: lobbidə olan, yeri qalan, hamıya açıq otaqlar
  listPublic() {
    const out = [];
    for (const room of this.rooms.values()) {
      if (room.visibility !== 'public' || room.status !== 'lobby') continue;
      const game = games.get(room.gameId);
      if (!game) continue;
      const host = room.players.find((p) => p.id === room.hostId);
      out.push({
        code: room.code,
        name: room.name || '',
        locked: !!room.passHash,
        langs: room.langs || ROOM_LANGS,
        gameName: game.name,
        host: host ? host.nickname : '',
        count: room.players.length,
        max: game.maxPlayers,
        min: game.minPlayers,
        full: room.players.length >= game.maxPlayers,
        autoStartAt: room.autoStartAt || null,
      });
    }
    return out.sort((a, b) => Number(a.full) - Number(b.full) || b.count - a.count);
  }

  // Sürətli oyun: ən çox oyunçusu olan açıq otağa qoşul, yoxdursa yenisini aç
  quick(user, gameId, lang) {
    const cur = this.roomOf(user.id);
    if (cur) {
      this.sendTo(user.id, cur);
      return { code: cur.code };
    }
    // Yalnız oyunçunun dilində danışılan otaqlara qoşulur; yoxdursa həmin dildə yeni otaq açılır
    const l = ROOM_LANGS.includes(lang) ? lang : 'az';
    const open = this.listPublic().filter((r) => !r.full && !r.locked && r.langs.includes(l));
    if (open.length) return this.join(user, open[0].code);
    return this.create(user, gameId, 'public', { langs: [l] });
  }

  setVisibility(user, visibility) {
    const room = this.requireHost(user);
    if (room.status !== 'lobby') throw new UserError('Bunu yalnız oyundan əvvəl dəyişmək olar');
    room.visibility = visibility === 'public' ? 'public' : 'private';
    this.commit(room);
  }

  setLangs(user, langs) {
    const room = this.requireHost(user);
    if (room.status !== 'lobby') throw new UserError('Bunu yalnız oyundan əvvəl dəyişmək olar');
    room.langs = normLangs(langs, room.langs || ['az']);
    this.commit(room);
  }

  join(user, rawCode, password) {
    const code = String(rawCode || '').replace(/\D/g, '');
    const room = this.rooms.get(code);
    if (!room) throw new UserError('Bu kodla otaq tapılmadı');
    if (room.players.some((p) => p.id === user.id)) {
      this.sendTo(user.id, room);
      return { code };
    }
    if (room.status !== 'lobby') throw new UserError('Bu otaqda oyun artıq başlayıb');
    if (room.passHash && this.hashPass(code, String(password ?? '')) !== room.passHash) {
      const err = new UserError(password ? 'Otaq şifrəsi səhvdir' : 'Bu otaq şifrəlidir');
      err.needsPassword = true;
      throw err;
    }
    const game = games.get(room.gameId);
    if (room.players.length >= game.maxPlayers) throw new UserError('Otaq doludur');

    this.leave(user);
    room.players.push({ id: user.id, nickname: user.nickname });
    this.byUser.set(user.id, code);
    this.commit(room);
    return { code };
  }

  leave(user) {
    const room = this.roomOf(user.id);
    if (!room) return;
    this.removePlayer(room, user.id);
    this.sendTo(user.id, null);
  }

  kick(user, targetId) {
    const room = this.requireHost(user);
    targetId = Number(targetId);
    if (targetId === user.id) throw new UserError('Özünü çıxara bilməzsən');
    if (!room.players.some((p) => p.id === targetId)) throw new UserError('Bu oyunçu otaqda deyil');
    this.removePlayer(room, targetId);
    this.sendTo(targetId, null);
    this.io.to(`user:${targetId}`).emit('kicked');
  }

  removePlayer(room, userId) {
    room.players = room.players.filter((p) => p.id !== userId);
    this.byUser.delete(userId);
    if (room.players.length === 0 || (room.test && room.players.every((p) => p.bot))) return this.close(room);
    if (room.hostId === userId) room.hostId = room.players[0].id;

    const alerts = [];
    const game = games.get(room.gameId);
    if (room.status === 'playing' && game.playerLeft) {
      game.playerLeft(room.state, userId, this.ctx(room, null, alerts));
    }
    this.commit(room, alerts);
  }

  updateSettings(user, patch) {
    const room = this.requireHost(user);
    if (room.status !== 'lobby') throw new UserError('Ayarları yalnız oyundan əvvəl dəyişmək olar');
    const game = games.get(room.gameId);
    for (const s of game.settings || []) {
      const value = patch && patch[s.key];
      if (value !== undefined && s.options.some((o) => o.value === value)) room.settings[s.key] = value;
    }
    this.commit(room);
  }

  start(user) {
    const room = this.requireHost(user);
    if (room.status !== 'lobby') throw new UserError('Oyun artıq başlayıb');
    const game = games.get(room.gameId);
    if (room.players.length < game.minPlayers) {
      throw new UserError(`Başlamaq üçün ən azı ${game.minPlayers} nəfər lazımdır`);
    }
    const alerts = [];
    room.state = game.setup(room.players, room.settings, this.ctx(room, user.id, alerts));
    room.status = 'playing';
    room.startedAt = Date.now();
    room.resultSaved = false;
    room.rewards = null;
    room.closesAt = null;
    room.autoStartAt = null;
    this.commit(room, alerts);
  }

  // Oyunu bitir / yenidən oyna — hamı lobbiyə qayıdır
  backToLobby(user) {
    const room = this.requireHost(user);
    room.status = 'lobby';
    room.state = null;
    this.commit(room);
  }

  action(user, payload) {
    const room = this.requireRoom(user);
    const isNote = payload && payload.type === 'note';
    const chatOnly = payload && (payload.type === 'chat' || isNote) && room.status === 'finished';
    if (room.status !== 'playing' && !chatOnly) throw new UserError('Oyun getmir');
    const alerts = [];
    games.get(room.gameId).action(room.state, user.id, payload || {}, this.ctx(room, user.id, alerts));
    // Qeyd yalnız yazanındır: hamıya yayımlamadan bazaya yazılır
    if (isNote) { if (!room.test) db.saveRoom(room); return; }
    this.commit(room, alerts);
  }

  // ---------- Daxili ----------

  ctx(room, userId, alerts) {
    return {
      now: Date.now(),
      isHost: userId != null && userId === room.hostId,
      players: room.players,
      nameOf: (id) => (room.players.find((p) => p.id === id) || {}).nickname || 'Oyunçu',
      alert: (userIds, kind) => alerts.push({ userIds, kind }),
    };
  }

  // Hər dəyişiklikdən sonra: bazaya yaz, taymeri qur, hamıya göndər
  commit(room, alerts = []) {
    room.updatedAt = Date.now();
    const game = games.get(room.gameId);
    if (room.status === 'playing' && room.state && room.state.finished) {
      room.status = 'finished';
      room.closesAt = Date.now() + FINISHED_ROOM_TTL;
      if (!room.resultSaved && room.test) {
        room.resultSaved = true;
        const res = game.result ? game.result(room.state) : {};
        room.winners = res.winners || [];
        room.rewards = null;
      }
      if (!room.resultSaved) {
        room.resultSaved = true;
        const res = game.result ? game.result(room.state) : {};
        const winners = new Set(res.winners || []);
        room.winners = [...winners]; // qələbə effektləri üçün
        room.rewards = {};
        const R = db.getRewards();
        for (const p of room.players) {
          const won = winners.has(p.id);
          room.rewards[p.id] = {
            points: won ? R.win.points : R.lose.points,
            coins: won ? R.win.coins : R.lose.coins,
            won,
          };
        }
        db.saveResult({
          roomCode: room.code,
          gameId: room.gameId,
          winner: res.winner,
          players: room.players.map((p) => ({ ...p, role: res.roles ? res.roles[p.id] : undefined })),
          rewards: room.rewards,
          startedAt: room.startedAt,
        });
      }
    }
    this.updateAuto(room);
    db.saveRoom(room);
    this.schedule(room);
    this.scheduleClose(room);
    this.scheduleAuto(room);
    this.scheduleBots(room);
    this.broadcast(room);
    for (const { userIds, kind } of alerts) {
      for (const id of userIds) this.io.to(`user:${id}`).emit('alert', { kind });
    }
  }

  // Açıq otaq: minimum say yığılanda geri sayım başlayır, dolanda qısalır, say azalanda ləğv olunur
  updateAuto(room) {
    if (room.visibility !== 'public' || room.status !== 'lobby') { room.autoStartAt = null; return; }
    const game = games.get(room.gameId);
    const n = room.players.length;
    if (n < game.minPlayers) { room.autoStartAt = null; return; }
    const now = Date.now();
    if (!room.autoStartAt) room.autoStartAt = now + AUTO_START_MS;
    if (n >= game.maxPlayers) room.autoStartAt = Math.min(room.autoStartAt, now + AUTO_START_FULL_MS);
  }

  scheduleAuto(room) {
    clearTimeout(this.autoTimers.get(room.code));
    this.autoTimers.delete(room.code);
    if (!room.autoStartAt) return;
    const code = room.code;
    const at = room.autoStartAt;
    this.autoTimers.set(code, setTimeout(() => {
      const r = this.rooms.get(code);
      if (!r || r.status !== 'lobby' || r.autoStartAt !== at) return;
      try {
        this.start({ id: r.hostId });
      } catch (err) {
        r.autoStartAt = null;
        this.commit(r);
      }
    }, Math.max(0, at - Date.now())));
  }

  schedule(room) {
    clearTimeout(this.timers.get(room.code));
    this.timers.delete(room.code);
    const deadline = room.status === 'playing' && room.state && room.state.deadline;
    if (!deadline) return;
    const t = setTimeout(() => this.fire(room.code, deadline), Math.max(0, deadline - Date.now()));
    this.timers.set(room.code, t);
  }

  fire(code, deadline) {
    const room = this.rooms.get(code);
    if (!room || room.status !== 'playing' || room.state.deadline !== deadline) return;
    const alerts = [];
    try {
      games.get(room.gameId).timeout(room.state, this.ctx(room, null, alerts));
    } catch (err) {
      console.error(`[room ${code}] timeout xətası:`, err);
      room.state.deadline = null; // sonsuz dövrəyə düşməsin; host oyunu lobbiyə qaytara bilər
    }
    this.commit(room, alerts);
  }

  view(room, userId) {
    const game = games.get(room.gameId);
    return {
      code: room.code,
      gameId: room.gameId,
      gameName: game.name,
      gameIcon: game.icon,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      hostId: room.hostId,
      isHost: room.hostId === userId,
      me: userId,
      status: room.status,
      settings: room.settings,
      settingsSchema: game.settings || [],
      test: !!room.test,
      testAuto: !!room.testAuto,
      name: room.name || '',
      locked: !!room.passHash,
      visibility: room.visibility || 'private',
      langs: room.langs || ROOM_LANGS,
      autoStartAt: room.status === 'lobby' ? room.autoStartAt || null : null,
      players: room.players.map((p) => ({ ...p, online: p.bot || this.isOnline(p.id), look: db.lookOf(p.id) })),
      game: room.state ? game.view(room.state, userId) : null,
      earned: room.status === 'finished' && room.rewards ? room.rewards[userId] ?? null : null,
      closesAt: room.closesAt || null,
      winners: room.status === 'finished' ? room.winners || [] : null,
      serverNow: Date.now(),
    };
  }

  // Oyunçu mağazada görünüşünü dəyişdi: otağındakılar dərhal görsün
  lookChanged(userId) {
    const room = this.roomOf(userId);
    if (room) this.broadcast(room);
  }

  // Qonaq qeydiyyatdan keçərkən nickname-ini dəyişdi
  renamed(userId, nickname) {
    const room = this.roomOf(userId);
    const p = room && room.players.find((x) => x.id === userId);
    if (!p) return;
    p.nickname = nickname;
    db.saveRoom(room);
    this.broadcast(room);
  }

  broadcast(room) {
    for (const p of room.players) this.sendTo(p.id, room);
  }

  sendTo(userId, room) {
    this.io.to(`user:${userId}`).emit('room', room ? this.view(room, userId) : null);
  }

  // Oyunçu qoşulanda/ayrılanda (onlayn nöqtəsi dəyişsin deyə)
  presenceChanged(userId) {
    const room = this.roomOf(userId);
    if (room) this.broadcast(room);
  }

  scheduleClose(room) {
    clearTimeout(this.closeTimers.get(room.code));
    this.closeTimers.delete(room.code);
    if (!room.closesAt) return;
    const code = room.code;
    this.closeTimers.set(code, setTimeout(() => {
      const r = this.rooms.get(code);
      if (!r || !r.closesAt || r.closesAt > Date.now() + 1000) return;
      const players = r.players.map((p) => p.id);
      this.close(r);
      for (const id of players) {
        this.io.to(`user:${id}`).emit('closed', { reason: 'finished' });
        this.sendTo(id, null);
      }
    }, Math.max(0, room.closesAt - Date.now())));
  }

  close(room) {
    clearTimeout(this.timers.get(room.code));
    this.timers.delete(room.code);
    clearTimeout(this.closeTimers.get(room.code));
    this.closeTimers.delete(room.code);
    clearTimeout(this.autoTimers.get(room.code));
    this.autoTimers.delete(room.code);
    clearInterval(this.botTimers.get(room.code));
    this.botTimers.delete(room.code);
    this.rooms.delete(room.code);
    for (const p of room.players) {
      if (this.byUser.get(p.id) === room.code) this.byUser.delete(p.id);
    }
    db.deleteRoom(room.code);
  }

  cleanup() {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      const idle = now - room.updatedAt;
      const anyoneOnline = room.players.some((p) => this.isOnline(p.id));
      if (idle > ROOM_TTL || (!anyoneOnline && idle > EMPTY_ROOM_TTL)) {
        const players = room.players.map((p) => p.id);
        this.close(room);
        for (const id of players) this.sendTo(id, null);
      }
    }
  }

  stats() {
    let playing = 0;
    for (const r of this.rooms.values()) if (r.status === 'playing') playing++;
    return { rooms: this.rooms.size, playing };
  }
}

module.exports = { RoomManager };
