'use strict';

(() => {
  const local = { key: null, guessing: false };
  const TEAM_CLS = ['red', 'blue', 'green', 'yellow'];

  const player = (room, id) => room.players.find((x) => x.id === id) || { nickname: 'Oyunçu' };
  const nm = (room, id) => `<span data-nt>${esc(player(room, id).nickname)}</span>`;
  const word = (w) => (w ? esc(w[LANG === 'ru' ? 1 : LANG === 'en' ? 2 : 0]) : '');
  const timer = (g, tick) => (g.deadline ? `<span class="timer" data-deadline="${g.deadline}"${tick ? ' data-tick="1"' : ''}></span>` : '');
  const teamChip = (g, i) => (i >= 0 && g.teams ? `<span class="team-chip ${TEAM_CLS[i]}">${esc(t(g.teams[i].name))}</span>` : '');

  // Xal cədvəli: komandalar və ya oyunçular (hədəfə qədər)
  function scoreboard(room, g) {
    if (g.teams) {
      return `<div class="scoreboard">${g.teams.map((tm, i) => `
        <div class="score-team ${TEAM_CLS[i]}${g.actorTeam === i && g.phase !== 'over' ? ' now' : ''}">
          <b>${esc(t(tm.name))}</b>
          <span class="score-num">${tm.score}<small>/${g.target}</small></span>
          <span class="score-bar"><i style="width:${Math.min(100, (tm.score / g.target) * 100)}%"></i></span>
        </div>`).join('')}</div>`;
    }
    const list = g.players.filter((p) => !p.left).sort((a, b) => b.score - a.score);
    return `<div class="card solo-scores">
      <span class="eyebrow">Hədəf: ${g.target} söz</span>
      ${list.map((p) => `<div class="row"><span class="grow">${Look.name(player(room, p.id))}${p.id === room.me ? ' <span class="tag">(sən)</span>' : ''}</span><b>${p.score}</b></div>`).join('')}
    </div>`;
  }

  function countdown(room, g) {
    return {
      html: `<div class="stage">
        <p class="muted">Oyun başlayır…</p>
        <div class="big-number timer" data-deadline="${g.deadline}" data-format="sec" data-tick="1"></div>
        <p>İzah edən danışmır, yalnız jestlərlə göstərir 🤐</p>
      </div>
      ${g.teams ? teamsList(room, g) : ''}`,
    };
  }

  function teamsList(room, g) {
    return `<div class="teams-grid">${g.teams.map((tm, i) => `
      <div class="card team-card ${TEAM_CLS[i]}">
        <b>${esc(t(tm.name))}</b>
        ${tm.ids.map((id) => `<span class="small">${Look.name(player(room, id))}</span>`).join('')}
      </div>`).join('')}</div>`;
  }

  function ready(room, g) {
    if (g.isActor) {
      return {
        html: `<div class="center stack">
            <span class="eyebrow">Sən izah edirsən ${teamChip(g, g.actorTeam)}</span>
            <div class="card word-card"><span class="eyebrow">${esc(t(g.category))}</span><div class="secret-word" data-nt>${word(g.word)}</div></div>
            <p class="muted small">Qabağa keç, hazır olanda başla. Danışmaq və hərf göstərmək olmaz!</p>
          </div>
          <button class="btn primary" data-game='{"type":"start"}'>${icon('play')} Başla</button>
          ${g.swaps > 0 ? '<button class="btn outline" data-game=\'{"type":"swap"}\'>🔄 Başqa söz</button>' : ''}
          <p class="hint">Avtomatik başlayacaq: ${timer(g)}</p>`,
      };
    }
    const mine = g.teams && g.myTeam === g.actorTeam;
    return {
      html: `<div class="stage">
          <div class="emoji-xl">🎬</div>
          <h2>${nm(room, g.actor)} izah edəcək</h2>
          ${teamChip(g, g.actorTeam)}
          <p class="muted">${!g.teams || mine ? 'Hazır ol, tapan sən olacaqsan!' : 'Bu dəfə başqa komanda tapır, sən sus 🤫'}</p>
        </div>
        ${scoreboard(room, g)}
        ${room.isHost ? '<button class="btn outline" data-game=\'{"type":"next"}\'>Başlat</button>' : ''}`,
    };
  }

  // İzah edənin "bildilər / bilmədilər" düymələri (fərdi rejimdə kim tapdığını seçir)
  function actorButtons(room, g) {
    if (!g.teams && local.guessing) {
      const opts = g.players.filter((p) => !p.left && p.id !== g.actor)
        .map((p) => `<button class="player" data-game='${JSON.stringify({ type: 'guessed', guesser: p.id })}'>
          <span class="avatar-wrap"><span class="initial sm${Look.frame(player(room, p.id))}">${initial(player(room, p.id).nickname)}</span></span>
          <span class="name">${Look.name(player(room, p.id))}</span></button>`).join('');
      return `<p class="center"><b>Kim tapdı?</b></p><div class="players">${opts}</div>
        <button class="btn ghost" data-local="guessCancel">Geri</button>`;
    }
    return `<div class="decide-grid">
      <button class="btn good big-btn" ${g.teams ? 'data-game=\'{"type":"guessed"}\'' : 'data-local="guessPick"'}>✅ Bildilər</button>
      <button class="btn bad big-btn" data-game='{"type":"missed"}'>❌ Bilmədilər</button>
    </div>`;
  }

  function acting(room, g) {
    if (g.isActor) {
      return {
        html: `<div class="center stack">
            <div class="card word-card"><span class="eyebrow">${esc(t(g.category))}</span><div class="secret-word" data-nt>${word(g.word)}</div></div>
            <div class="big-number timer" data-deadline="${g.deadline}" data-tick="1"></div>
          </div>
          ${actorButtons(room, g)}`,
      };
    }
    const mine = !g.teams || g.myTeam === g.actorTeam;
    return {
      html: `<div class="center stack">
          <span class="eyebrow">${esc(t(g.category))}</span>
          <h2>${nm(room, g.actor)} izah edir</h2>
          ${teamChip(g, g.actorTeam)}
          <div class="big-number timer" style="font-size:72px" data-deadline="${g.deadline}" data-tick="1"></div>
          <p>${mine ? 'Tapın! Ucadan deyin 🗣️' : 'Başqa komandanın növbəsidir, susun 🤫'}</p>
        </div>
        ${scoreboard(room, g)}
        ${room.isHost ? actorButtons(room, g) : ''}`,
    };
  }

  function decide(room, g) {
    if (g.isActor) {
      return {
        html: `<div class="center stack">
            <h2>⏰ Vaxt bitdi!</h2>
            <p>Sözü tapdılar?</p>
            <div class="card word-card"><div class="secret-word small-word" data-nt>${word(g.word)}</div></div>
            <p class="muted small">Seçim etməsən, ${timer(g)} san. sonra «bilmədilər» sayılacaq</p>
          </div>
          ${actorButtons(room, g)}`,
      };
    }
    return {
      html: `<div class="stage">
          <div class="emoji-xl">⏰</div>
          <h2>Vaxt bitdi!</h2>
          <p class="muted">${nm(room, g.actor)} qərar verir: tapdınız, ya yox?</p>
        </div>
        ${scoreboard(room, g)}
        ${room.isHost ? actorButtons(room, g) : ''}`,
    };
  }

  function turnResult(room, g) {
    const l = g.lastTurn;
    const who = l.guessed
      ? (g.teams ? `+1 ${teamChip(g, l.team)}` : `+1 ${nm(room, l.guesser)} · +1 ${nm(room, l.actor)}`)
      : '';
    return {
      html: `<div class="stage">
          <div class="emoji-xl">${l.guessed ? '🎉' : '😅'}</div>
          <div class="banner ${l.guessed ? 'good' : 'bad'}">${l.guessed ? '✅ Bildilər!' : '❌ Bilmədilər'}</div>
          <div class="card word-card"><span class="eyebrow">${esc(t(l.cat))}</span><div class="secret-word small-word" data-nt>${word(l.word)}</div></div>
          ${who ? `<p><b>${who}</b></p>` : ''}
        </div>
        ${scoreboard(room, g)}
        ${room.isHost ? '<button class="btn primary" data-game=\'{"type":"next"}\'>Növbəti</button>' : ''}`,
    };
  }

  function over(room, g) {
    let title = 'Oyun bitdi';
    let mine = false;
    if (g.winnerKey != null) {
      if (g.teams) {
        const i = Number(g.winnerKey);
        title = `${t(g.teams[i].name)} qalib gəldi!`;
        mine = g.myTeam === i;
      } else {
        title = `${player(room, Number(g.winnerKey)).nickname} qalib gəldi!`;
        mine = Number(g.winnerKey) === room.me;
      }
    }
    return {
      html: `<div class="stage">
          <div class="emoji-xl">🏆</div>
          <h1 data-nt>${esc(title)}</h1>
          ${g.inGame ? `<p class="banner ${mine ? 'good' : 'bad'}">${mine ? 'Siz qazandınız 🎉' : 'Bu dəfə uduzdunuz 😅'}</p>` : ''}
          ${g.lastTurn && g.lastTurn.guessed ? `<p class="muted">Son söz: «<span data-nt>${word(g.lastTurn.word)}</span>»</p>` : ''}
        </div>
        ${scoreboard(room, g)}`,
    };
  }

  const PHASES = { countdown, ready, acting, decide, turnResult, over };

  // ---------- Lobbi: host komandaları paylayır ----------

  function lobby(room) {
    if (room.settings.mode !== 'teams' || room.settings.teamPick !== 'manual') return '';
    const n = Number(room.settings.teams) || 2;
    const names = ['Qırmızılar', 'Mavilər', 'Yaşıllar', 'Sarılar'];
    const cols = Array.from({ length: n }, (_, i) => room.players.filter((p) => room.assign[p.id] === i));
    const none = room.players.filter((p) => room.assign[p.id] == null || room.assign[p.id] >= n);
    const chip = (p) => room.isHost
      ? `<button class="assign-chip" data-app="assign" data-arg="${p.id}">${Look.name(p)}</button>`
      : `<span class="assign-chip">${Look.name(p)}</span>`;
    return `
      <div class="card stack">
        <div><h3>Komandalar</h3><p class="muted small">${room.isHost ? 'Oyunçuya toxun: növbəti komandaya keçir' : 'Host komandaları paylayır'}</p></div>
        <div class="teams-grid">${cols.map((c, i) => `
          <div class="team-card ${TEAM_CLS[i]}"><b>${esc(t(names[i]))}</b>${c.map(chip).join('') || '<span class="muted small">—</span>'}</div>`).join('')}
        </div>
        ${none.length ? `<div><span class="eyebrow">Paylanmayıb (avtomatik düşəcək)</span><div class="assign-free">${none.map(chip).join('')}</div></div>` : ''}
      </div>`;
  }

  // ---------- Hostun aparıcı səsi ----------

  function narration(g) {
    switch (g.phase) {
      case 'ready': return { key: `ready:${g.actor}:${g.lastTurn ? g.lastTurn.word[0] : ''}`, clip: 'cha_ready' };
      case 'acting': return { key: `acting:${g.actor}`, clip: 'cha_start' };
      case 'decide': return { key: `decide:${g.actor}`, clip: 'cha_time' };
      case 'turnResult': return { key: `result:${g.lastTurn.word[0]}`, clip: g.lastTurn.guessed ? 'cha_guessed' : null };
      case 'over': return { key: 'over', clip: 'cha_win' };
      default: return null;
    }
  }

  GameClients.charades = {
    render(room) {
      const g = room.game;
      const key = `${g.phase}:${g.actor}`;
      if (key !== local.key) { local.key = key; local.guessing = false; }
      const fn = PHASES[g.phase];
      return fn ? fn(room, g) : { html: '' };
    },
    lobby,
    narration,
    clips: ['cha_ready', 'cha_start', 'cha_time', 'cha_guessed', 'cha_win'],
    local(action) {
      if (action === 'guessPick') local.guessing = true;
      if (action === 'guessCancel') local.guessing = false;
    },
  };
})();
