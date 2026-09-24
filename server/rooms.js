const crypto = require('crypto');
const db = require('./db');
const games = require('./games');
const { UserError } = require('./errors');


const ROOM_TTL = 6 * 3600 * 1000; // bu qədər aktivlik olmayan otaq silinir
const EMPTY_ROOM_TTL = 30 * 60 * 1000; // heç kim onlayn deyilsə
const FINISHED_ROOM_TTL = 5 * 60 * 1000; // oyun bitəndən sonra yeni oyun başlamasa otaq bağlanır

class RoomManager {
  constructor(io, isOnline) {
    this.io = io;
    this.isOnline = isOnline;
    this.rooms = new Map(); // code -> room
    this.byUser = new Map(); // userId -> code
    this.timers = new Map(); // code -> timeout
    this.closeTimers = new Map(); // code -> bağlanma taymeri
  }

  // Server başlayanda aktiv otaqları bazadan geri yüklə və taymerləri bərpa et
  restore() {
    const now = Date.now();
    for (const room of db.loadRooms()) {
      if (now - room.updatedAt > ROOM_TTL || !games.get(room.gameId)) {
        db.deleteRoom(room.code);
        continue;
      }
      // Bu qayda gəlməmişdən əvvəl bitmiş otaqlar: bitmə vaxtından say
      if (room.status !== 'playing' && room.resultSaved && !room.closesAt) room.closesAt = room.updatedAt + FINISHED_ROOM_TTL;
      this.rooms.set(room.code, room);
      for (const p of room.players) this.byUser.set(p.id, room.code);
      this.schedule(room);
      this.scheduleClose(room);
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

  create(user, gameId) {
    const game = games.get(gameId);
    if (!game) throw new UserError('Belə oyun yoxdur');
    this.leave(user);
    const now = Date.now();
    const room = {
      code: this.newCode(),
      gameId,
      hostId: user.id,
      status: 'lobby', // lobby | playing | finished
      players: [{ id: user.id, nickname: user.nickname }],
      settings: games.defaultSettings(game),
      state: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
    };
    this.rooms.set(room.code, room);
    this.byUser.set(user.id, room.code);
    this.commit(room);
    return { code: room.code };
  }

  join(user, rawCode) {
    const code = String(rawCode || '').replace(/\D/g, '');
    const room = this.rooms.get(code);
    if (!room) throw new UserError('Bu kodla otaq tapılmadı');
    if (room.players.some((p) => p.id === user.id)) {
      this.sendTo(user.id, room);
      return { code };
    }
    if (room.status !== 'lobby') throw new UserError('Bu otaqda oyun artıq başlayıb');
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
    if (room.assign) delete room.assign[userId];
    if (room.players.length === 0) return this.close(room);
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

  // Komandalı oyunlarda host lobbidə oyunçunun komandasını dəyişir (toxunduqca növbəti komanda)
  assign(user, targetId) {
    const room = this.requireHost(user);
    if (room.status !== 'lobby') throw new UserError('Ayarları yalnız oyundan əvvəl dəyişmək olar');
    const game = games.get(room.gameId);
    if (!game.lobbyTeams) throw new UserError('Bu hərəkət indi mümkün deyil');
    targetId = Number(targetId);
    if (!room.players.some((p) => p.id === targetId)) throw new UserError('Bu oyunçu otaqda deyil');
    const n = Number(room.settings.teams) || 2;
    room.assign = room.assign || {};
    room.assign[targetId] = ((room.assign[targetId] ?? -1) + 1) % n;
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
    if (room.status !== 'playing') throw new UserError('Oyun getmir');
    const alerts = [];
    games.get(room.gameId).action(room.state, user.id, payload || {}, this.ctx(room, user.id, alerts));
    this.commit(room, alerts);
  }

  // ---------- Daxili ----------

  ctx(room, userId, alerts) {
    return {
      now: Date.now(),
      isHost: userId != null && userId === room.hostId,
      players: room.players,
      assign: room.assign || {},
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
    db.saveRoom(room);
    this.schedule(room);
    this.scheduleClose(room);
    this.broadcast(room);
    for (const { userIds, kind } of alerts) {
      for (const id of userIds) this.io.to(`user:${id}`).emit('alert', { kind });
    }
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
      lobbyTeams: !!game.lobbyTeams,
      assign: room.assign || {},
      players: room.players.map((p) => ({ ...p, online: this.isOnline(p.id), look: db.lookOf(p.id) })),
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
