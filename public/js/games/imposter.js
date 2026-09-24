'use strict';

(() => {
  // Telefonun özündə saxlanan kiçik vəziyyət
  const local = { key: null, selected: null, showWord: false };

  const player = (room, id) => room.players.find((x) => x.id === id) || { nickname: 'Oyunçu' };
  const nm = (room, id) => `<span data-nt>${esc(player(room, id).nickname)}</span>`;
  // Söz serverdən üç dildə gəlir: [az, ru, en]
  const word = (w) => (w ? esc(w[LANG === 'ru' ? 1 : LANG === 'en' ? 2 : 0]) : '');
  const timer = (g, tick) => (g.deadline ? `<span class="timer" data-deadline="${g.deadline}"${tick ? ' data-tick="1"' : ''}></span>` : '');
  const isImp = (g) => g.myRole === 'imposter';

  function row(room, id, opts = {}) {
    const p = player(room, id);
    const me = id === room.me;
    const inner = `
      <span class="avatar-wrap"><span class="initial sm${Look.frame(p)}">${initial(p.nickname)}</span></span>
      <span class="name">${Look.name(p)}${me ? ' <span class="tag">(sən)</span>' : ''}</span>
      ${opts.tag ? `<span class="tag">${opts.tag}</span>` : ''}
      ${opts.votes ? `<span class="votes">${opts.votes}</span>` : ''}`;
    const cls = `player${Look.row(p)}${opts.selected ? ' selected' : ''}${opts.done ? ' done' : ''}${opts.current ? ' current' : ''}${opts.left ? ' dead' : ''}`;
    return opts.selectable
      ? `<button class="${cls}" data-local="select" data-id="${id}">${inner}</button>`
      : `<div class="${cls}">${inner}</div>`;
  }

  // Sözə yenidən baxmaq üçün düymə (oyun boyu)
  function wordChip(g) {
    if (!g.myRole) return '';
    const label = local.showWord ? (isImp(g) ? '🤫 İmposter' : `🔑 <span data-nt>${word(g.word)}</span>`) : '👁 Sözüm';
    return `<button class="pill" data-local="toggleWord" style="border:0;font:inherit;align-self:center">${label}</button>`;
  }

  function outBanner(g) {
    return g.amIn || !g.myRole ? '' : '<div class="banner bad">🚪 Sən oyundan çıxmısan, sadəcə izlə</div>';
  }

  // ---------- Mərhələlər ----------

  function countdown(room, g) {
    return {
      html: `<div class="stage">
        <p class="muted">Sözlər paylanır…</p>
        <div class="big-number timer" data-deadline="${g.deadline}" data-format="sec" data-tick="1"></div>
        <p>Telefonunu heç kimə göstərmə 🤫</p>
      </div>`,
    };
  }

  function secretCard(room, g) {
    if (!local.showWord) {
      return `<button class="role-card hidden" data-local="toggleWord">
        <div class="emoji-xl">🤫</div>
        <h2>Sözünü görmək üçün toxun</h2>
        <p class="muted">Ekranı heç kimə göstərmə</p>
      </button>`;
    }
    if (isImp(g)) {
      return `<button class="role-card imposter" data-local="toggleWord">
        <div class="emoji-xl">🕵️</div>
        <h1>Sən İMPOSTER-sən</h1>
        <p>${g.category ? `Kateqoriya: <b>${esc(t(g.category))}</b>` : 'Kateqoriyanı da bilmirsən'}</p>
        ${g.partners && g.partners.length ? `<p><b>Yoldaşın:</b> ${g.partners.map((id) => nm(room, id)).join(', ')}</p>` : ''}
        <p class="small">Sözü bilmirsən. Başqalarını dinlə və özünü ələ vermə!</p>
        <p class="small" style="opacity:.7">Gizlətmək üçün toxun</p>
      </button>`;
    }
    return `<button class="role-card word" data-local="toggleWord">
      <span class="eyebrow">${esc(t(g.category))}</span>
      <div class="secret-word" data-nt>${word(g.word)}</div>
      <p class="small">Bu sözü imposter bilmir. Onu birbaşa demə!</p>
      <p class="small" style="opacity:.7">Gizlətmək üçün toxun</p>
    </button>`;
  }

  function reveal(room, g) {
    return {
      html: `<div class="stage">
        ${secretCard(room, g)}
        ${g.seen
          ? `<p class="muted">Digərləri gözlənilir… ${g.seenCount}/${g.total}</p>`
          : '<button class="btn good" data-game=\'{"type":"seen"}\'>Gördüm</button>'}
        <p class="muted small">Söz turuna ${timer(g)} san. qalıb</p>
        ${room.isHost ? '<button class="btn outline" data-game=\'{"type":"next"}\'>Söz turuna keç</button>' : ''}
      </div>`,
    };
  }

  function clues(room, g) {
    const speaker = g.speakers[g.turn];
    const mine = speaker === room.me;
    const list = g.speakers.map((id, i) => row(room, id, {
      done: i < g.turn,
      current: i === g.turn,
      tag: i < g.turn ? '✓' : i === g.turn ? '🎤' : `${i + 1}`,
    })).join('');
    return {
      html: `
        <div class="center stack">
          <span class="eyebrow">${g.round > 1 ? `Raund ${g.round} · ` : ''}Söz turu ${g.clueRound}/${g.clueRounds}</span>
          ${mine
            ? '<h2>🎤 Sənin növbən!</h2><p>Sözlə bağlı <b>bir söz</b> de, amma sözün özünü demə</p>'
            : `<h2>🎤 Növbə: ${nm(room, speaker)}</h2><p class="muted">Diqqətlə dinlə, kim sözü bilmir?</p>`}
          <p class="muted small">${timer(g, mine)}</p>
        </div>
        ${mine || room.isHost ? `<button class="btn primary" data-game='{"type":"said"}'>${mine ? 'Dedim' : 'Növbəti oyunçu'}</button>` : ''}
        <div class="players">${list}</div>
        ${wordChip(g)}`,
    };
  }

  function discussion(room, g) {
    return {
      html: `<div class="center stack">
        <div class="emoji-xl" style="font-size:56px">🗣️</div>
        <h2>Müzakirə</h2>
        <p class="muted">Kim imposter-dir? Danışın!</p>
        <div class="big-number timer" style="font-size:64px" data-deadline="${g.deadline}" data-tick="1"></div>
      </div>
      ${outBanner(g)}
      <div class="players">${g.players.map((p) => row(room, p.id, { left: p.left || p.out, tag: p.out ? 'çıxdı' : '' })).join('')}</div>
      ${wordChip(g)}
      ${room.isHost ? '<button class="btn primary" data-game=\'{"type":"next"}\'>Səsverməyə keç</button>' : ''}`,
    };
  }

  function vote(room, g) {
    const counts = {};
    for (const tId of Object.values(g.votes || {})) counts[tId] = (counts[tId] || 0) + 1;
    const myVote = g.votes ? g.votes[room.me] : undefined;
    const active = g.players.filter((p) => !p.left && !p.out);
    const voted = Object.keys(g.votes || {}).length;
    if (!g.amIn) {
      return {
        html: `<div class="center stack"><h2>🗳️ Səsvermə</h2><p class="muted">${timer(g)} · ${voted}/${active.length} səs</p></div>
          ${outBanner(g)}
          <div class="players">${active.map((p) => row(room, p.id, { votes: counts[p.id] || 0 })).join('')}</div>`,
      };
    }
    const selected = local.selected ?? myVote ?? null;
    const rows = active
      .filter((p) => p.id !== room.me) // özünə səs vermək olmur
      .map((p) => row(room, p.id, { selectable: true, selected: selected === p.id, votes: counts[p.id] || 0 }))
      .join('');
    const changed = local.selected != null && local.selected !== myVote;
    const payload = JSON.stringify({ type: 'vote', targetId: local.selected });
    return {
      html: `
        <div class="center stack">
          <h2>🗳️ Kim imposter-dir?</h2>
          <p class="muted">${timer(g, true)} · ${voted}/${active.length} səs verdi</p>
        </div>
        <div class="players">${rows}
          <button class="player${selected === 'pass' ? ' selected' : ''}" data-local="select" data-id="pass">
            <span class="avatar">🤷</span><span class="name">Pass <span class="tag">heç kimi seçmirəm</span></span>
            ${counts.pass ? `<span class="votes">${counts.pass}</span>` : ''}
          </button>
        </div>
        <p class="center muted small">Çoxluq pass desə, heç kim çıxmır və yeni söz turu başlayır</p>
        ${counts[room.me] ? `<p class="center muted small">Sənə qarşı ${counts[room.me]} səs var</p>` : ''}
        ${myVote !== undefined && !changed
          ? '<p class="center muted">Səsin qəbul olundu ✅ Fikrini dəyişə bilərsən</p>'
          : `<button class="btn primary" ${local.selected == null ? 'disabled' : `data-game='${payload}'`}>Səs ver</button>`}
        ${wordChip(g)}`,
    };
  }

  function voteResult(room, g) {
    const v = g.lastVote;
    const html = v.accused != null
      ? `<div class="banner info">🗳️ Ən çox səs: <b>${nm(room, v.accused)}</b><br><span class="small">Görək imposter idimi…</span></div>`
      : `<div class="banner info">${v.passed ? '🤷 Çoxluq pass dedi.' : '⚖️ Səslər bərabər oldu.'} Heç kim seçilmədi<br>
          <span class="small">Yeni söz turu başlayır</span></div>`;
    const active = g.players.filter((p) => !p.left && !p.out);
    return {
      html: `<div class="stage"><div class="emoji-xl">🥁</div>${html}</div>
        <div class="players">${active.map((p) => row(room, p.id, { votes: v.counts[p.id] || 0 })).join('')}</div>
        ${v.passes ? `<p class="center muted small">🤷 Pass: ${v.passes}</p>` : ''}
        ${room.isHost ? '<button class="btn outline" data-game=\'{"type":"next"}\'>Davam et</button>' : ''}`,
    };
  }

  // Səsvermə ilə çıxarılan oyunçu (günahsız, və ya sözü tapa bilməyən imposter — başqa imposter qalıbsa)
  function eliminated(room, g) {
    const o = g.lastOut;
    const msg = o.kind === 'innocent'
      ? `<div class="banner bad">🚪 <b>${nm(room, o.id)}</b> imposter deyildi!</div>`
      : `<div class="banner good">🕵️ <b>${nm(room, o.id)}</b> imposter idi, amma sözü tapa bilmədi</div>
         <p><b>Daha bir imposter aranızdadır!</b></p>`;
    return {
      html: `<div class="stage">
        <div class="emoji-xl">${o.kind === 'innocent' ? '😬' : '🎯'}</div>
        ${msg}
        <p class="muted">Oyun davam edir · qalan ${g.remaining} oyunçu</p>
        ${o.id === room.me ? '<p class="banner info">Sən oyundan çıxdın, amma izləyə bilərsən 👀</p>' : ''}
      </div>
      ${room.isHost ? '<button class="btn outline" data-game=\'{"type":"next"}\'>Növbəti söz turu</button>' : ''}`,
    };
  }

  function guess(room, g) {
    if (g.guesser === room.me) {
      const opts = g.options.map((o) => `<button class="btn outline guess-btn" data-game='${JSON.stringify({ type: 'guess', index: o.index })}'><span data-nt>${word(o.word)}</span></button>`).join('');
      return {
        html: `<div class="center stack">
            <div class="emoji-xl">😱</div>
            <h2>Tutuldun!</h2>
            <p>Amma hələ qazana bilərsən: gizli sözü tap</p>
            <p class="muted small">${timer(g, true)}</p>
          </div>
          <div class="guess-grid">${opts}</div>`,
      };
    }
    return {
      html: `<div class="stage">
        <div class="emoji-xl">🕵️</div>
        <div class="banner bad"><b>${nm(room, g.guesser)}</b> imposter idi!</div>
        <p>İndi sözü təxmin edir… Tapsa, imposter qalib gəlir</p>
        <p class="muted small">${timer(g)}</p>
      </div>`,
    };
  }

  function over(room, g) {
    const impWon = g.winner === 'imposter';
    const myTeamWon = g.myRole && (g.myRole === 'imposter') === impWon;
    const why = {
      survived: `Cəmi ${g.remaining} oyunçu qaldı, imposter sona qədər tapılmadı`,
      guessed: `İmposter sözü tapdı: «${word(g.guess)}»`,
      caught: g.guess ? `İmposter səhv təxmin etdi: «${word(g.guess)}»` : 'İmposter sözü tapa bilmədi',
      left: 'Oyunçu oyunu tərk etdi',
    }[g.reason] || '';
    return {
      html: `<div class="stage">
        <div class="emoji-xl">${impWon ? '🕵️' : '🏆'}</div>
        <h1>${impWon ? 'İmposter qalib gəldi!' : 'Komanda qalib gəldi!'}</h1>
        ${g.reason === 'survived' && g.lastOut && g.lastOut.kind === 'innocent' ? `<div class="banner bad">🚪 <b>${nm(room, g.lastOut.id)}</b> imposter deyildi!</div>` : ''}
        <p class="muted">${why}</p>
        ${g.myRole ? `<p class="banner ${myTeamWon ? 'good' : 'bad'}">${myTeamWon ? 'Siz qazandınız 🎉' : 'Bu dəfə uduzdunuz 😅'}</p>` : ''}
        <div class="card center stack" style="gap:4px"><span class="eyebrow">${esc(t(g.category))}</span><div class="secret-word small-word" data-nt>${word(g.word)}</div></div>
      </div>
      <h3>Kim kim idi?</h3>
      <div class="players">${g.players.map((p) => row(room, p.id, { tag: p.role === 'imposter' ? '🕵️ İmposter' : '🙂', left: p.left || p.out })).join('')}</div>`,
    };
  }

  const PHASES = { countdown, reveal, clues, discussion, vote, voteResult, eliminated, guess, over };

  // ---------- Hostun aparıcı səsi ----------

  function narration(g) {
    const key = `${g.phase}:${g.turn ?? ''}:${g.clueRound ?? ''}`;
    const say = (clip) => ({ key: g.phase, clip });
    switch (g.phase) {
      case 'reveal': return say('imp_reveal');
      case 'clues': return g.turn === 0 && g.clueRound === 1 ? { key: `clues:${g.round}`, clip: 'imp_clues' } : { key, clip: null };
      case 'discussion': return say('imp_discussion');
      case 'vote': return say('vote');
      case 'guess': return say('imp_guess');
      case 'eliminated': return { key: `eliminated:${g.round}`, clip: g.lastOut && g.lastOut.kind === 'imposter' ? 'imp_out_imposter' : 'imp_out' };
      case 'over': return say(g.winner === 'imposter' ? 'imp_win_imposter' : 'imp_win_team');
      default: return null;
    }
  }

  GameClients.imposter = {
    render(room) {
      const g = room.game;
      const key = `${g.phase}:${g.turn ?? ''}`;
      if (key !== local.key) {
        local.key = key;
        local.selected = null;
        if (g.phase !== 'reveal') local.showWord = false;
      }
      const fn = PHASES[g.phase];
      return fn ? fn(room, g) : { html: '' };
    },
    narration,
    clips: ['imp_reveal', 'imp_clues', 'imp_discussion', 'vote', 'imp_guess', 'imp_out', 'imp_out_imposter', 'imp_win_imposter', 'imp_win_team'],
    local(action, data) {
      if (action === 'toggleWord') local.showWord = !local.showWord;
      if (action === 'select') local.selected = data.id === 'pass' ? 'pass' : Number(data.id);
    },
  };
})();
