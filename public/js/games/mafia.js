'use strict';

(() => {
  const ROLES = {
    mafia: { name: 'Mafia', icon: '🔪', text: 'Gecələr yoldaşlarınla birlikdə bir nəfəri seç. Gündüz özünü vətəndaş kimi göstər!' },
    doctor: { name: 'Həkim', icon: '💉', text: 'Hər gecə bir nəfəri xilas et. Özünü də seçə bilərsən.' },
    detective: { name: 'Komissar', icon: '🔍', text: 'Hər gecə bir nəfəri yoxla və mafia olub-olmadığını öyrən.' },
    citizen: { name: 'Vətəndaş', icon: '🙂', text: 'Gündüz diqqətli ol, mafianı tap və ona səs ver!' },
  };

  const STEP_TITLE = {
    mafia: 'Kimi aradan götürürük?',
    doctor: 'Kimi xilas edirsən?',
    detective: 'Kimi yoxlayırsan?',
  };

  // Telefonun özündə saxlanan kiçik vəziyyət (seçim, rol kartı açıq/bağlı)
  const local = { key: null, selected: null, showRole: false };

  const nick = (room, id) => {
    const p = room.players.find((x) => x.id === id);
    return p ? p.nickname : 'Oyunçu';
  };
  // Nickname tərcümə olunmasın deyə data-nt ilə
  const nm = (room, id) => `<span data-nt>${esc(nick(room, id))}</span>`;
  const roleName = (r) => (r && ROLES[r] ? `${ROLES[r].icon} ${ROLES[r].name}` : '');
  const timer = (g, tick) =>
    g.deadline ? `<span class="timer" data-deadline="${g.deadline}"${tick ? ' data-tick="1"' : ''}></span>` : '';

  function playerRow(room, g, p, opts = {}) {
    const me = p.id === room.me;
    const tag = opts.tag ?? (p.role ? roleName(p.role) : '');
    const inner = `
      <span class="avatar${Look.frame(room.players.find((x) => x.id === p.id))}">${p.alive ? '🙂' : '💀'}</span>
      <span class="name">${Look.name(room.players.find((x) => x.id === p.id) || { nickname: nick(room, p.id) })}${me ? ' <span class="tag">(sən)</span>' : ''}</span>
      ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
      ${opts.votes ? `<span class="votes">${opts.votes}</span>` : ''}`;
    const cls = `player${Look.row(room.players.find((x) => x.id === p.id))}${p.alive ? '' : ' dead'}${opts.selected ? ' selected' : ''}`;
    return opts.selectable
      ? `<button class="${cls}" data-local="select" data-id="${p.id}">${inner}</button>`
      : `<div class="${cls}">${inner}</div>`;
  }

  function playersList(room, g, opts = {}) {
    return `<div class="players">${g.players.map((p) => playerRow(room, g, p, opts.row ? opts.row(p) : {})).join('')}</div>`;
  }

  function myRoleChip(g) {
    if (!g.myRole) return '';
    return `<button class="pill" data-local="toggleRole" style="border:0;font:inherit;align-self:center">
      ${local.showRole ? roleName(g.myRole) : '👁 Rolum'}</button>`;
  }

  function deadBanner(g) {
    return g.amAlive ? '' : '<div class="banner bad">💀 Sən oyundan çıxmısan. Danışma, sadəcə izlə 🤐</div>';
  }

  // ---------- Mərhələlər ----------

  function countdown(room, g) {
    return {
      html: `<div class="stage">
        <p class="muted">Rollar paylanır…</p>
        <div class="big-number timer" data-deadline="${g.deadline}" data-format="sec" data-tick="1"></div>
        <p>Telefonunu heç kimə göstərmə 🤫</p>
      </div>`,
    };
  }

  function reveal(room, g) {
    const r = ROLES[g.myRole];
    const mates = g.myRole === 'mafia'
      ? g.players.filter((p) => p.role === 'mafia' && p.id !== room.me).map((p) => nm(room, p.id))
      : [];
    const card = local.showRole
      ? `<button class="role-card ${g.myRole}" data-local="toggleRole">
          <div class="emoji-xl">${r.icon}</div>
          <h1>${r.name}</h1>
          <p>${r.text}</p>
          ${mates.length ? `<p><b>Yoldaşların:</b> ${mates.join(', ')}</p>` : ''}
          <p class="small" style="opacity:.7">Gizlətmək üçün toxun</p>
        </button>`
      : `<button class="role-card hidden" data-local="toggleRole">
          <div class="emoji-xl">🤫</div>
          <h2>Rolunu görmək üçün toxun</h2>
          <p class="muted">Ekranı heç kimə göstərmə</p>
        </button>`;
    return {
      html: `<div class="stage">
        ${card}
        ${g.seen
          ? `<p class="muted">Digərləri gözlənilir… ${g.seenCount}/${g.total}</p>`
          : '<button class="btn good" data-game=\'{"type":"seen"}\'>Gördüm</button>'}
        <p class="muted small">Gecə ${timer(g)} san. sonra başlayır</p>
        ${room.isHost ? '<button class="btn outline" data-game=\'{"type":"next"}\'>Gecəyə keç</button>' : ''}
      </div>`,
    };
  }

  function night(room, g) {
    if (g.myTurn) return nightTurn(room, g);
    return {
      night: true,
      html: `<div class="stage">
        <div class="emoji-xl">🌙</div>
        <h1>Gecədir</h1>
        <p class="muted">Gözlərini yum və telefonu yerə qoy</p>
      </div>
      ${deadBanner(g)}
      ${myRoleChip(g)}`,
    };
  }

  function nightTurn(room, g) {
    const step = g.step;
    const role = ROLES[step];

    if (g.locked) {
      let msg = '<h2>Seçim edildi ✅</h2><p class="muted">İndi gözlərini yum</p>';
      if (step === 'detective' && g.checkResult) {
        const who = nm(room, g.checkResult.target);
        msg = g.checkResult.isMafia
          ? `<div class="banner bad">🔴 ${who} MAFİADIR!</div><p class="muted">Yadda saxla və gözlərini yum</p>`
          : `<div class="banner good">🟢 ${who} mafia deyil</div><p class="muted">Yadda saxla və gözlərini yum</p>`;
      }
      return { night: true, html: `<div class="stage"><div class="emoji-xl">${role.icon}</div>${msg}</div>` };
    }

    const options = new Set(g.options);
    const pickFor = (id) => {
      if (step !== 'mafia' || !g.mafiaVotes) return 0;
      return Object.values(g.mafiaVotes).filter((t) => t === id).length;
    };
    const rows = g.players
      .filter((p) => options.has(p.id))
      .map((p) => playerRow(room, g, p, {
        selectable: true,
        selected: local.selected === p.id || (local.selected == null && g.pick === p.id),
        votes: pickFor(p.id),
      }))
      .join('');

    let hint = '';
    if (step === 'mafia') {
      const mates = Object.entries(g.mafiaVotes || {})
        .filter(([voter]) => Number(voter) !== room.me)
        .map(([voter, t]) => `${nm(room, Number(voter))} → ${nm(room, t)}`);
      hint = `<p class="muted small center">Hamınız eyni adamı seçməlisiniz.${mates.length ? '<br>' + mates.join('<br>') : ''}</p>`;
    }
    if (step === 'detective' && g.checks && g.checks.length) {
      hint = `<p class="muted small center">Əvvəlki yoxlamalar: ${g.checks
        .map((c) => `${nm(room, c.target)} ${c.isMafia ? '🔴' : '🟢'}`).join(', ')}</p>`;
    }

    const selected = local.selected ?? null;
    const payload = selected != null ? JSON.stringify({ type: 'target', targetId: selected }) : '';
    return {
      night: true,
      html: `
        <div class="center stack">
          <div class="emoji-xl" style="font-size:56px">${role.icon}</div>
          <h2>${role.name}, oyan!</h2>
          <p>${STEP_TITLE[step]}</p>
          <p class="muted small">${timer(g, true)}</p>
        </div>
        <div class="players">${rows}</div>
        ${hint}
        <button class="btn primary" ${selected == null ? 'disabled' : `data-game='${payload}'`}>Təsdiqlə</button>`,
    };
  }

  function morningResult(room, g) {
    const n = g.lastNight;
    if (!n) return '';
    if (n.killed != null) {
      if (n.killed === room.me) return '<div class="banner bad">💀 Bu gecə SƏNİ öldürdülər</div>';
      const role = g.players.find((p) => p.id === n.killed)?.role;
      return `<div class="banner bad">💀 Bu gecə <b>${nm(room, n.killed)}</b> öldürüldü${role ? `<br><span class="small">${roleName(role)} idi</span>` : ''}</div>`;
    }
    return n.saved
      ? '<div class="banner good">💉 Həkim kimisə xilas etdi! Heç kim ölmədi</div>'
      : '<div class="banner good">🎉 Bu gecə heç kim ölmədi</div>';
  }

  function morning(room, g) {
    return {
      html: `<div class="stage">
        <div class="emoji-xl">☀️</div>
        <h1>Səhər açıldı!</h1>
        <p class="muted">Hamı gözlərini açsın</p>
        ${morningResult(room, g)}
      </div>
      ${room.isHost ? '<button class="btn outline" data-game=\'{"type":"next"}\'>Davam et</button>' : ''}`,
    };
  }

  function discussion(room, g) {
    return {
      html: `<div class="center stack">
        <div class="emoji-xl" style="font-size:56px">🗣️</div>
        <h2>Müzakirə</h2>
        <p class="muted">Sizcə mafia kimdir? Danışın!</p>
        <div class="big-number timer" style="font-size:64px" data-deadline="${g.deadline}" data-tick="1"></div>
      </div>
      ${morningResult(room, g)}
      ${deadBanner(g)}
      ${playersList(room, g)}
      ${myRoleChip(g)}
      ${room.isHost ? '<button class="btn primary" data-game=\'{"type":"next"}\'>Səsverməyə keç</button>' : ''}`,
    };
  }

  function vote(room, g) {
    const counts = {};
    for (const t of Object.values(g.votes || {})) counts[t] = (counts[t] || 0) + 1;
    const myVote = g.votes ? g.votes[room.me] : undefined;
    const voted = Object.keys(g.votes || {}).length;
    const alive = g.players.filter((p) => p.alive).length;

    if (!g.amAlive) {
      return {
        html: `<div class="center stack"><h2>🗳️ Səsvermə</h2><p class="muted">${timer(g)} · ${voted}/${alive} səs</p></div>
          ${deadBanner(g)}
          ${playersList(room, g, { row: (p) => ({ votes: counts[p.id] || 0 }) })}`,
      };
    }

    const selected = local.selected ?? myVote ?? null;
    const rows = g.players
      .filter((p) => p.alive && p.id !== room.me) // özünə səs vermək olmur, siyahıda da görünmür
      .map((p) => playerRow(room, g, p, {
        selectable: true,
        selected: selected === p.id,
        votes: counts[p.id] || 0,
      }))
      .join('');
    const changed = local.selected != null && local.selected !== myVote;
    const payload = JSON.stringify({ type: 'vote', targetId: local.selected });
    return {
      html: `
        <div class="center stack">
          <h2>🗳️ Kimi şəhərdən qovuruq?</h2>
          <p class="muted">${timer(g, true)} · ${voted}/${alive} səs verdi</p>
        </div>
        <div class="players">${rows}
          <button class="player${selected === 'skip' ? ' selected' : ''}" data-local="select" data-id="skip">
            <span class="avatar">🤷</span><span class="name">Heç kimi</span>
            ${counts.skip ? `<span class="votes">${counts.skip}</span>` : ''}
          </button>
        </div>
        ${counts[room.me] ? `<p class="center muted small">Sənə qarşı ${counts[room.me]} səs var</p>` : ''}
        ${myVote !== undefined && !changed
          ? '<p class="center muted">Səsin qəbul olundu ✅ Fikrini dəyişə bilərsən</p>'
          : `<button class="btn primary" ${local.selected == null ? 'disabled' : `data-game='${payload}'`}>Səs ver</button>`}
        ${myRoleChip(g)}`,
    };
  }

  function voteResult(room, g) {
    const v = g.lastVote;
    let html;
    if (v.eliminated != null) {
      const role = g.players.find((p) => p.id === v.eliminated)?.role;
      html = v.eliminated === room.me
        ? '<div class="banner bad">🚪 Şəhər SƏNİ qovdu</div>'
        : `<div class="banner bad">🚪 <b>${nm(room, v.eliminated)}</b> şəhərdən qovuldu${role ? `<br><span class="small">${roleName(role)} idi</span>` : ''}</div>`;
    } else {
      html = `<div class="banner info">${v.tie ? '⚖️ Səslər bərabər oldu.' : ''} Heç kim qovulmadı</div>`;
    }
    return {
      html: `<div class="stage"><div class="emoji-xl">🗳️</div>${html}</div>
        ${playersList(room, g, { row: (p) => ({ votes: v.counts[p.id] || 0 }) })}
        ${room.isHost ? '<button class="btn outline" data-game=\'{"type":"next"}\'>Davam et</button>' : ''}`,
    };
  }

  function over(room, g) {
    const mafiaWon = g.winner === 'mafia';
    const myTeamWon = g.myRole && (g.myRole === 'mafia') === mafiaWon;
    return {
      html: `<div class="stage">
        <div class="emoji-xl">${mafiaWon ? '🔪' : '🏆'}</div>
        <h1>${mafiaWon ? 'Mafia qalib gəldi!' : 'Şəhər qalib gəldi!'}</h1>
        ${g.endVote ? `<div class="banner info">🚪 <b>${nm(room, g.endVote.eliminated)}</b> şəhərdən qovuldu</div>` : ''}
        ${g.myRole ? `<p class="banner ${myTeamWon ? 'good' : 'bad'}">${myTeamWon ? 'Siz qazandınız 🎉' : 'Bu dəfə uduzdunuz 😅'}</p>` : ''}
      </div>
      <h3>Kim kim idi?</h3>
      ${playersList(room, g)}`,
    };
  }

  const PHASES = { countdown, reveal, night, morning, discussion, vote, voteResult, over };

  // ---------- Hostun aparıcı mətni ----------

  function narration(g, room) {
    const key = `${g.phase}:${g.round}:${g.step || ''}`;
    const say = (clip) => ({ key, clip });
    switch (g.phase) {
      case 'reveal': return say('reveal');
      case 'night':
        if (['sleep', 'mafia', 'doctor', 'detective'].includes(g.step)) return say(g.step);
        return null;
      // Adlar səsləndirilmir (hazır səs faylıdır), ekranda görünür
      case 'morning': return say(g.lastNight && g.lastNight.killed != null ? 'morning_killed' : 'morning_none');
      case 'discussion': return say('discussion');
      case 'vote': return say('vote');
      case 'voteResult': return say(g.lastVote && g.lastVote.eliminated != null ? 'vote_out' : 'vote_none');
      case 'over': return say(g.winner === 'mafia' ? 'over_mafia' : 'over_town');
      default: return null;
    }
  }

  GameClients.mafia = {
    render(room) {
      const g = room.game;
      const key = `${g.phase}:${g.round}:${g.step || ''}`;
      if (key !== local.key) {
        local.key = key;
        local.selected = null;
        if (g.phase !== 'reveal') local.showRole = false;
      }
      const fn = PHASES[g.phase];
      return fn ? fn(room, g) : { html: '' };
    },
    narration,
    // public/audio/<səs>/ altındakı fayllar
    clips: ['reveal', 'sleep', 'mafia', 'doctor', 'detective', 'morning_killed', 'morning_none',
      'discussion', 'vote', 'vote_out', 'vote_none', 'over_mafia', 'over_town'],
    local(action, data) {
      if (action === 'toggleRole') local.showRole = !local.showRole;
      if (action === 'select') local.selected = data.id === 'skip' ? 'skip' : Number(data.id);
    },
  };
})();
