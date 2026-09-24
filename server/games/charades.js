const crypto = require('crypto');
const { UserError } = require('../errors');
const { CATEGORIES } = require('./charades-words');

// Səssiz kino: növbə gələn oyunçu sözü danışmadan izah edir, digərləri tapır.
// countdown -> ready (izah edən sözü görür, "Başla") -> acting (taymer) -> decide (vaxt bitdi, "bildilər/bilmədilər")
//   -> turnResult -> növbəti oyunçu ... hədəf sayda sözü ilk tapan komanda/oyunçu qalib.
// Rejimlər: komandalı (xal komandaya) və fərdi (tapan və izah edən 1 xal alır).

const SEC = 1000;
const TIMES = { countdown: 5, ready: 30, decide: 20, turnResult: 5 };
const TEAM_NAMES = ['Qırmızılar', 'Mavilər', 'Yaşıllar', 'Sarılar'];

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const active = (s) => s.order.filter((id) => !s.left[id]);
const teamOf = (s, id) => (s.teams ? s.teams.findIndex((t) => t.includes(id)) : -1);

function finish(s, ctx) {
  s.phase = 'over';
  s.deadline = null;
  s.finished = true;
  ctx.alert(s.order, 'gameOver');
}

// Hədəfə çatan varsa oyunu bitir
function checkWin(s, ctx) {
  const t = s.target;
  const winners = Object.entries(s.scores).filter(([, v]) => v >= t).map(([k]) => k);
  if (!winners.length) return false;
  s.winnerKey = winners.sort((a, b) => s.scores[b] - s.scores[a])[0];
  finish(s, ctx);
  return true;
}

function pickWord(s) {
  const keys = s.settings.category === 'all' ? Object.keys(CATEGORIES) : [s.settings.category];
  // Oyunda artıq çıxan sözlər təkrarlanmasın
  const pool = [];
  for (const k of keys) CATEGORIES[k].words.forEach((_, i) => { if (!s.used.includes(`${k}:${i}`)) pool.push([k, i]); });
  if (!pool.length) s.used = [];
  const [cat, idx] = pool.length ? pool[crypto.randomInt(pool.length)] : [keys[0], crypto.randomInt(CATEGORIES[keys[0]].words.length)];
  s.used.push(`${cat}:${idx}`);
  s.word = { cat, idx };
}

// Növbəti izah edəni seç: komandalar növbə ilə, komanda içində oyunçular növbə ilə
function nextActor(s) {
  if (s.teams) {
    for (let tries = 0; tries < s.teams.length; tries++) {
      const ti = s.teamTurn % s.teams.length;
      const members = s.teams[ti].filter((id) => !s.left[id]);
      s.teamTurn += 1;
      // İzah edən üçün komandada ən azı bir tapan olmalıdır
      if (members.length >= 2) {
        const actor = members[s.actorIdx[ti] % members.length];
        s.actorIdx[ti] += 1;
        return { actor, team: ti };
      }
    }
    return null;
  }
  const ids = active(s);
  if (ids.length < 2) return null;
  const actor = ids[s.soloIdx % ids.length];
  s.soloIdx += 1;
  return { actor, team: -1 };
}

function startTurn(s, ctx) {
  const next = nextActor(s);
  if (!next) return finishByLeader(s, ctx);
  s.actor = next.actor;
  s.actorTeam = next.team;
  s.swaps = 1;
  pickWord(s);
  s.phase = 'ready';
  s.deadline = ctx.now + TIMES.ready * SEC;
  ctx.alert([s.actor], 'wake');
}

// Oynamaq üçün adam qalmadı: ən çox xalı olan qalib
function finishByLeader(s, ctx) {
  const best = Object.entries(s.scores).sort((a, b) => b[1] - a[1])[0];
  s.winnerKey = best && best[1] > 0 ? best[0] : null;
  finish(s, ctx);
}

function startActing(s, ctx) {
  s.phase = 'acting';
  s.deadline = ctx.now + Number(s.settings.turnTime) * SEC;
  s.startedAt = ctx.now;
}

function endTurn(s, ctx, guessed, guesser) {
  const w = CATEGORIES[s.word.cat].words[s.word.idx];
  s.lastTurn = { actor: s.actor, team: s.actorTeam, word: w, cat: CATEGORIES[s.word.cat].name, guessed, guesser: guesser ?? null };
  if (guessed) {
    if (s.teams) s.scores[s.actorTeam] += 1;
    else {
      s.scores[guesser] += 1;
      s.scores[s.actor] += 1;
    }
    ctx.alert(active(s), 'morning');
    if (checkWin(s, ctx)) return;
  }
  s.phase = 'turnResult';
  s.deadline = ctx.now + TIMES.turnResult * SEC;
}

function action(s, uid, payload, ctx) {
  const type = payload && payload.type;
  if (s.phase === 'over') throw new UserError('Oyun bitib');
  const actorOrHost = uid === s.actor || ctx.isHost;

  if (type === 'next') {
    if (!ctx.isHost) throw new UserError('Bunu yalnız host edə bilər');
    if (s.phase === 'countdown' || s.phase === 'turnResult') return startTurn(s, ctx);
    if (s.phase === 'ready') return startActing(s, ctx);
    throw new UserError('Bu mərhələni keçmək olmaz');
  }

  if (type === 'swap' && s.phase === 'ready') {
    if (uid !== s.actor) throw new UserError('İndi sənin növbən deyil');
    if (s.swaps <= 0) throw new UserError('Söz artıq dəyişdirilib');
    s.swaps -= 1;
    return pickWord(s);
  }

  if (type === 'start' && s.phase === 'ready') {
    if (!actorOrHost) throw new UserError('İndi sənin növbən deyil');
    return startActing(s, ctx);
  }

  if ((type === 'guessed' || type === 'missed') && (s.phase === 'acting' || s.phase === 'decide')) {
    if (!actorOrHost) throw new UserError('İndi sənin növbən deyil');
    if (type === 'missed') return endTurn(s, ctx, false);
    let guesser = null;
    if (!s.teams) {
      guesser = Number(payload.guesser);
      if (!active(s).includes(guesser) || guesser === s.actor) throw new UserError('Kim tapdı? Oyunçunu seç');
    }
    return endTurn(s, ctx, true, guesser);
  }

  throw new UserError('Bu hərəkət indi mümkün deyil');
}

function timeout(s, ctx) {
  switch (s.phase) {
    case 'countdown': return startTurn(s, ctx);
    case 'ready': return startActing(s, ctx); // izah edən "Başla" demədisə avtomatik başla
    case 'acting':
      // Vaxt bitdi: izah edən "bildilər / bilmədilər" seçsin
      s.phase = 'decide';
      s.deadline = ctx.now + TIMES.decide * SEC;
      ctx.alert([s.actor], 'wake');
      return;
    case 'decide': return endTurn(s, ctx, false);
    case 'turnResult': return startTurn(s, ctx);
    default: s.deadline = null;
  }
}

function playerLeft(s, uid, ctx) {
  if (s.phase === 'over' || s.left[uid]) return;
  s.left[uid] = true;
  const ids = active(s);
  const playable = s.teams ? s.teams.filter((t) => t.filter((id) => !s.left[id]).length >= 2).length >= 1 : ids.length >= 2;
  if (!playable || ids.length < 2) return finishByLeader(s, ctx);
  if (uid === s.actor && ['ready', 'acting', 'decide'].includes(s.phase)) endTurn(s, ctx, false);
}

// ---------- Başlanğıc ----------

function setup(players, settings, ctx) {
  const ids = players.map((p) => p.id);
  const teamsMode = settings.mode === 'teams';
  let teams = null;
  if (teamsMode) {
    const n = Number(settings.teams) || 2;
    if (ids.length < n * 2) throw new UserError(`${n} komanda üçün ən azı ${n * 2} nəfər lazımdır`);
    teams = Array.from({ length: n }, () => []);
    if (settings.teamPick === 'manual') {
      // Hostun payladığı komandalar; paylanmayanlar ən az adamlı komandaya
      const rest = [];
      for (const id of shuffle(ids)) {
        const t = ctx.assign[id];
        if (t != null && t < n) teams[t].push(id);
        else rest.push(id);
      }
      for (const id of rest) teams.reduce((a, b) => (b.length < a.length ? b : a)).push(id);
      if (teams.some((t) => t.length < 2)) throw new UserError('Hər komandada ən azı 2 nəfər olmalıdır');
    } else {
      shuffle(ids).forEach((id, i) => teams[i % n].push(id));
    }
    teams = teams.map(shuffle);
  }
  const scores = {};
  if (teams) teams.forEach((_, i) => { scores[i] = 0; });
  else ids.forEach((id) => { scores[id] = 0; });
  return {
    phase: 'countdown',
    deadline: ctx.now + TIMES.countdown * SEC,
    order: shuffle(ids),
    left: {},
    teams,
    teamTurn: crypto.randomInt(teams ? teams.length : 1),
    actorIdx: teams ? teams.map(() => 0) : [],
    soloIdx: 0,
    scores,
    target: Number(settings.target) || 10,
    actor: null,
    actorTeam: -1,
    word: null,
    used: [],
    swaps: 0,
    lastTurn: null,
    winnerKey: null,
    finished: false,
    settings: { ...settings },
  };
}

// ---------- Oyunçunun gördüyü ----------

function view(s, uid) {
  const actorSees = uid === s.actor && ['ready', 'acting', 'decide'].includes(s.phase);
  const v = {
    phase: s.phase,
    deadline: s.deadline,
    mode: s.teams ? 'teams' : 'solo',
    target: s.target,
    turnTime: Number(s.settings.turnTime),
    actor: s.actor,
    actorTeam: s.actorTeam,
    isActor: uid === s.actor,
    myTeam: teamOf(s, uid),
    inGame: s.order.includes(uid) && !s.left[uid],
    players: s.order.map((id) => ({ id, left: !!s.left[id], team: teamOf(s, id), score: s.teams ? null : s.scores[id] })),
    teams: s.teams ? s.teams.map((ids, i) => ({ name: TEAM_NAMES[i], ids, score: s.scores[i] })) : null,
    lastTurn: s.lastTurn,
    winnerKey: s.winnerKey,
  };
  // Söz yalnız izah edəndə; kateqoriya hamıya (tapmağa kömək)
  if (s.word && ['ready', 'acting', 'decide'].includes(s.phase)) v.category = CATEGORIES[s.word.cat].name;
  if (actorSees) {
    v.word = CATEGORIES[s.word.cat].words[s.word.idx];
    v.swaps = s.swaps;
  }
  return v;
}

function result(s) {
  let winners = [];
  if (s.winnerKey != null) winners = s.teams ? s.teams[Number(s.winnerKey)] : [Number(s.winnerKey)];
  return { winner: s.winnerKey, roles: null, winners };
}

module.exports = {
  id: 'charades',
  name: 'Səssiz kino',
  icon: '🎬',
  description: 'Danışmadan izah et, komandan tapsın. Kim daha çox söz tapacaq?',
  minPlayers: 3,
  maxPlayers: 20,
  lobbyTeams: true,
  settings: [
    { key: 'mode', label: 'Oyun rejimi', default: 'teams', options: [{ value: 'teams', label: 'Komandalı' }, { value: 'solo', label: 'Fərdi' }] },
    { key: 'teams', label: 'Komanda sayı', default: '2', options: [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }] },
    { key: 'teamPick', label: 'Komandalar', default: 'random', options: [{ value: 'random', label: 'Təsadüfi' }, { value: 'manual', label: 'Host paylayır' }] },
    {
      key: 'category',
      label: 'Kateqoriya',
      default: 'all',
      options: [{ value: 'all', label: 'Hamısı (təsadüfi)' }, ...Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.name }))],
    },
    { key: 'turnTime', label: 'İzah vaxtı', default: '60', options: [{ value: '45', label: '45 san' }, { value: '60', label: '1 dəq' }, { value: '90', label: '1.5 dəq' }, { value: '120', label: '2 dəq' }] },
    { key: 'target', label: 'Qələbə üçün söz sayı', default: '10', options: ['5', '10', '15', '20'].map((v) => ({ value: v, label: v })) },
  ],
  setup,
  action,
  timeout,
  view,
  playerLeft,
  result,
};
