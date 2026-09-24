const crypto = require('crypto');
const { UserError } = require('../errors');
const { CATEGORIES } = require('./imposter-words');

// İmposter: hamı eyni sözü bilir, imposter(lər) bilmir.
// countdown -> reveal (sözə bax) -> clues ("söz turu": növbə ilə sözlə bağlı bir söz) -> discussion -> vote -> voteResult
//   seçilən günahsızdırsa -> eliminated (oyundan çıxır) -> yeni söz turu
//   seçilən imposterdirsə -> guess (sözü 8 variantdan təxmin edir): tapsa imposter qalib, tapmasa çıxır
//   pass/bərabərlik -> heç kim çıxmır, yeni söz turu
// Bitir: imposter qalmayanda komanda, oyunçu sayı imposterlərə bərabərləşəndə (1 imposterlə: 2 nəfər qalanda) imposter qalib.

const SEC = 1000;
const TIMES = { countdown: 5, reveal: 40, clue: 30, vote: 60, voteResult: 8, guess: 30, eliminated: 7 };
const IMPOSTER = 'imposter';
const PASS = 'pass';
const TEAM = 'team';

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function imposterCountFor(n, setting) {
  const auto = n >= 8 ? 2 : 1;
  const wanted = setting === 'auto' ? auto : Number(setting) || auto;
  return Math.max(1, Math.min(wanted, Math.floor((n - 1) / 2)));
}

// Oyunda qalanlar: oyunu tərk etməyənlər və səsvermə ilə çıxarılmayanlar
const inGame = (s) => s.order.filter((id) => !s.left[id] && !s.out[id]);
const isImp = (s, id) => s.roles[id] === IMPOSTER;

function finish(s, winner, ctx, reason) {
  s.phase = 'over';
  s.winner = winner;
  s.reason = reason;
  s.deadline = null;
  s.finished = true;
  ctx.alert(s.order, 'gameOver');
}

// Qalib varsa oyunu bitir və true qaytar
function checkWin(s, ctx, reason) {
  const ids = inGame(s);
  const imps = ids.filter((id) => isImp(s, id)).length;
  if (!imps) { finish(s, TEAM, ctx, reason || 'caught'); return true; }
  if (ids.length - imps <= imps) { finish(s, IMPOSTER, ctx, reason || 'survived'); return true; }
  return false;
}

// Oyunçunu oyundan çıxar (kind: 'innocent' | 'imposter'), sonra qısa elan və yeni söz turu
function eliminate(s, id, ctx, kind) {
  s.out[id] = true;
  s.lastOut = { id, kind };
  ctx.alert([id], 'dead'); // çıxan oyunçunun telefonu titrəyir
  if (checkWin(s, ctx)) return;
  s.phase = 'eliminated';
  s.deadline = ctx.now + TIMES.eliminated * SEC;
}

// ---------- Fazalar ----------

function startReveal(s, ctx) {
  s.phase = 'reveal';
  s.seen = {};
  s.deadline = ctx.now + TIMES.reveal * SEC;
}

function startClues(s, ctx) {
  s.phase = 'clues';
  s.round = (s.round || 0) + 1;
  s.turn = 0;
  s.clueRound = 1;
  s.speakers = inGame(s); // növbə sırası (hər oyunda təsadüfi)
  s.deadline = ctx.now + TIMES.clue * SEC;
  ctx.alert([s.speakers[0]], 'wake');
}

function nextClue(s, ctx) {
  s.turn += 1;
  if (s.turn >= s.speakers.length) {
    if (s.clueRound < s.settings.clueRounds) {
      s.clueRound += 1;
      s.turn = 0;
    } else {
      return startDiscussion(s, ctx);
    }
  }
  // Oyundan çıxmış danışanı keç
  while (s.turn < s.speakers.length && (s.left[s.speakers[s.turn]] || s.out[s.speakers[s.turn]])) s.turn += 1;
  if (s.turn >= s.speakers.length) return nextClue(s, ctx);
  s.deadline = ctx.now + TIMES.clue * SEC;
  ctx.alert([s.speakers[s.turn]], 'wake');
}

function startDiscussion(s, ctx) {
  s.phase = 'discussion';
  s.turn = null;
  s.deadline = ctx.now + Number(s.settings.discussion) * SEC;
}

function startVote(s, ctx) {
  s.phase = 'vote';
  s.votes = {};
  s.deadline = ctx.now + TIMES.vote * SEC;
  ctx.alert(inGame(s), 'vote');
}

function resolveVote(s, ctx) {
  const counts = {};
  let passes = 0;
  for (const [voter, target] of Object.entries(s.votes)) {
    if (s.left[voter] || s.out[voter]) continue;
    if (target === PASS) { passes += 1; continue; }
    if (s.left[target] || s.out[target]) continue;
    counts[target] = (counts[target] || 0) + 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((id) => counts[id] === max).map(Number);
  // Seçilmək üçün tək lider olmalı və pass-dan çox səs almalıdır
  const accused = max > passes && top.length === 1 ? top[0] : null;
  s.lastVote = { counts, passes, accused, tie: max > 0 && top.length > 1, passed: accused == null && passes >= max };
  // Günahsız çıxırsa və bu, oyunu bitirirsə (məs. 2 nəfər qalır) ara ekran olmadan birbaşa nəticə
  if (accused != null && !isImp(s, accused)) {
    const ids = inGame(s).filter((id) => id !== accused);
    const imps = ids.filter((id) => isImp(s, id)).length;
    if (ids.length - imps <= imps) return eliminate(s, accused, ctx, 'innocent');
  }
  s.phase = 'voteResult';
  s.deadline = ctx.now + TIMES.voteResult * SEC;
}

function afterVote(s, ctx) {
  const accused = s.lastVote.accused;
  if (accused == null) return startClues(s, ctx); // heç kim seçilmədi: yeni söz turu
  if (!isImp(s, accused)) return eliminate(s, accused, ctx, 'innocent');
  // Imposter tutuldu: sözü təxmin etmək şansı
  s.phase = 'guess';
  s.guesser = accused;
  const others = shuffle(CATEGORIES[s.category].words.map((_, i) => i).filter((i) => i !== s.wordIndex)).slice(0, 7);
  s.options = shuffle([s.wordIndex, ...others]);
  s.deadline = ctx.now + TIMES.guess * SEC;
  ctx.alert([accused], 'wake');
}

function resolveGuess(s, ctx, pick) {
  s.guess = pick;
  if (pick === s.wordIndex) return finish(s, IMPOSTER, ctx, 'guessed');
  eliminate(s, s.guesser, ctx, 'imposter'); // başqa imposter qalmayıbsa komanda qalib gəlir
}

const HOST_NEXT = {
  countdown: startReveal,
  reveal: startClues,
  clues: nextClue,
  discussion: startVote,
  voteResult: afterVote,
  eliminated: startClues,
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

  if (!(uid in s.roles) || s.left[uid] || s.out[uid]) throw new UserError('Sən bu oyunda deyilsən');

  if (type === 'seen' && s.phase === 'reveal') {
    s.seen[uid] = true;
    if (inGame(s).every((id) => s.seen[id])) startClues(s, ctx);
    return;
  }

  if (type === 'said' && s.phase === 'clues') {
    if (s.speakers[s.turn] !== uid && !ctx.isHost) throw new UserError('İndi sənin növbən deyil');
    return nextClue(s, ctx);
  }

  if (type === 'vote' && s.phase === 'vote') {
    const target = payload.targetId === PASS ? PASS : Number(payload.targetId);
    if (target !== PASS) {
      if (!(target in s.roles) || s.left[target] || s.out[target]) throw new UserError('Bu oyunçu artıq oyunda deyil');
      if (target === uid) throw new UserError('Özünə səs verə bilməzsən');
    }
    s.votes[uid] = target;
    if (inGame(s).every((id) => id in s.votes)) resolveVote(s, ctx);
    return;
  }

  if (type === 'guess' && s.phase === 'guess') {
    if (uid !== s.guesser) throw new UserError('İndi sənin növbən deyil');
    const pick = Number(payload.index);
    if (!s.options.includes(pick)) throw new UserError('Bu hərəkət indi mümkün deyil');
    return resolveGuess(s, ctx, pick);
  }

  throw new UserError('Bu hərəkət indi mümkün deyil');
}

function timeout(s, ctx) {
  switch (s.phase) {
    case 'countdown': return startReveal(s, ctx);
    case 'reveal': return startClues(s, ctx);
    case 'clues': return nextClue(s, ctx);
    case 'discussion': return startVote(s, ctx);
    case 'vote': return resolveVote(s, ctx);
    case 'voteResult': return afterVote(s, ctx);
    case 'guess': return resolveGuess(s, ctx, -1); // vaxt bitdi: təxmin yoxdur
    case 'eliminated': return startClues(s, ctx);
    default: s.deadline = null;
  }
}

function playerLeft(s, uid, ctx) {
  if (s.phase === 'over' || s.left[uid]) return;
  const wasOut = s.out[uid];
  s.left[uid] = true;
  if (!wasOut && checkWin(s, ctx, 'left')) return;
  if (s.phase === 'guess' && uid === s.guesser) return resolveGuess(s, ctx, -1);
  if (s.phase === 'clues' && s.speakers[s.turn] === uid) return nextClue(s, ctx);
  if (s.phase === 'vote' && inGame(s).every((id) => id in s.votes)) resolveVote(s, ctx);
}

// ---------- Başlanğıc ----------

function setup(players, settings, ctx) {
  const ids = players.map((p) => p.id);
  const keys = settings.category === 'all' ? Object.keys(CATEGORIES) : [settings.category];
  const category = keys[crypto.randomInt(keys.length)];
  const wordIndex = crypto.randomInt(CATEGORIES[category].words.length);
  const impIds = new Set(shuffle(ids).slice(0, imposterCountFor(ids.length, settings.imposters)));
  const s = {
    phase: 'countdown',
    deadline: ctx.now + TIMES.countdown * SEC,
    order: shuffle(ids),
    roles: Object.fromEntries(ids.map((id) => [id, impIds.has(id) ? IMPOSTER : 'player'])),
    left: {},
    out: {},
    lastOut: null,
    category,
    wordIndex,
    seen: {},
    speakers: [],
    turn: null,
    clueRound: 0,
    round: 0,
    votes: {},
    lastVote: null,
    guesser: null,
    options: null,
    guess: null,
    winner: null,
    finished: false,
    settings: { ...settings, clueRounds: Number(settings.clueRounds) || 1 },
  };
  return s;
}

// ---------- Oyunçunun gördüyü ----------

function view(s, uid) {
  const over = s.phase === 'over';
  const myRole = s.roles[uid] || null;
  const imp = myRole === IMPOSTER;
  const cat = CATEGORIES[s.category];
  const v = {
    phase: s.phase,
    deadline: s.deadline,
    myRole,
    amIn: myRole != null && !s.left[uid] && !s.out[uid],
    players: s.order.map((id) => ({ id, left: !!s.left[id], out: !!s.out[id], role: over || id === uid ? s.roles[id] : null })),
    imposterCount: Object.values(s.roles).filter((r) => r === IMPOSTER).length,
    round: s.round,
    remaining: inGame(s).length,
  };
  // Söz yalnız komandaya (və oyun bitəndə hamıya); kateqoriya imposter-ə yalnız ayar açıqdırsa
  if (!imp || over) v.word = cat.words[s.wordIndex];
  if (!imp || over || s.settings.hint === 'on') v.category = cat.name;
  if (imp && !over) v.partners = s.order.filter((id) => id !== uid && isImp(s, id));
  if (s.phase === 'reveal') {
    v.seen = !!s.seen[uid];
    v.seenCount = inGame(s).filter((id) => s.seen[id]).length;
    v.total = inGame(s).length;
  }
  if (s.phase === 'clues') {
    v.speakers = s.speakers;
    v.turn = s.turn;
    v.clueRound = s.clueRound;
    v.clueRounds = s.settings.clueRounds;
  }
  if (s.phase === 'vote') v.votes = s.votes;
  if (['voteResult', 'guess', 'over'].includes(s.phase)) v.lastVote = s.lastVote;
  if (s.phase === 'eliminated' || over) v.lastOut = s.lastOut;
  if (s.phase === 'guess') {
    v.guesser = s.guesser;
    if (uid === s.guesser) v.options = s.options.map((i) => ({ index: i, word: cat.words[i] }));
  }
  if (over) {
    v.winner = s.winner;
    v.reason = s.reason;
    v.guess = s.guess != null && s.guess >= 0 ? cat.words[s.guess] : null;
    v.guesser = s.guesser;
  }
  return v;
}

function result(s) {
  const winners = s.order.filter((id) => (s.winner === IMPOSTER) === isImp(s, id));
  return { winner: s.winner, roles: s.roles, winners };
}

module.exports = {
  id: 'imposter',
  name: 'İmposter',
  icon: '🤫',
  description: 'Hamı eyni sözü bilir, biri bilmir. Onu tap!',
  minPlayers: 3,
  maxPlayers: 20,
  settings: [
    {
      key: 'category',
      label: 'Kateqoriya',
      default: 'all',
      options: [{ value: 'all', label: 'Hamısı (təsadüfi)' }, ...Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.name }))],
    },
    {
      key: 'imposters',
      label: 'İmposter sayı',
      default: 'auto',
      options: [{ value: 'auto', label: 'Avtomatik' }, { value: '1', label: '1' }, { value: '2', label: '2' }],
    },
    {
      key: 'hint',
      label: 'İmposter kateqoriyanı bilsin',
      default: 'on',
      options: [{ value: 'on', label: 'Bəli' }, { value: 'off', label: 'Xeyr' }],
    },
    {
      key: 'clueRounds',
      label: 'Söz turu',
      default: '1',
      options: [{ value: '1', label: '1 tur' }, { value: '2', label: '2 tur' }],
    },
    {
      key: 'discussion',
      label: 'Müzakirə vaxtı',
      default: '120',
      options: [{ value: '60', label: '1 dəq' }, { value: '120', label: '2 dəq' }, { value: '180', label: '3 dəq' }, { value: '300', label: '5 dəq' }],
    },
  ],
  setup,
  action,
  timeout,
  view,
  playerLeft,
  result,
};
