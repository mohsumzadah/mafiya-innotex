const crypto = require('crypto');
const { UserError } = require('../errors');
const { findProfanity } = require('../profanity');

const SEC = 1000;
const TIMES = {
  countdown: 5,
  reveal: 20,
  night: 35,
  nightDone: 4, // hamı seçəndən sonra gecənin bitməsinə qalan vaxt
  morning: 8,
  vote: 40,
  defense: 30,
  verdict: 20,
  voteResult: 9,
};

const TOWN = 'town';
const MAFIA = 'mafia';
const CHAT_KEEP = 150;
const CHAT_MAX = 200;
const CHAT_GAP = 700; // ms, ardıcıl mesajlar arası

const randInt = (min, max) => crypto.randomInt(min, max + 1);

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

// ---------- Çat ----------

function sys(s, text) {
  s.chatN += 1;
  s.chat.push({ n: s.chatN, ch: 'day', from: null, text });
  if (s.chat.length > CHAT_KEEP) s.chat.splice(0, s.chat.length - CHAT_KEEP);
}

// Oyunçunun hazırda yaza biləcəyi kanal (yoxdursa null)
function writeChannel(s, uid) {
  if (!(uid in s.roles)) return null;
  if (s.phase === 'over') return 'day';
  if (!s.alive[uid]) return 'dead';
  if (s.phase === 'night') return s.roles[uid] === 'mafia' ? 'mafia' : null;
  if (s.phase === 'defense') return uid === s.accused ? 'day' : null; // müdafiədə yalnız ittiham olunan danışır
  if (['morning', 'discussion', 'vote', 'verdict', 'voteResult'].includes(s.phase)) return 'day';
  return null;
}

function canSee(s, uid, ch) {
  if (ch === 'day') return true;
  if (s.phase === 'over') return true;
  if (!s.alive[uid]) return true; // ölülər hər şeyi görür
  return ch === 'mafia' && s.roles[uid] === 'mafia';
}

function chatAction(s, uid, text, ctx) {
  const ch = writeChannel(s, uid);
  if (!ch) throw new UserError('İndi yazmaq olmaz');
  text = String(text ?? '').trim().replace(/\s+/g, ' ').slice(0, CHAT_MAX);
  if (!text) return;
  if (s.lastChat[uid] && ctx.now - s.lastChat[uid] < CHAT_GAP) throw new UserError('Bir az yavaş yaz');
  if (findProfanity(text)) throw new UserError('Mesajda nalayiq söz var');
  s.lastChat[uid] = ctx.now;
  s.chatN += 1;
  s.chat.push({ n: s.chatN, ch, from: uid, name: ctx.nameOf(uid), text });
  if (s.chat.length > CHAT_KEEP) s.chat.splice(0, s.chat.length - CHAT_KEEP);
}

// ---------- Fazalar ----------

function finish(s, winner, ctx) {
  s.phase = 'over';
  s.winner = winner;
  s.deadline = null;
  s.night = null;
  s.finished = true;
  sys(s, winner === MAFIA ? '🔪 Mafia qalib gəldi!' : '🏆 Şəhər qalib gəldi!');
  ctx.alert(s.order, 'gameOver');
}

function startReveal(s, ctx) {
  s.phase = 'reveal';
  s.seen = {};
  s.deadline = ctx.now + TIMES.reveal * SEC;
}

function startNight(s, ctx) {
  s.round += 1;
  s.night = { mafiaVotes: {}, heal: null, check: null, done: false };
  s.phase = 'night';
  s.deadline = ctx.now + TIMES.night * SEC;
  sys(s, `🌙 Gecə ${s.round}. Kənd yuxuya getdi…`);
  ctx.alert(s.order, 'night');
  ctx.alert(aliveIds(s).filter((id) => ['mafia', 'doctor', 'detective'].includes(s.roles[id])), 'wake');
}

// Gecə hərəkətləri hazırdırsa qısa gözləmədən sonra gecəni bitir
function maybeFinishNight(s, ctx) {
  const n = s.night;
  if (n.done) return;
  const mafiaDone = aliveWithRole(s, 'mafia').every((m) => n.mafiaVotes[m] != null);
  const docDone = aliveWithRole(s, 'doctor').length === 0 || n.heal != null;
  const detDone = aliveWithRole(s, 'detective').length === 0 || n.check != null;
  if (mafiaDone && docDone && detDone) {
    n.done = true;
    s.deadline = Math.min(s.deadline, ctx.now + TIMES.nightDone * SEC);
  }
}

function mafiaTarget(s) {
  const counts = {};
  for (const [voter, target] of Object.entries(s.night.mafiaVotes)) {
    if (s.alive[voter] && s.alive[target]) counts[target] = (counts[target] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  if (max === 0) return null;
  const top = Object.keys(counts).filter((k) => counts[k] === max).map(Number);
  return top[randInt(0, top.length - 1)];
}

function startMorning(s, ctx) {
  const n = s.night;
  const kill = mafiaTarget(s);
  const saved = kill != null && kill === n.heal;
  const killed = kill != null && !saved ? kill : null;
  if (killed != null) {
    s.alive[killed] = false;
    ctx.alert([killed], 'dead');
  }
  s.doctorLast = n.heal;
  s.lastNight = { round: s.round, killed, saved };
  s.night = null;
  s.phase = 'morning';
  s.deadline = ctx.now + TIMES.morning * SEC;
  s.ready = {};
  sys(s, `☀️ Gün ${s.round}.`);
  if (killed != null) {
    const role = s.settings.revealOnDeath === 'on' ? ` (${ROLE_NAME[s.roles[killed]]})` : '';
    sys(s, `💀 Bu gecə ${ctx.nameOf(killed)} öldürüldü${role}.`);
  } else if (saved) {
    sys(s, '💉 Həkim kimisə xilas etdi! Heç kim ölmədi.');
  } else {
    sys(s, '🎉 Bu gecə heç kim ölmədi.');
  }
  ctx.alert(s.order.filter((id) => id !== killed), 'morning');
}

const ROLE_NAME = { mafia: 'Mafia', doctor: 'Həkim', detective: 'Komissar', citizen: 'Vətəndaş' };

function startDiscussion(s, ctx) {
  const w = winnerOf(s);
  if (w) return finish(s, w, ctx);
  s.phase = 'discussion';
  s.ready = {};
  s.deadline = ctx.now + Number(s.settings.discussionSec || 120) * SEC;
}

function startVote(s, ctx) {
  s.phase = 'vote';
  s.votes = {};
  s.deadline = ctx.now + TIMES.vote * SEC;
  sys(s, '🗳️ Səsvermə başladı.');
  ctx.alert(aliveIds(s), 'vote');
}

// 1-ci səsvermə: kim ittiham olunur? (təkcə ən çox səs alan; bərabərlikdə və ya "heç kim"də ittiham olunmur)
function resolveVote(s, ctx) {
  const counts = {};
  for (const [voter, target] of Object.entries(s.votes)) {
    if (!s.alive[voter]) continue;
    if (target !== 'skip' && !s.alive[target]) continue;
    counts[target] = (counts[target] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((k) => counts[k] === max);
  const accused = max > 0 && top.length === 1 && top[0] !== 'skip' ? Number(top[0]) : null;
  s.lastVote = { round: s.round, eliminated: null, accused, counts, tie: top.length > 1, hang: 0, spare: 0 };
  if (accused == null) {
    sys(s, `🚪 ${top.length > 1 ? 'Səslər bərabər oldu. ' : ''}Heç kim ittiham olunmadı.`);
    s.phase = 'voteResult';
    s.deadline = ctx.now + TIMES.voteResult * SEC;
    return;
  }
  s.accused = accused;
  s.phase = 'defense';
  s.deadline = ctx.now + TIMES.defense * SEC;
  sys(s, `⚖️ ${ctx.nameOf(accused)} ittiham olundu! Özünü müdafiə edir (${TIMES.defense} san.).`);
  ctx.alert(aliveIds(s), 'vote');
}

// 2-ci səsvermə: asmaq / bağışlamaq
function startVerdict(s, ctx) {
  s.phase = 'verdict';
  s.verdicts = {};
  s.deadline = ctx.now + TIMES.verdict * SEC;
  sys(s, `🗳️ Hökm: ${ctx.nameOf(s.accused)} asılsın, yoxsa bağışlansın?`);
  ctx.alert(aliveIds(s), 'vote');
}

const verdictVoters = (s) => aliveIds(s).filter((id) => id !== s.accused);

function resolveVerdict(s, ctx) {
  const hang = Object.entries(s.verdicts).filter(([v, x]) => s.alive[v] && x === 'hang').length;
  const spare = Object.entries(s.verdicts).filter(([v, x]) => s.alive[v] && x === 'spare').length;
  const id = s.accused;
  s.lastVote.hang = hang;
  s.lastVote.spare = spare;
  if (hang > spare) {
    s.alive[id] = false;
    s.lastVote.eliminated = id;
    ctx.alert([id], 'dead');
    const role = s.settings.revealOnDeath === 'on' ? ` (${ROLE_NAME[s.roles[id]]})` : '';
    sys(s, `🪢 ${ctx.nameOf(id)} asıldı${role}. (${hang}–${spare})`);
  } else {
    sys(s, `🕊️ ${ctx.nameOf(id)} bağışlandı. (${hang}–${spare})`);
  }
  s.phase = 'voteResult';
  s.deadline = ctx.now + TIMES.voteResult * SEC;
}

// ---------- Hərəkətlər ----------

function nightAction(s, uid, targetId, ctx) {
  const n = s.night;
  const role = s.roles[uid];
  if (!s.alive[uid] || !['mafia', 'doctor', 'detective'].includes(role)) throw new UserError('Gecə sənin hərəkətin yoxdur');
  if (n.done) throw new UserError('Gecə bitir');
  if (!s.alive[targetId]) throw new UserError('Bu oyunçu artıq oyunda deyil');

  if (role === 'mafia') {
    if (s.roles[targetId] === 'mafia') throw new UserError('Mafia öz yoldaşını seçə bilməz');
    n.mafiaVotes[uid] = targetId;
  } else if (role === 'doctor') {
    if (targetId === s.doctorLast) throw new UserError('Eyni adamı iki gecə dalbadal sağalda bilməzsən');
    n.heal = targetId;
  } else {
    if (n.check != null) throw new UserError('Bu gecə artıq yoxlamısan');
    if (targetId === uid) throw new UserError('Özünü yoxlaya bilməzsən');
    n.check = targetId;
    s.checks.push({ round: s.round, target: targetId, isMafia: s.roles[targetId] === 'mafia' });
  }
  maybeFinishNight(s, ctx);
}

const NOTE_MAX = 3000;

function action(s, uid, payload, ctx) {
  const type = payload && payload.type;

  if (type === 'chat') return chatAction(s, uid, payload.text, ctx);

  // Şəxsi qeydlər: yalnız sağ oyunçu yazır; öləndən sonra qeydi hamıya görünür, dəyişdirilmir
  if (type === 'note') {
    if (!(uid in s.roles)) throw new UserError('Sən bu oyunda deyilsən');
    if (!s.alive[uid]) throw new UserError('Ölənlər qeyd yaza bilməz');
    if (s.phase === 'over') throw new UserError('Oyun bitib');
    if (!s.notes) s.notes = {};
    s.notes[uid] = String(payload.text ?? '').slice(0, NOTE_MAX);
    return;
  }

  if (s.phase === 'over') throw new UserError('Oyun bitib');
  if (!(uid in s.roles)) throw new UserError('Sən bu oyunda deyilsən');

  if (type === 'seen' && s.phase === 'reveal') {
    s.seen[uid] = true;
    if (aliveIds(s).every((id) => s.seen[id])) startNight(s, ctx);
    return;
  }

  if (type === 'target' && s.phase === 'night') {
    return nightAction(s, uid, Number(payload.targetId), ctx);
  }

  // Müzakirəni tez bitirmək: sağ qalanların hamısı "hazıram" desə səsverməyə keçilir
  if (type === 'ready' && s.phase === 'discussion') {
    if (!s.alive[uid]) throw new UserError('Ölülər səs verə bilməz');
    s.ready[uid] = !s.ready[uid];
    if (aliveIds(s).every((id) => s.ready[id])) startVote(s, ctx);
    return;
  }

  if (type === 'verdict' && s.phase === 'verdict') {
    if (!s.alive[uid] || uid === s.accused) throw new UserError('Sən bu səsverməyə qatıla bilməzsən');
    if (!['hang', 'spare'].includes(payload.choice)) throw new UserError('Seçim düzgün deyil');
    s.verdicts[uid] = payload.choice;
    if (verdictVoters(s).every((id) => id in s.verdicts)) resolveVerdict(s, ctx);
    return;
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
      return startMorning(s, ctx);
    case 'morning':
      return startDiscussion(s, ctx);
    case 'discussion':
      return startVote(s, ctx);
    case 'vote':
      return resolveVote(s, ctx);
    case 'defense':
      return startVerdict(s, ctx);
    case 'verdict':
      return resolveVerdict(s, ctx);
    case 'voteResult': {
      const w = winnerOf(s);
      return w ? finish(s, w, ctx) : startNight(s, ctx);
    }
    default:
      s.deadline = null;
  }
}

function playerLeft(s, uid, ctx) {
  if (!s.alive[uid] || s.phase === 'over') return;
  s.alive[uid] = false;
  sys(s, `🚪 ${ctx.nameOf(uid)} kəndi tərk etdi.`);
  const w = winnerOf(s);
  if (w) return finish(s, w, ctx);
  if (s.phase === 'vote' && aliveIds(s).every((id) => id in s.votes)) resolveVote(s, ctx);
  if ((s.phase === 'defense' || s.phase === 'verdict') && uid === s.accused) {
    s.lastVote.eliminated = null;
    s.phase = 'voteResult';
    s.deadline = ctx.now + TIMES.voteResult * SEC;
    return;
  }
  if (s.phase === 'verdict' && verdictVoters(s).every((id) => id in s.verdicts)) resolveVerdict(s, ctx);
  if (s.phase === 'discussion' && aliveIds(s).every((id) => s.ready[id])) startVote(s, ctx);
  if (s.phase === 'night') maybeFinishNight(s, ctx);
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
    ready: {},
    night: null,
    doctorLast: null,
    checks: [],
    lastNight: null,
    votes: {},
    verdicts: {},
    accused: null,
    lastVote: null,
    winner: null,
    finished: false,
    chat: [],
    chatN: 0,
    lastChat: {},
    settings: { ...settings },
  };
  ids.forEach((id, i) => {
    s.roles[id] = dealt[i];
    s.alive[id] = true;
  });
  sys(s, '🏘️ Kəndə xoş gəlmisiniz! Aranızda mafia var…');
  return s;
}

// ---------- Oyunçunun gördüyü ----------

function view(s, uid) {
  const myRole = s.roles[uid] || null;
  const amAlive = !!s.alive[uid];
  const over = s.phase === 'over';

  const roleOf = (id) => {
    if (over || id === uid || s.settings.testGod) return s.roles[id];
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
    chat: s.chat.filter((m) => canSee(s, uid, m.ch)),
    chatChannel: writeChannel(s, uid),
    notes: (s.notes && s.notes[uid]) || '',
    deadNotes: s.order.filter((id) => !s.alive[id] && s.notes && s.notes[id] && s.notes[id].trim()).map((id) => ({ id, text: s.notes[id] })),
  };

  if (myRole === 'detective') v.checks = s.checks;

  if (s.phase === 'reveal') {
    const alive = aliveIds(s);
    v.seen = !!s.seen[uid];
    v.seenCount = alive.filter((id) => s.seen[id]).length;
    v.total = alive.length;
  }

  if (s.phase === 'night' && amAlive) {
    const n = s.night;
    const alive = aliveIds(s);
    if (myRole === 'mafia') {
      v.options = alive.filter((id) => s.roles[id] !== 'mafia');
      v.pick = n.mafiaVotes[uid] ?? null;
      v.mafiaVotes = n.mafiaVotes; // yoldaşların seçimi (yalnız mafia görür)
    } else if (myRole === 'doctor') {
      v.options = alive.filter((id) => id !== s.doctorLast);
      v.pick = n.heal;
    } else if (myRole === 'detective') {
      v.options = alive.filter((id) => id !== uid);
      v.pick = n.check;
      v.locked = n.check != null;
      if (n.check != null) v.checkResult = s.checks[s.checks.length - 1];
    }
  }

  if (s.phase === 'discussion') {
    v.ready = s.ready;
  }
  if (['morning', 'discussion', 'vote', 'defense', 'verdict', 'voteResult'].includes(s.phase)) v.lastNight = s.lastNight;
  if (s.phase === 'vote') v.votes = s.votes;
  if (s.phase === 'defense' || s.phase === 'verdict') {
    v.accused = s.accused;
    if (s.phase === 'verdict') {
      v.verdicts = s.verdicts;
      v.voterCount = verdictVoters(s).length;
    }
  }
  if (s.phase === 'voteResult') v.lastVote = s.lastVote;
  if (over && s.lastVote && s.lastVote.round === s.round && s.lastVote.eliminated != null) v.endVote = s.lastVote;
  if (over) v.lastNight = s.lastNight;
  return v;
}

function result(s) {
  const winners = s.winner ? s.order.filter((id) => (s.roles[id] === 'mafia') === (s.winner === MAFIA)) : [];
  return { winner: s.winner, roles: s.roles, winners };
}

module.exports = {
  id: 'village',
  name: 'Mafiya',
  icon: '🏘️',
  description: 'Online kənd oyunu: gecə mafia ov edir, gündüz kənd çatda müzakirə edib səs verir.',
  minPlayers: 4,
  maxPlayers: 15,
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
