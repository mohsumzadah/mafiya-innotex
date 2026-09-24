const crypto = require('crypto');
const { UserError } = require('../errors');

const SEC = 1000;
const TIMES = {
  countdown: 5,
  reveal: 45,
  sleep: 6, // "hamı gözünü yumsun" anonsu
  nightStep: 35, // hər rol üçün seçim vaxtı
  fakeStepMin: 7, // ölü rolun növbəsi — kənardan hiss olunmasın deyə təsadüfi müddət
  fakeStepMax: 12,
  lockDelay: 2, // seçimdən sonra növbəti addıma keçid
  detectiveShow: 5,
  morning: 9,
  vote: 60,
  voteResult: 9,
};

const TOWN = 'town';
const MAFIA = 'mafia';

function randInt(min, max) {
  return crypto.randomInt(min, max + 1);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mafiaCountFor(n, setting) {
  const auto = n <= 6 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  const wanted = setting === 'auto' ? auto : Number(setting) || auto;
  return Math.max(1, Math.min(wanted, Math.floor((n - 1) / 2)));
}

const aliveIds = (s) => s.order.filter((id) => s.alive[id]);
const aliveWithRole = (s, role) => aliveIds(s).filter((id) => s.roles[id] === role);

function winnerOf(s) {
  const alive = aliveIds(s);
  const mafia = alive.filter((id) => s.roles[id] === 'mafia').length;
  if (mafia === 0) return TOWN;
  if (mafia >= alive.length - mafia) return MAFIA;
  return null;
}

function finish(s, winner, ctx) {
  s.phase = 'over';
  s.winner = winner;
  s.deadline = null;
  s.night = null;
  s.finished = true;
  ctx.alert(s.order, 'gameOver');
}

// ---------- Fazalar ----------

function startReveal(s, ctx) {
  s.phase = 'reveal';
  s.seen = {};
  s.deadline = ctx.now + TIMES.reveal * SEC;
}

function startNight(s, ctx) {
  s.round += 1;
  const steps = ['sleep', 'mafia', 'doctor'];
  if (s.hasDetective) steps.push('detective');
  s.night = { steps, i: -1, step: null, fake: false, locked: false, mafiaVotes: {}, kill: null, heal: null, check: null };
  s.phase = 'night';
  nextNightStep(s, ctx);
}

function nextNightStep(s, ctx) {
  const n = s.night;
  n.i += 1;
  n.locked = false;
  if (n.i >= n.steps.length) return startMorning(s, ctx);

  n.step = n.steps[n.i];
  if (n.step === 'sleep') {
    n.fake = false;
    s.deadline = ctx.now + TIMES.sleep * SEC;
    ctx.alert(s.order, 'night');
    return;
  }
  const active = aliveWithRole(s, n.step);
  if (active.length === 0) {
    n.fake = true;
    s.deadline = ctx.now + randInt(TIMES.fakeStepMin, TIMES.fakeStepMax) * SEC;
  } else {
    n.fake = false;
    s.deadline = ctx.now + TIMES.nightStep * SEC;
    ctx.alert(active, 'wake');
  }
}

function resolveMafiaTimeout(s) {
  const n = s.night;
  if (n.kill != null) return;
  const counts = {};
  for (const [voter, target] of Object.entries(n.mafiaVotes)) {
    if (s.alive[voter] && s.alive[target]) counts[target] = (counts[target] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((k) => counts[k] === max).map(Number);
  n.kill = top.length ? top[randInt(0, top.length - 1)] : null;
}

function startMorning(s, ctx) {
  const n = s.night;
  const saved = n.kill != null && n.kill === n.heal;
  const killed = n.kill != null && !saved && s.alive[n.kill] ? n.kill : null;
  if (killed != null) {
    s.alive[killed] = false;
    ctx.alert([killed], 'dead');
  }
  s.doctorLast = n.heal;
  s.lastNight = { round: s.round, killed, saved };
  s.night = null;
  s.phase = 'morning';
  s.deadline = ctx.now + TIMES.morning * SEC;
  ctx.alert(s.order.filter((id) => id !== killed), 'morning');
}

function afterMorning(s, ctx) {
  const w = winnerOf(s);
  if (w) return finish(s, w, ctx);
  s.phase = 'discussion';
  s.deadline = ctx.now + Number(s.settings.discussionSec || 120) * SEC;
}

function startVote(s, ctx) {
  s.phase = 'vote';
  s.votes = {};
  s.deadline = ctx.now + TIMES.vote * SEC;
  ctx.alert(aliveIds(s), 'vote');
}

function resolveVote(s, ctx) {
  const counts = {};
  for (const [voter, target] of Object.entries(s.votes)) {
    if (!s.alive[voter]) continue;
    if (target !== 'skip' && !s.alive[target]) continue;
    counts[target] = (counts[target] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((k) => counts[k] === max);
  const eliminated = max > 0 && top.length === 1 && top[0] !== 'skip' ? Number(top[0]) : null;
  if (eliminated != null) {
    s.alive[eliminated] = false;
    ctx.alert([eliminated], 'dead');
  }
  s.lastVote = { round: s.round, eliminated, counts, tie: top.length > 1 };
  // Səsvermə oyunu bitirirsə (məs. 2 nəfər qaldı) ara ekran olmadan birbaşa nəticə
  const w = winnerOf(s);
  if (w) return finish(s, w, ctx);
  s.phase = 'voteResult';
  s.deadline = ctx.now + TIMES.voteResult * SEC;
}

function afterVote(s, ctx) {
  const w = winnerOf(s);
  if (w) return finish(s, w, ctx);
  startNight(s, ctx);
}

// ---------- Hərəkətlər ----------

function nightAction(s, uid, targetId, ctx) {
  const n = s.night;
  if (!s.alive[uid] || s.roles[uid] !== n.step) throw new UserError('İndi sənin növbən deyil');
  if (n.locked) throw new UserError('Seçim artıq edilib');
  if (!s.alive[targetId]) throw new UserError('Bu oyunçu artıq oyunda deyil');

  if (n.step === 'mafia') {
    if (s.roles[targetId] === 'mafia') throw new UserError('Mafia öz yoldaşını seçə bilməz');
    n.mafiaVotes[uid] = targetId;
    // Bütün sağ mafialar eyni adamı seçəndə qərar qəbul olunur
    if (aliveWithRole(s, 'mafia').every((m) => n.mafiaVotes[m] === targetId)) {
      n.kill = targetId;
      n.locked = true;
      s.deadline = ctx.now + TIMES.lockDelay * SEC;
    }
  } else if (n.step === 'doctor') {
    if (targetId === s.doctorLast) throw new UserError('Eyni adamı iki gecə dalbadal sağalda bilməzsən');
    n.heal = targetId;
    n.locked = true;
    s.deadline = ctx.now + TIMES.lockDelay * SEC;
  } else if (n.step === 'detective') {
    if (targetId === uid) throw new UserError('Özünü yoxlaya bilməzsən');
    n.check = targetId;
    n.locked = true;
    s.checks.push({ round: s.round, target: targetId, isMafia: s.roles[targetId] === 'mafia' });
    s.deadline = ctx.now + TIMES.detectiveShow * SEC;
  }
}

const HOST_NEXT = {
  countdown: startReveal,
  reveal: startNight,
  morning: afterMorning,
  discussion: startVote,
  voteResult: afterVote,
};

function action(s, uid, payload, ctx) {
  const type = payload && payload.type;
  if (s.phase === 'over') throw new UserError('Oyun bitib');

  if (type === 'next') {
    if (!ctx.isHost) throw new UserError('Bunu yalnız host edə bilər');
    const fn = HOST_NEXT[s.phase];
    if (!fn) throw new UserError('Bu mərhələni keçmək olmaz');
    return fn(s, ctx);
  }

  if (!(uid in s.roles)) throw new UserError('Sən bu oyunda deyilsən');

  if (type === 'seen' && s.phase === 'reveal') {
    s.seen[uid] = true;
    if (aliveIds(s).every((id) => s.seen[id])) startNight(s, ctx);
    return;
  }

  if (type === 'target' && s.phase === 'night') {
    return nightAction(s, uid, Number(payload.targetId), ctx);
  }

  if (type === 'vote' && s.phase === 'vote') {
    if (!s.alive[uid]) throw new UserError('Ölülər səs verə bilməz');
    const target = payload.targetId === 'skip' ? 'skip' : Number(payload.targetId);
    if (target !== 'skip') {
      if (!s.alive[target]) throw new UserError('Bu oyunçu artıq oyunda deyil');
      if (target === uid) throw new UserError('Özünə səs verə bilməzsən');
    }
    s.votes[uid] = target;
    if (aliveIds(s).every((id) => id in s.votes)) resolveVote(s, ctx);
    return;
  }

  throw new UserError('Bu hərəkət indi mümkün deyil');
}

function timeout(s, ctx) {
  switch (s.phase) {
    case 'countdown':
      return startReveal(s, ctx);
    case 'reveal':
      return startNight(s, ctx);
    case 'night':
      if (s.night.step === 'mafia') resolveMafiaTimeout(s);
      return nextNightStep(s, ctx);
    case 'morning':
      return afterMorning(s, ctx);
    case 'discussion':
      return startVote(s, ctx);
    case 'vote':
      return resolveVote(s, ctx);
    case 'voteResult':
      return afterVote(s, ctx);
    default:
      s.deadline = null;
  }
}

function playerLeft(s, uid, ctx) {
  if (!s.alive[uid] || s.phase === 'over') return;
  s.alive[uid] = false;
  const w = winnerOf(s);
  if (w) return finish(s, w, ctx);
  if (s.phase === 'vote' && aliveIds(s).every((id) => id in s.votes)) resolveVote(s, ctx);
}

// ---------- Başlanğıc ----------

function setup(players, settings, ctx) {
  const ids = players.map((p) => p.id);
  const roles = [];
  for (let i = 0; i < mafiaCountFor(ids.length, settings.mafiaCount); i++) roles.push('mafia');
  roles.push('doctor');
  if (settings.detective === 'on' && ids.length >= 6) roles.push('detective');
  while (roles.length < ids.length) roles.push('citizen');
  const dealt = shuffle(roles);

  const s = {
    phase: 'countdown',
    deadline: ctx.now + TIMES.countdown * SEC,
    round: 0,
    order: shuffle(ids),
    roles: {},
    alive: {},
    seen: {},
    night: null,
    doctorLast: null,
    checks: [],
    lastNight: null,
    votes: {},
    lastVote: null,
    winner: null,
    finished: false,
    hasDetective: roles.includes('detective'),
    settings: { ...settings },
  };
  ids.forEach((id, i) => {
    s.roles[id] = dealt[i];
    s.alive[id] = true;
  });
  return s;
}

// ---------- Oyunçunun gördüyü ----------

function view(s, uid) {
  const myRole = s.roles[uid] || null;
  const amAlive = !!s.alive[uid];
  const over = s.phase === 'over';
  // Rolları hamı yalnız oyun bitəndə görür. Ölən/qovulan oyunçu da görmür, yoxsa jestlə başqalarına ötürə bilər.
  const seesAll = over;

  const roleOf = (id) => {
    if (seesAll || id === uid) return s.roles[id];
    if (myRole === 'mafia' && s.roles[id] === 'mafia') return 'mafia';
    if (!s.alive[id] && s.settings.revealOnDeath === 'on') return s.roles[id];
    return null;
  };

  const v = {
    phase: s.phase,
    round: s.round,
    deadline: s.deadline,
    myRole,
    amAlive,
    winner: s.winner,
    players: s.order.map((id) => ({ id, alive: !!s.alive[id], role: roleOf(id) })),
  };

  if (myRole === 'detective') v.checks = s.checks;

  if (s.phase === 'reveal') {
    const alive = aliveIds(s);
    v.seen = !!s.seen[uid];
    v.seenCount = alive.filter((id) => s.seen[id]).length;
    v.total = alive.length;
  }

  if (s.phase === 'night') {
    const n = s.night;
    v.step = n.step;
    v.myTurn = amAlive && myRole === n.step;
    if (v.myTurn) {
      v.locked = n.locked;
      const alive = aliveIds(s);
      if (n.step === 'mafia') {
        v.options = alive.filter((id) => s.roles[id] !== 'mafia');
        v.pick = n.mafiaVotes[uid] ?? null;
        v.mafiaVotes = n.mafiaVotes;
        v.chosen = n.kill;
      } else if (n.step === 'doctor') {
        v.options = alive.filter((id) => id !== s.doctorLast);
        v.pick = n.heal;
      } else if (n.step === 'detective') {
        v.options = alive.filter((id) => id !== uid);
        v.pick = n.check;
        if (n.locked) v.checkResult = s.checks[s.checks.length - 1];
      }
    }
  }

  if (['morning', 'discussion', 'vote', 'voteResult'].includes(s.phase)) v.lastNight = s.lastNight;
  if (s.phase === 'vote') v.votes = s.votes;
  if (s.phase === 'voteResult') v.lastVote = s.lastVote;
  // Oyun səsvermə ilə bitibsə son ekranda kimin qovulduğu görünsün
  if (over && s.lastVote && s.lastVote.round === s.round && s.lastVote.eliminated != null) v.endVote = s.lastVote;
  return v;
}

function result(s) {
  const winners = s.winner ? s.order.filter((id) => (s.roles[id] === 'mafia') === (s.winner === MAFIA)) : [];
  return { winner: s.winner, roles: s.roles, winners };
}

module.exports = {
  id: 'mafia',
  name: 'Mafia',
  icon: '🕵️',
  description: 'Gecə mafia ov edir, səhər şəhər səs verir. Rolunu gizlət!',
  minPlayers: 4,
  maxPlayers: 20,
  settings: [
    {
      key: 'mafiaCount',
      label: 'Mafia sayı',
      default: 'auto',
      options: [
        { value: 'auto', label: 'Avtomatik' },
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ],
    },
    {
      key: 'detective',
      label: 'Komissar (6+ nəfər)',
      default: 'on',
      options: [
        { value: 'on', label: 'Var' },
        { value: 'off', label: 'Yox' },
      ],
    },
    {
      key: 'discussionSec',
      label: 'Müzakirə vaxtı',
      default: '120',
      options: [
        { value: '60', label: '1 dəq' },
        { value: '120', label: '2 dəq' },
        { value: '180', label: '3 dəq' },
        { value: '300', label: '5 dəq' },
      ],
    },
    {
      key: 'revealOnDeath',
      label: 'Ölənin rolu açılsın',
      default: 'on',
      options: [
        { value: 'on', label: 'Bəli' },
        { value: 'off', label: 'Xeyr' },
      ],
    },
  ],
  setup,
  action,
  timeout,
  view,
  playerLeft,
  result,
};
