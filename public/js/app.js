'use strict';

// Oyun müştəri modulları buraya qeydiyyatdan keçir: GameClients[gameId] = { render, narration, local }
window.GameClients = {};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// Xətti ikonlar (Lucide üslubunda), rəngi mətn rəngindən götürür
const ICONS = {
  logo: '<rect x="3" y="3" width="8" height="8" rx="2"/><circle cx="17" cy="7" r="4"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="m7 13 4 4-4 4-4-4z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
  crown: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  sound: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  play: '<path d="m6 3 14 9-14 9z"/>',
  sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
  replay: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  mafia: '<path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"/><path d="M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"/><path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  // inno sikkəsi: dairə içində "i" (məlumat ikonundan fərqli olsun deyə ayaqlı)
  coin: '<circle cx="12" cy="12" r="9.5"/><path d="M10.2 10.5H12.3v6"/><path d="M10 16.5h4.6"/><path d="M12.1 7.2h.01" stroke-width="2.6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  charades: '<rect width="18" height="14" x="3" y="7" rx="2"/><path d="m3 7 3-4 4 4"/><path d="m10 7 3-4 4 4"/><path d="m10 11 5 3-5 3z"/>',
  imposter: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const initial = (nick) => esc((String(nick || '?').trim()[0] || '?').toLocaleUpperCase('az'));
// Mağazadan alınmış görünüş: ad rəngi, nişan və sətir fonu. Oyun modulları da istifadə edir.
const Look = {
  name(p, text = p && p.nickname) {
    const l = (p && p.look) || {};
    return `<span class="nm${l.name ? ` nm-${esc(l.name)}` : ''}" data-nt>${esc(text)}</span>${l.badge ? ` <span class="nm-badge">${esc(l.badge)}</span>` : ''}`;
  },
  // Avatar çərçivəsi (.fr-<id>)
  frame(p) {
    const l = (p && p.look) || {};
    return l.frame ? ` fr-${esc(l.frame)}` : '';
  },
  // Tünd fonlarda mətn ağ olur (.bg-dark)
  DARK: new Set(['midnight', 'aurora', 'royal', 'forest', 'waves', 'lava', 'disco', 'galaxy',
    'snow', 'bubbles', 'fireflies', 'northern', 'nebula', 'meteor', 'synthwave']),
  row(p) {
    const l = (p && p.look) || {};
    return l.bg ? ` bg-${esc(l.bg)}${this.DARK.has(l.bg) ? ' bg-dark' : ''}` : '';
  },
};
window.Look = Look;

// Nickname sahəsi: yazarkən serverdən boş olub-olmadığını yoxlayır (App.checkNick)
function nickField(value = '', self = '') {
  return `<label>Nickname
    <input name="nickname" required minlength="2" maxlength="20" autocomplete="username" autocapitalize="off"
      spellcheck="false" placeholder="Oyunda görünəcək ad" value="${esc(value)}" data-nickcheck data-self="${esc(self)}">
    <span class="nick-status${self ? ' ok' : ''}" aria-live="polite">${self ? `${icon('check', 'sm')} Hazırkı nickname-in` : ''}</span>
  </label>`;
}

// Qonaq hesabını qeydiyyatlı hesaba çevirmək üçün forma (ana ekranda və mağazada)
function upgradeForm(u) {
  return `<form id="upgrade" class="stack">
    ${nickField(u.nickname, u.nickname)}
    <label>Şifrə <input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Ən azı 6 simvol"></label>
    <label>Şifrəni təkrarla <input name="password2" type="password" required minlength="6" autocomplete="new-password" placeholder="••••••"></label>
    <button class="btn primary" type="submit">${icon('shield')} Qeydiyyatdan keç</button>
    <p class="hint">Xalların, inno balansın və otaqdakı yerin qalır. Nickname-i indi dəyişə bilərsən.</p>
  </form>`;
}

// "X tərəfindən" / "Автор: X" / "by X": söz sırası dilə görə dəyişir
const byLine = (nick) => {
  const n = `<b>${esc(nick)}</b>`;
  return LANG === 'ru' ? `Автор: ${n}` : LANG === 'en' ? `by ${n}` : `${n} tərəfindən`;
};

// Oyun qaydaları səhifələri (server/landing.js) — seçilmiş dildə
const RULES_PAGES = {
  mafia: { emoji: '🕵️', name: 'Mafia', slug: { az: 'mafia', ru: 'mafia', en: 'mafia' } },
  imposter: { emoji: '🤫', name: 'İmposter', slug: { az: 'imposter', ru: 'imposter', en: 'imposter' } },
  charades: { emoji: '🎬', name: 'Səssiz kino', slug: { az: 'sessiz-kino', ru: 'krokodil', en: 'charades' } },
};
const rulesUrl = (id) => `${LANG === 'az' ? '' : `/${LANG}`}/${RULES_PAGES[id].slug[LANG] || RULES_PAGES[id].slug.az}`;

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${t(MONTHS[m - 1])} ${y}`;
}
// Bakı vaxtı ilə ayın bitməsinə qalan gün
function daysLeftInMonth() {
  const baku = new Date(Date.now() + 4 * 3600 * 1000);
  const end = Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((end - baku.getTime()) / 86400000));
}

const gameIcon = (g) => (ICONS[g.id] ? icon(g.id) : esc(g.icon));

function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = t(msg);
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), ms);
}

// Öz təsdiq pəncərəmiz (brauzerin confirm() pəncərəsi əvəzinə). Promise<boolean> qaytarır.
// #app-dan kənarda yaşayır ki, ekran yenidən çəkiləndə itməsin.
const Dialog = {
  resolve: null,
  open(msg, { ok = 'Bəli', cancel = 'Ləğv et', danger = false } = {}) {
    if (this.resolve) this.close(false);
    const el = $('#dialog');
    el.innerHTML = `
      <div class="sheet-backdrop dialog-backdrop" data-dlg="0">
        <div class="sheet card dialog" role="alertdialog" aria-modal="true" aria-describedby="dialog-text">
          <p id="dialog-text" class="dialog-text">${esc(msg)}</p>
          <div class="dialog-actions">
            <button type="button" class="btn outline" data-dlg="0">${esc(cancel)}</button>
            <button type="button" class="btn ${danger ? 'bad' : 'primary'}" data-dlg="1">${esc(ok)}</button>
          </div>
        </div>
      </div>`;
    translateDom(el);
    el.querySelector('[data-dlg="1"]').focus();
    return new Promise((resolve) => { this.resolve = resolve; });
  },
  close(value) {
    $('#dialog').innerHTML = '';
    const r = this.resolve;
    this.resolve = null;
    if (r) r(value);
  },
  init() {
    $('#dialog').addEventListener('click', (e) => {
      const b = e.target.closest('[data-dlg]');
      // Fona toxunmaq = ləğv; pəncərənin içinə toxunmaq heç nə etmir
      if (b && (b.tagName === 'BUTTON' || e.target === b)) this.close(b.dataset.dlg === '1');
    });
    document.addEventListener('keydown', (e) => {
      if (!this.resolve) return;
      if (e.key === 'Escape') this.close(false);
      if (e.key === 'Enter') { e.preventDefault(); this.close(true); }
    });
  },
};
const ask = (msg, opts) => Dialog.open(msg, opts);

function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

// Ekranı 3 dəfə silkələ
function shake() {
  const el = document.body;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 1300);
}

function flash() {
  const el = $('#flash');
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}

// ---------- Səs (fayl lazım deyil, brauzer özü yaradır) ----------

const Sound = {
  ctx: null,
  unlock() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!this.ctx && C) this.ctx = new C();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, start, dur, type = 'sine', vol = 0.35) {
    const c = this.ctx;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  play(name) {
    if (!this.ctx) return;
    const seqs = {
      dead: [[440, 0, 0.45, 'sawtooth'], [370, 0.5, 0.45, 'sawtooth'], [262, 1.0, 1.1, 'sawtooth']],
      morning: [[523, 0, 0.18], [659, 0.18, 0.18], [784, 0.36, 0.45]],
      night: [[392, 0, 0.5], [294, 0.5, 0.9]],
      win: [[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.6]],
      ding: [[880, 0, 0.25]],
      tick: [[1200, 0, 0.06, 'square', 0.12]],
    };
    for (const [f, s, d, type, vol] of seqs[name] || []) this.tone(f, s, d, type, vol);
  },
};

// ---------- Aparıcı səsi (yalnız hostun telefonunda) ----------
// Hazır səs faylları: public/audio/<səs>/<klip>.mp3 (Microsoft Azərbaycan neyron səsləri).
// Telefonun öz sintezatoru Azərbaycan dilini bilmir, ona görə istifadə olunmur.

const VOICE_SETS = {
  az: [{ id: 'babek', name: 'Babək' }, { id: 'banu', name: 'Banu' }],
  ru: [{ id: 'dmitry', name: 'Дмитрий' }, { id: 'svetlana', name: 'Светлана' }],
  en: [{ id: 'ryan', name: 'Ryan' }, { id: 'sonia', name: 'Sonia' }],
};
const voices = () => VOICE_SETS[LANG] || VOICE_SETS.az;

const Narrator = {
  get enabled() { return store.get('pg_narrator') !== 'off'; },
  set enabled(v) { store.set('pg_narrator', v ? 'on' : 'off'); },
  // Hər dil üçün ayrıca seçim yadda qalır
  get voice() { const v = store.get(`pg_voice_${LANG}`) || store.get('pg_voice'); return voices().some((x) => x.id === v) ? v : voices()[0].id; },
  set voice(v) { store.set(`pg_voice_${LANG}`, v); },
  el: null,
  // iOS səsi yalnız toxunuşdan sonra oynatmağa icazə verir: bir dəfə səssiz oynadıb elementi "açırıq"
  unlock() {
    if (this.el) return;
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.muted = true;
    this.el.src = this.url('hello');
    this.el.play().then(() => { this.el.pause(); this.el.muted = false; }).catch(() => { this.el.muted = false; });
  },
  // ?v=: səs faylları dəyişəndə artır (brauzer onları bir həftə yaddaşda saxlayır)
  url(clip, voice = this.voice) { return `/audio/${voice}/${clip}.mp3?v=2`; },
  play(clip, force = false) {
    if (!clip || (!this.enabled && !force)) return;
    if (!this.el) this.unlock();
    this.el.muted = false;
    this.el.src = this.url(clip);
    this.el.play().catch(() => {});
  },
  // Oyun başlamamış klipləri brauzer yaddaşına yüklə ki, mərhələ dəyişəndə gecikmə olmasın
  preloaded: null,
  preload(clips) {
    if (this.preloaded === this.voice) return;
    this.preloaded = this.voice;
    for (const c of clips) fetch(this.url(c)).catch(() => {});
  },
};

// ---------- Ekran sönməsin ----------

const WakeLock = {
  lock: null,
  async request() {
    try {
      if ('wakeLock' in navigator && !this.lock && document.visibilityState === 'visible') {
        this.lock = await navigator.wakeLock.request('screen');
        this.lock.addEventListener('release', () => { this.lock = null; });
      }
    } catch {}
  },
  release() {
    try { if (this.lock) this.lock.release(); } catch {}
    this.lock = null;
  },
};

// ---------- Giriş ekranında dəyişən söz ----------

const ROTATOR_WORDS = ['Komandanla', 'Dostlarınla', 'İş yoldaşlarınla', 'Ailənlə', 'Həmkarlarınla', 'Qrupunla', 'Sinif yoldaşlarınla'];

const Rotator = {
  i: 0,
  start() {
    setInterval(() => {
      const el = document.getElementById('rotator-word');
      if (!el || document.hidden) return;
      el.classList.add('out');
      setTimeout(() => {
        this.i = (this.i + 1) % ROTATOR_WORDS.length;
        el.textContent = t(ROTATOR_WORDS[this.i]);
        el.classList.remove('out');
        el.classList.add('in');
        void el.offsetWidth;
        el.classList.remove('in');
      }, 350);
    }, 2400);
  },
};

// ---------- Tətbiq ----------

const App = {
  token: store.get('pg_token'),
  user: null,
  games: [],
  room: null,
  socket: null,
  authMode: 'quick', // quick | login | register
  screen: 'home', // otaqda olmayanda: home | ranks | shop
  board: { period: 'month', data: null },
  shop: { tab: 'name', data: null, preview: null },
  admin: { tab: 'overview', stats: null, users: null, ads: null, q: '', kind: 'all', feedback: null, fbFilter: 'new', reviews: null },
  reviews: null, // ictimai rəylər
  reviewDraft: { stars: 0, text: '' },
  fbDraft: { kind: 'idea', text: '' },
  ads: [], // aktiv elanlar (ana ekranda və lobbidə fırlanır)
  adIndex: 0,
  adDraft: { title: '', body: '', theme: 'indigo', planId: 'day' },
  sheet: null, // 'register': qonaq üçün qeydiyyat pəncərəsi
  pendingItem: null, // qeydiyyatdan sonra alınacaq əşya
  offset: 0,
  pendingCode: new URLSearchParams(location.search).get('room'),

  now() { return Date.now() + this.offset; },

  setLanguage(lang) {
    store.set('pg_lang', lang);
    setLang(lang);
    document.documentElement.lang = LANG;
    document.title = t('Oyun Gecəsi');
    $('#conn').textContent = t('Bağlantı bərpa olunur…');
    this.sheet = null;
    this.render();
  },

  async init() {
    Dialog.init();
    // Oyun səhifələrindən gələn link dili bildirir: /?lang=ru
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang && LANGS.some((l) => l.id === urlLang)) {
      store.set('pg_lang', urlLang);
      history.replaceState(null, '', location.pathname + location.search.replace(/[?&]lang=\w+/, '').replace(/^&/, '?'));
    }
    setLang(store.get('pg_lang') || 'az');
    document.documentElement.lang = LANG;
    document.title = t('Oyun Gecəsi');
    $('#conn').textContent = t('Bağlantı bərpa olunur…');
    document.addEventListener('pointerdown', () => {
      Sound.unlock();
      if (this.room && this.room.isHost) Narrator.unlock();
    });
    document.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('change', (e) => this.onChange(e));
    document.addEventListener('submit', (e) => this.onSubmit(e));
    document.addEventListener('input', (e) => {
      if (e.target.dataset.nickcheck !== undefined) this.checkNick(e.target);
      if (e.target.dataset.elan) this.onAdInput(e.target);
      if (e.target.dataset.draft === 'review') this.reviewDraft.text = e.target.value;
      if (e.target.dataset.draft === 'feedback') this.fbDraft.text = e.target.value;
      if (e.target.dataset.adminSearch !== undefined) {
        this.admin.q = e.target.value;
        clearTimeout(this.adminTimer);
        this.adminTimer = setTimeout(() => this.loadAdmin('users'), 300);
      }
    });
    setInterval(() => this.rotateAds(), 6000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (this.room) WakeLock.request();
      // Telefon kilidindən qayıdanda gözləmədən dərhal yenidən qoşul
      if (this.socket && !this.socket.connected) this.socket.connect();
    });
    window.addEventListener('online', () => { if (this.socket && !this.socket.connected) this.socket.connect(); });
    setInterval(() => this.tickTimers(), 250);
    Rotator.start();

    try { this.games = await fetch('/api/games').then((r) => r.json()); } catch { this.games = []; }

    if (this.token) {
      try {
        const r = await fetch('/api/me', { headers: { Authorization: `Bearer ${this.token}` } });
        if (r.ok) this.user = (await r.json()).user;
        else if (r.status === 401) this.logout(false);
      } catch {
        toast('İnternet bağlantısını yoxla');
      }
    }
    if (this.user) this.connect();
    this.loadAds();
    this.loadReviews();
    fetch('/api/stats').then((r) => r.json()).then((st) => { this.stats = st; if (!this.user) this.render(); }).catch(() => {});
    this.render();
  },

  // "Bağlantı bərpa olunur" zolağı: qısa qırılmalarda (1.5 san.) göstərilmir ki, boşuna yanıb-sönməsin
  showConn(on) {
    clearTimeout(this.connTimer);
    if (!on) $('#conn').hidden = true;
    else this.connTimer = setTimeout(() => { $('#conn').hidden = false; }, 1500);
  },

  connect() {
    if (this.socket) this.socket.disconnect();
    const s = io({ auth: { token: this.token } });
    s.on('connect', () => {
      this.showConn(false);
      if (this.pendingCode) {
        const code = this.pendingCode;
        this.pendingCode = null;
        history.replaceState(null, '', '/');
        this.emit('room:join', { code });
      }
    });
    s.on('disconnect', (reason) => {
      // Özümüz bağlamışıqsa (çıxış) bu qırılma deyil
      if (reason !== 'io client disconnect') this.showConn(true);
    });
    s.on('connect_error', (err) => {
      if (err.message === 'unauthorized') this.logout(true);
      else this.showConn(true);
    });
    s.on('room', (room) => this.onRoom(room));
    s.on('alert', ({ kind }) => this.onAlert(kind));
    s.on('kicked', () => toast('Host səni otaqdan çıxardı'));
    s.on('ads:changed', () => this.loadAds());
    s.on('me:changed', () => this.refreshMe());
    s.on('session:ended', () => { this.logout(true); toast('Şifrən admin tərəfindən dəyişdirildi, yenidən daxil ol', 4000); });
    s.on('account:deleted', () => { this.logout(true); toast('Hesabın admin tərəfindən silindi', 4000); });
    s.on('closed', () => toast('Yeni oyun başlamadı, otaq bağlandı', 4000));
    this.socket = s;
  },

  emit(event, data = {}) {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        toast('Bağlantı yoxdur, bir az gözlə…');
        return resolve({ ok: false });
      }
      this.socket.timeout(8000).emit(event, data, (err, res) => {
        if (err) { toast('Server cavab vermədi'); return resolve({ ok: false }); }
        if (!res.ok) toast(res.error);
        resolve(res);
      });
    });
  },

  logout(render = true) {
    if (this.token) fetch('/api/logout', { method: 'POST', headers: { Authorization: `Bearer ${this.token}` } }).catch(() => {});
    store.del('pg_token');
    this.token = null;
    this.user = null;
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
    this.showConn(false);
    if (render) this.render();
  },

  async refreshMe() {
    try {
      const r = await fetch('/api/me', { headers: { Authorization: `Bearer ${this.token}` } });
      if (r.ok) { this.user = (await r.json()).user; this.render(); }
    } catch {}
  },

  onRoom(room) {
    const prev = this.room;
    this.room = room;
    // Oyun indicə bitdi: qələbə effektləri
    if (room && room.status === 'finished' && prev && prev.code === room.code && prev.status === 'playing') this.celebrate(room);
    // Oyun bitdi: qazanılan xalları yenilə
    if (room && room.earned != null && !(prev && prev.earned != null && prev.code === room.code)) this.refreshMe();
    if (room) {
      this.offset = room.serverNow - Date.now();
      WakeLock.request();
    } else {
      WakeLock.release();
    }

    // Host telefonu mərhələ dəyişəndə aparıcı kimi danışır
    const gc = room && GameClients[room.gameId];
    if (room && room.isHost && gc && gc.clips && Narrator.enabled) Narrator.preload(gc.clips);
    if (room && room.isHost && room.game && gc && gc.narration) {
      const now = gc.narration(room.game, room);
      const before = prev && prev.game && prev.gameId === room.gameId ? gc.narration(prev.game, prev) : null;
      if (now && (!before || now.key !== before.key)) Narrator.play(now.clip);
    }
    this.render();
  },

  onAlert(kind) {
    switch (kind) {
      case 'dead':
        // Ən azı 3 dəfə: vibrasiya (Android) + ekranın silkələnməsi (iPhone vibrasiyanı dəstəkləmir)
        vibrate([500, 150, 500, 150, 500, 150, 900]);
        Sound.play('dead');
        flash();
        shake();
        break;
      case 'wake':
        vibrate([150, 100, 150]);
        break;
      case 'vote':
        vibrate(120);
        Sound.play('ding');
        break;
      case 'night':
        Sound.play('night');
        break;
      case 'morning':
        vibrate(80);
        Sound.play('morning');
        break;
      case 'gameOver':
        vibrate(300);
        Sound.play('win');
        break;
    }
  },

  // ---------- Hadisələr ----------

  async onClick(e) {
    const el = e.target.closest('[data-app],[data-game],[data-local]');
    if (!el || el.disabled) return;

    if (el.dataset.local) {
      const gc = this.room && GameClients[this.room.gameId];
      if (gc && gc.local) gc.local(el.dataset.local, el.dataset, this.room);
      return this.render();
    }

    if (el.dataset.game) {
      el.disabled = true;
      await this.emit('game:action', JSON.parse(el.dataset.game));
      el.disabled = false;
      return;
    }

    const a = el.dataset.app;
    const arg = el.dataset.arg;
    if (a === 'create') {
      el.disabled = true;
      await this.emit('room:create', { gameId: arg });
      el.disabled = false;
    } else if (a === 'start') {
      el.disabled = true;
      await this.emit('room:start');
      el.disabled = false;
    } else if (a === 'leave') {
      const msg = this.room && this.room.status === 'playing' ? 'Oyundan çıxsan, oyunda ölmüş sayılacaqsan. Çıxırsan?' : 'Otaqdan çıxırsan?';
      if (await ask(msg, { ok: 'Çıx', danger: this.room && this.room.status === 'playing' })) this.emit('room:leave');
    } else if (a === 'assign') {
      this.emit('room:assign', { userId: Number(arg) });
    } else if (a === 'kick') {
      if (await ask('Bu oyunçunu otaqdan çıxarırsan?', { ok: 'Çıxar', danger: true })) this.emit('room:kick', { userId: Number(arg) });
    } else if (a === 'lobby') {
      if (this.room.status !== 'playing' || await ask('Oyunu dayandırıb lobbiyə qayıdırsan?', { ok: 'Dayandır', danger: true })) this.emit('room:lobby');
    } else if (a === 'share') {
      this.share();
    } else if (a === 'narrator') {
      Narrator.enabled = !Narrator.enabled;
      toast(Narrator.enabled ? 'Aparıcı səsi açıldı' : 'Aparıcı səsi söndürüldü');
      this.render();
    } else if (a === 'voice') {
      Narrator.enabled = arg !== 'off';
      if (arg !== 'off') { Narrator.voice = arg; Narrator.play('hello'); }
      this.render();
    } else if (a === 'logout') {
      // Şifrəsiz hesab çıxanda silinir: əvvəlcə şifrə qoymağı təklif et
      if (!this.user.hasPassword) { this.sheet = 'logout'; return this.render(); }
      if (await ask('Hesabdan çıxırsan? Yenidən nickname və şifrə ilə girə bilərsən.', { ok: 'Çıxış' })) this.logout();
    } else if (a === 'logout-guest') {
      if (await ask('Hesabın, xalların və inno balansın birdəfəlik silinəcək. Əminsən?', { ok: 'Sil və çıx', danger: true })) { this.sheet = null; this.logout(); }
    } else if (a === 'screen') {
      this.openScreen(arg);
    } else if (a === 'period') {
      this.board.data = null;
      this.loadBoard(arg);
      this.render();
    } else if (a === 'shop-tab') {
      this.shop.tab = arg;
      this.shop.preview = null;
      this.render();
    } else if (a === 'shop-item') {
      this.shopItem(arg);
    } else if (a === 'review-open') {
      if (!this.user.hasPassword) { this.sheet = 'register'; return this.render(); }
      const mine = this.reviews && this.reviews.mine;
      this.reviewDraft = mine ? { stars: mine.stars, text: mine.text } : { stars: 0, text: '' };
      this.sheet = 'review';
      this.render();
    } else if (a === 'review-star') {
      this.reviewDraft.stars = Number(arg);
      this.render();
    } else if (a === 'review-send') {
      if (!this.reviewDraft.stars) return toast('Ulduz seç (1–5)');
      el.disabled = true;
      const res = await this.post('/api/reviews', this.reviewDraft);
      el.disabled = false;
      if (res) { this.reviews = res; this.sheet = null; toast('Rəyin üçün təşəkkürlər! ⭐'); Effects.play('basic'); this.render(); }
    } else if (a === 'review-delete') {
      if (!(await ask('Rəyini silirsən?', { ok: 'Sil', danger: true }))) return;
      const res = await this.post('/api/reviews/delete', {});
      if (res) { this.reviews = res; this.sheet = null; this.render(); }
    } else if (a === 'fb-kind') {
      this.fbDraft.kind = arg;
      this.render();
    } else if (a === 'fb-send') {
      el.disabled = true;
      const res = await this.post('/api/feedback', this.fbDraft);
      el.disabled = false;
      if (res) { this.fbDraft = { kind: 'idea', text: '' }; this.sheet = null; toast('Göndərildi, təşəkkürlər! 🙏', 3000); this.render(); }
    } else if (a === 'admin-fb-filter') {
      this.admin.fbFilter = arg; this.admin.feedback = null; this.render(); this.loadAdmin('feedback');
    } else if (a === 'admin-fb-status') {
      const [id, status] = arg.split(':');
      if (await this.post(`/api/admin/feedback/${id}/status`, { status })) this.loadAdmin('feedback');
    } else if (a === 'admin-fb-delete') {
      if (!(await ask('Bu müraciət silinsin?', { ok: 'Sil', danger: true }))) return;
      if (await this.post(`/api/admin/feedback/${arg}/delete`, {})) this.loadAdmin('feedback');
    } else if (a === 'admin-rv-hide') {
      const [id, hidden] = arg.split(':');
      if (await this.post(`/api/admin/reviews/${id}/hide`, { hidden: hidden === '1' })) this.loadAdmin('reviews');
    } else if (a === 'admin-rv-delete') {
      if (!(await ask('Bu rəy birdəfəlik silinsin?', { ok: 'Sil', danger: true }))) return;
      if (await this.post(`/api/admin/reviews/${arg}/delete`, {})) this.loadAdmin('reviews');
    } else if (a === 'daily-claim') {
      el.disabled = true;
      const res = await this.post('/api/daily', {});
      if (res) {
        this.user = res.user;
        Effects.play('goldconfetti');
        vibrate([60, 60, 120]);
        toast(`🎁 +${res.coins} inno`);
        setTimeout(() => { if (this.sheet === 'daily') { this.sheet = null; this.render(); } }, 1400);
        this.render();
      } else el.disabled = false;
    } else if (a === 'fx-preview') {
      Effects.play(arg);
    } else if (a === 'item-buy') {
      await this.buyItem(arg, el);
    } else if (a === 'item-wear' || a === 'item-remove') {
      el.disabled = true;
      await this.equipItem(arg, a === 'item-wear');
    } else if (a === 'elan-dot') {
      this.adIndex = Number(arg);
      this.rotateAds(0);
    } else if (a === 'elan-theme' || a === 'elan-plan') {
      this.adDraft[a === 'elan-theme' ? 'theme' : 'planId'] = arg;
      this.render();
    } else if (a === 'elan-publish') {
      await this.publishAd(el);
    } else if (a === 'elan-stop') {
      const mine = this.shop.data && this.shop.data.ads.mine;
      const msg = mine && mine.id === Number(arg) ? 'Elanını dayandırırsan? Ödənilən inno geri qaytarılmır.' : 'Bu elanı dayandırırsan (admin)?';
      if (!(await ask(msg, { ok: 'Dayandır', danger: true }))) return;
      if (await this.post(`/api/elan/${Number(arg)}/stop`, {})) {
        toast('Elan dayandırıldı');
        if (this.screen === 'shop') this.loadShop();
        this.loadAds();
      }
    } else if (a === 'sheet') {
      this.sheet = arg;
      this.render();
      const f = $('.sheet input[name=nickname]');
      if (f) f.focus();
    } else if (a === 'sheet-close') {
      if (e.target !== el && !e.target.closest('.sheet-x')) return; // pəncərənin içinə toxunmaq bağlamasın
      if (this.sheet === 'item') this.shop.preview = null;
      this.sheet = null;
      this.pendingItem = null;
      this.render();
    } else if (a === 'admin-tab') {
      this.admin.tab = arg;
      this.render();
      this.loadAdmin(arg);
    } else if (a === 'admin-kind') {
      this.admin.kind = arg;
      this.admin.users = null;
      this.render();
      this.loadAdmin('users');
    } else if (a === 'admin-seed-delete') {
      if (!(await ask('Bütün saxta hesablar (xalları, innoları, əşyaları ilə) silinsin? Real hesablara toxunulmur.', { ok: 'Sil', danger: true }))) return;
      const res = await this.post('/api/admin/seed/delete', {});
      if (res) { toast(`${res.deleted} saxta hesab silindi`); this.admin.users = null; this.loadAdmin('users'); this.loadAdmin('overview'); }
    } else if (a === 'admin-delete') {
      await this.adminAction('delete', Number(arg), el);
    } else if (a === 'admin-edit') {
      this.admin.editId = arg ? Number(arg) : null; // boş: yeni hesab
      this.sheet = 'admin-user';
      this.render();
    } else if (a === 'admin-elan-stop') {
      if (!(await ask('Bu elanı dayandırırsan (admin)?', { ok: 'Dayandır', danger: true }))) return;
      if (await this.post(`/api/elan/${Number(arg)}/stop`, {})) { toast('Elan dayandırıldı'); this.loadAdmin('ads'); this.loadAds(); }
    } else if (a === 'elan-cta') {
      this.shop.tab = 'ads';
      this.openScreen('shop');
    } else if (a === 'lang') {
      this.setLanguage(arg);
    } else if (a === 'auth-mode') {
      this.authMode = arg;
      this.render();
    }
  },

  onChange(e) {
    const el = e.target;
    if (el.dataset.setting) {
      this.emit('room:settings', { settings: { [el.dataset.setting]: el.value } });
    }
  },

  async onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    try {
      if (form.id === 'auth') await this.auth(form);
      if (form.id === 'setpw') await this.setPassword(form);
      if (form.id === 'upgrade') await this.upgrade(form);
      if (form.id === 'admin-user') await this.adminSave(form);
      if (form.id === 'admin-rewards') await this.adminSaveRewards(form);
      if (form.id === 'admin-prizes') {
        const res = await this.post('/api/admin/prizes', { prizes: [0, 1, 2].map((i) => Number(form[`p${i}`].value)) });
        if (res) { this.admin.prizes = res.prizes; toast('Mükafatlar yadda saxlandı'); this.render(); }
      }
      if (form.id === 'join') {
        const code = form.code.value.replace(/\D/g, '');
        if (code.length !== 4) toast('Kod 4 rəqəmli olmalıdır');
        else await this.emit('room:join', { code });
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  async get(url) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
      const data = await r.json();
      if (!r.ok) { toast(data.error || 'Xəta baş verdi'); return null; }
      return data;
    } catch {
      toast('İnternet bağlantısını yoxla');
      return null;
    }
  },

  async openScreen(name) {
    this.screen = name;
    window.scrollTo(0, 0);
    this.render();
    if (name === 'ranks') this.loadBoard(this.board.period);
    if (name === 'shop') this.loadShop();
    if (name === 'admin') this.loadAdmin(this.admin.tab);
    if (name === 'reviews') this.loadReviews();
  },

  // ---------- Admin ----------

  async loadAdmin(tab) {
    const a = this.admin;
    if (tab === 'overview') { const d = await this.get('/api/admin/overview'); if (d) { a.stats = d.stats; a.rewards = d.rewards; a.prizes = d.prizes; } }
    if (tab === 'users') { const d = await this.get(`/api/admin/users?q=${encodeURIComponent(a.q)}&kind=${a.kind}`); if (d) a.users = d.users; }
    if (tab === 'ads') { const d = await this.get('/api/admin/elan'); if (d) a.ads = d.ads; }
    if (tab === 'feedback') { const d = await this.get(`/api/admin/feedback?status=${a.fbFilter}`); if (d) a.feedback = d.feedback; }
    if (tab === 'reviews') { const d = await this.get('/api/admin/reviews'); if (d) a.reviews = d.reviews; }
    if (this.screen !== 'admin' || this.room) return;
    // Axtarış sahəsində yazarkən fokus itməsin
    const focused = document.activeElement && document.activeElement.dataset.adminSearch !== undefined;
    const pos = focused ? document.activeElement.selectionStart : 0;
    this.render();
    if (focused) { const f = $('[data-admin-search]'); if (f) { f.focus(); f.setSelectionRange(pos, pos); } }
  },

  async adminSave(form) {
    const id = this.admin.editId;
    const body = { nickname: form.nickname.value, points: form.points.value, coins: form.coins.value };
    if (form.password.value) body.password = form.password.value;
    const res = await this.post(id ? `/api/admin/users/${id}/update` : '/api/admin/users', body);
    if (!res) return;
    toast(id ? 'Dəyişikliklər yadda saxlandı' : 'Hesab yaradıldı');
    this.sheet = null;
    this.loadAdmin('users');
    if (id === this.user.id) this.refreshMe();
  },

  async adminSaveRewards(form) {
    const n = (name) => Number(form[name].value);
    const res = await this.post('/api/admin/rewards', {
      win: { points: n('winPoints'), coins: n('winCoins') },
      lose: { points: n('losePoints'), coins: n('loseCoins') },
    });
    if (!res) return;
    this.admin.rewards = res.rewards;
    toast('Mükafatlar yadda saxlandı');
    this.render();
  },

  async adminAction(action, id, el) {
    const u = this.admin.users && this.admin.users.find((x) => x.id === id);
    if (action === 'delete') {
      if (!(await ask(`${u ? `«${u.nickname}»: ` : ''}hesab, xallar, inno və əşyalar birdəfəlik silinsin?`, { ok: 'Sil', danger: true }))) return;
      el.disabled = true;
      if (await this.post(`/api/admin/users/${id}/delete`, {})) {
        this.admin.users = this.admin.users.filter((x) => x.id !== id);
        toast('Hesab silindi');
        this.render();
      } else el.disabled = false;
    }
  },

  async loadBoard(period) {
    this.board.period = period;
    const data = await this.get(`/api/leaderboard?period=${period}`);
    if (data && this.board.period === period) { this.board.data = data; this.render(); }
  },

  async loadShop() {
    const data = await this.get('/api/shop');
    if (!data) return;
    this.shop.data = data;
    this.user = data.user;
    this.render();
  },

  // Əşyaya toxunmaq: əvvəlcə önizləmə pəncərəsi (alış yalnız oradakı düymə ilə)
  shopItem(itemId) {
    const d = this.shop.data;
    if (!d || !d.items.some((i) => i.id === itemId)) return;
    this.shop.preview = itemId;
    this.sheet = 'item';
    this.render();
    if (d.items.find((i) => i.id === itemId).type === 'win') Effects.play(itemId);
  },

  async buyItem(itemId, el) {
    const d = this.shop.data;
    const item = d.items.find((i) => i.id === itemId);
    if (!this.user.hasPassword) {
      this.pendingItem = item.id;
      this.sheet = 'register';
      return this.render();
    }
    if (el) el.disabled = true;
    const res = await this.post('/api/shop/buy', { itemId });
    if (!res) { if (el) el.disabled = false; return; }
    d.owned = res.owned;
    this.user = res.user;
    vibrate(80);
    toast('Alındı 🎉');
    await this.equipItem(itemId, true); // aldıqdan sonra dərhal tax
  },

  // on = true: tax, false: çıxar
  async equipItem(itemId, on) {
    const item = this.shop.data.items.find((i) => i.id === itemId);
    const res = await this.post('/api/shop/equip', { type: item.type, itemId: on ? item.id : null });
    if (!res) return;
    this.user = res.user;
    this.shop.preview = null;
    this.sheet = null;
    this.render();
  },

  // Görünüşdə emoji saxlanır (nişan), mağaza isə id ilə işləyir
  equippedId(type) {
    const v = this.user.look && this.user.look[type];
    if (!v) return null;
    if (type !== 'badge') return v;
    const item = this.shop.data && this.shop.data.items.find((i) => i.type === 'badge' && i.emoji === v);
    return item ? item.id : null;
  },

  async post(url, body) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { toast(data.error || 'Xəta baş verdi'); return null; }
      return data;
    } catch {
      toast('İnternet bağlantısını yoxla');
      return null;
    }
  },

  async auth(form) {
    const body = { nickname: form.nickname.value };
    if (form.password) body.password = form.password.value;
    if (this.authMode === 'register' && form.password2.value !== form.password.value) return toast('Şifrələr eyni deyil');
    const url = { quick: '/api/quick', login: '/api/login', register: '/api/register' }[this.authMode];
    const data = await this.post(url, body);
    if (!data) return;
    this.token = data.token;
    this.user = data.user;
    store.set('pg_token', data.token);
    this.connect();
    this.render();
  },

  // Yazmağı bitirəndən 300 ms sonra yoxla; köhnə cavab yeni yazılanı əvəz etməsin
  checkNick(input) {
    const out = input.parentElement.querySelector('.nick-status');
    const v = input.value.trim().replace(/\s+/g, ' ');
    const set = (cls, html) => { out.className = `nick-status ${cls}`; out.innerHTML = html; translateDom(out); };
    clearTimeout(this.nickTimer);
    if (v.length < 2) return set('', '');
    if (input.dataset.self && v.toLocaleLowerCase('az') === input.dataset.self.toLocaleLowerCase('az')) {
      return set('ok', `${icon('check', 'sm')} Hazırkı nickname-in`);
    }
    set('wait', 'Yoxlanılır…');
    this.nickTimer = setTimeout(async () => {
      let res;
      try {
        const r = await fetch(`/api/nickname?n=${encodeURIComponent(v)}`, { headers: this.token ? this.authHeaders() : {} });
        res = await r.json();
      } catch {
        return set('', '');
      }
      if (input.value.trim().replace(/\s+/g, ' ') !== v) return;
      if (res.status === 'free') set('ok', `${icon('check', 'sm')} Boşdur, götürə bilərsən`);
      else if (res.status === 'mine') set('ok', `${icon('check', 'sm')} Hazırkı nickname-in`);
      else if (res.status === 'taken') {
        set('bad', `${icon('x', 'sm')} Artıq götürülüb${this.user ? '' : this.authMode === 'login' ? '' : ' — sənindirsə, «Giriş»dən daxil ol'}`);
      } else set('bad', esc(res.error));
    }, 300);
  },

  async upgrade(form) {
    if (form.password2.value !== form.password.value) return toast('Şifrələr eyni deyil');
    const data = await this.post('/api/upgrade', { nickname: form.nickname.value, password: form.password.value });
    if (!data) return;
    this.user = data.user;
    this.sheet = null;
    toast('Qeydiyyat tamamlandı ✅');
    this.render();
    // Mağazada almaq istədiyi əşya qalıbsa, alışa davam et
    const item = this.pendingItem;
    this.pendingItem = null;
    if (item && this.screen === 'shop' && !this.room) this.shopItem(item);
  },

  // ---------- Rəylər ----------

  async loadReviews() {
    try {
      const r = await fetch('/api/reviews', { headers: this.token ? this.authHeaders() : {} });
      this.reviews = await r.json();
      if (!document.querySelector('form input:focus, textarea:focus')) this.render();
    } catch {}
  },

  stars(n, cls = '') {
    return `<span class="stars ${cls}" aria-label="${n}/5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= Math.round(n) ? 'on' : ''}">★</i>`).join('')}</span>`;
  },

  viewReviews() {
    const R = this.reviews;
    const head = this.subHeader('Rəylər');
    if (!R) return `${head}<p class="hint">Yüklənir…</p>`;
    // Brauzerlər az dilində tarixi düzgün formatlamır ("2026 M09 24"), ona görə özümüz
    const date = (ms) => { const d = new Date(ms); return `${d.getDate()} ${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`; };
    const bars = [5, 4, 3, 2, 1].map((s) => {
      const n = R.dist[s - 1];
      return `<div class="rv-bar"><span>${s}★</span><i><b style="width:${R.count ? (n / R.count) * 100 : 0}%"></b></i><span class="muted">${n}</span></div>`;
    }).join('');
    const list = R.list.map((r) => `
      <div class="card review">
        <div class="row">
          <span class="initial sm${Look.frame(r)}">${initial(r.nickname)}</span>
          <div class="grow"><b>${Look.name(r)}</b><div class="muted small">${date(r.updatedAt)}</div></div>
          ${this.stars(r.stars)}
        </div>
        ${r.text ? `<p class="review-text" data-nt>${esc(r.text)}</p>` : ''}
      </div>`).join('');
    return `
      ${head}
      <div class="card rv-summary">
        <div class="rv-avg"><b>${R.count ? R.avg.toFixed(1) : '—'}</b>${this.stars(R.avg, 'lg')}<span class="muted small">${R.count} rəy</span></div>
        <div class="rv-bars">${bars}</div>
      </div>
      <button class="btn primary" data-app="review-open">${icon('star')} ${R.mine ? 'Rəyimi dəyiş' : 'Rəy yaz'}</button>
      ${R.count ? `<div class="stack" style="gap:10px">${list}</div>` : '<p class="hint">Hələ rəy yoxdur. İlk rəyi sən yaz!</p>'}
      <button class="btn ghost" data-app="sheet" data-arg="feedback">💬 Təklif / şikayət göndər (yalnız admin görür)</button>`;
  },

  viewReviewSheet() {
    const d = this.reviewDraft;
    const mine = this.reviews && this.reviews.mine;
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><h2 id="sheet-title">${mine ? 'Rəyimi dəyiş' : 'Rəy yaz'}</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          <p class="muted small">Platforma haqqında fikrin hamıya görünəcək.</p>
          <div class="star-pick">${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="${i <= d.stars ? 'on' : ''}" data-app="review-star" data-arg="${i}" aria-label="${i}">★</button>`).join('')}</div>
          <label>Fikrin (istəyə bağlı)
            <textarea data-draft="review" maxlength="300" rows="4" placeholder="Nəyi bəyəndin? Nəyi yaxşılaşdıraq?">${esc(d.text)}</textarea></label>
          <button class="btn primary" data-app="review-send">${icon('check')} Göndər</button>
          ${mine ? '<button class="btn ghost danger" data-app="review-delete">Rəyimi sil</button>' : ''}
        </div>
      </div>`;
  },

  viewFeedbackSheet() {
    const d = this.fbDraft;
    const kinds = [['idea', '💡 Təklif'], ['complaint', '😠 Şikayət'], ['bug', '🐞 Xəta'], ['other', '💬 Digər']];
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><h2 id="sheet-title">Təklif / şikayət</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          <p class="muted small">🔒 Bunu yalnız admin görür. Hər fikir bizim üçün vacibdir.</p>
          <div class="fb-kinds">${kinds.map(([k, l]) => `<button type="button" class="${d.kind === k ? 'on' : ''}" data-app="fb-kind" data-arg="${k}">${l}</button>`).join('')}</div>
          <label>Mesajın
            <textarea data-draft="feedback" maxlength="1000" rows="5" placeholder="Nə baş verdi və ya nəyi istəyirsən?">${esc(d.text)}</textarea></label>
          <button class="btn primary" data-app="fb-send">${icon('arrow')} Göndər</button>
        </div>
      </div>`;
  },

  // ---------- Elanlar ----------

  async loadAds() {
    try {
      const { ads, minPrice } = await fetch('/api/elan').then((r) => r.json());
      this.adMinPrice = minPrice;
      // Hər dəfə təsadüfi sıra: heç kim həmişə birinci olmasın
      this.ads = ads.map((a) => [Math.random(), a]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
      this.adIndex = 0;
      if (!document.querySelector('form input:focus, form textarea:focus')) this.render();
    } catch {}
  },

  liveAds() {
    const now = this.now();
    return this.ads.filter((a) => a.endsAt > now);
  },

  // Tam render etmədən növbəti elana keç (yazılan formalar pozulmasın)
  rotateAds(step = 1) {
    const box = $('.elan-carousel');
    if (!box || document.hidden) return;
    const slides = box.querySelectorAll('.elan-slide');
    if (slides.length < 2 && step) return;
    this.adIndex = (this.adIndex + step + slides.length) % slides.length;
    slides.forEach((el, i) => el.classList.toggle('active', i === this.adIndex));
    box.querySelectorAll('.elan-dot').forEach((el, i) => el.classList.toggle('active', i === this.adIndex));
  },

  adCard(ad, extra = '') {
    return `
      <div class="elan-card elan-${esc(ad.theme)}">
        <span class="elan-label">Oyunçu elanı</span>
        <b class="elan-title" data-nt>${esc(ad.title) || '&nbsp;'}</b>
        ${ad.body ? `<p class="elan-body" data-nt>${esc(ad.body)}</p>` : ''}
        <span class="elan-by" data-nt>${byLine(ad.nickname)}</span>
        ${extra}
      </div>`;
  },

  // Oyunçuları elan verməyə həvəsləndir: karuselin altında keçid, boş olanda yer kartı (yalnız ana ekranda)
  elanCta(ads) {
    if (!this.user || ads.some((a) => a.userId === this.user.id)) return '';
    return `<button class="elan-cta" data-app="elan-cta">${icon('zap', 'sm')} Sən də elan ver · ${this.adMinPrice || 100} inno-dan ${icon('chev', 'sm')}</button>`;
  },

  viewAds(opts = {}) {
    const ads = this.liveAds();
    if (!ads.length) {
      if (!opts.empty || !this.user) return '';
      return `
        <button class="elan-empty" data-app="elan-cta">
          <span class="stat-ic coin">${icon('zap', 'sm')}</span>
          <span class="grow elan-empty-text"><b>Elanın burada ola bilər</b><span class="muted small">Hamı görəcək · ${this.adMinPrice || 100} inno-dan</span></span>
          ${icon('chev', 'sm')}
        </button>`;
    }
    if (this.adIndex >= ads.length) this.adIndex = 0;
    const admin = this.user && this.user.isAdmin;
    const slides = ads.map((a, i) => `
      <div class="elan-slide${i === this.adIndex ? ' active' : ''}">
        ${this.adCard(a, admin ? `<button class="elan-x" data-app="elan-stop" data-arg="${a.id}" aria-label="Elanı dayandır">${icon('x', 'sm')}</button>` : '')}
      </div>`).join('');
    const dots = ads.length > 1
      ? `<div class="elan-dots">${ads.map((_, i) => `<button class="elan-dot${i === this.adIndex ? ' active' : ''}" data-app="elan-dot" data-arg="${i}" aria-label="Elan ${i + 1}"></button>`).join('')}</div>`
      : '';
    return `<div class="elan-carousel" aria-label="Elanlar">${slides}<div class="elan-foot">${dots}${this.elanCta(ads)}</div></div>`;
  },

  onAdInput(el) {
    this.adDraft[el.dataset.elan] = el.value;
    // Önizləməni və sayğacı yerində yenilə
    const pv = $('.elan-preview .elan-card');
    if (pv) {
      pv.querySelector('.elan-title').textContent = this.adDraft.title || ' ';
      let body = pv.querySelector('.elan-body');
      if (!body) { body = document.createElement('p'); body.className = 'elan-body'; body.dataset.nt = ''; pv.querySelector('.elan-title').after(body); }
      body.textContent = this.adDraft.body;
      body.hidden = !this.adDraft.body;
    }
    const counter = el.parentElement.querySelector('.count');
    if (counter) counter.textContent = `${el.value.length}/${el.maxLength}`;
  },

  async publishAd(el) {
    const d = this.shop.data;
    const draft = this.adDraft;
    const plan = d.ads.plans.find((p) => p.id === draft.planId);
    if (!this.user.hasPassword) { this.sheet = 'register'; return this.render(); }
    if (draft.title.trim().length < 3) return toast('Başlıq ən azı 3 simvol olmalıdır');
    if (!(await ask(`Elan ${plan.days} günlük ${plan.price} inno qarşılığında yayımlansın?`, { ok: 'Yayımla' }))) return;
    el.disabled = true;
    const res = await this.post('/api/elan', draft);
    el.disabled = false;
    if (!res) return;
    this.user = res.user;
    this.adDraft = { title: '', body: '', theme: draft.theme, planId: draft.planId };
    toast('Elanın yayımlandı 🎉');
    vibrate(80);
    await this.loadShop();
    this.loadAds();
  },

  viewAdShop() {
    const d = this.shop.data;
    const u = this.user;
    const A = d.ads;
    if (A.mine) {
      const left = A.mine.endsAt - this.now();
      const days = Math.floor(left / 86400000);
      const hours = Math.floor((left % 86400000) / 3600000);
      return `
        <div class="stack">
          <span class="eyebrow">Aktiv elanın</span>
          ${this.adCard(A.mine)}
          <p class="hint">${icon('clock', 'sm')} Bitməsinə ${days ? `${days} gün ` : ''}${hours} saat qalıb · ana ekranda və lobbidə göstərilir</p>
          <button class="btn ghost" data-app="elan-stop" data-arg="${A.mine.id}">Elanı dayandır</button>
        </div>`;
    }
    const dr = this.adDraft;
    const plan = A.plans.find((p) => p.id === dr.planId) || A.plans[0];
    const full = A.active >= A.limits.maxActive;
    const poor = u.coins < plan.price;
    const themes = A.themes.map((t) =>
      `<button type="button" class="elan-swatch elan-${t}${dr.theme === t ? ' on' : ''}" data-app="elan-theme" data-arg="${t}" aria-label="${t}"></button>`).join('');
    const plans = A.plans.map((p) => `
      <button type="button" class="plan${dr.planId === p.id ? ' on' : ''}" data-app="elan-plan" data-arg="${p.id}">
        <b>${p.days === 7 ? '1 həftə' : `${p.days} gün`}</b>
        <span>${icon('coin', 'sm')} ${p.price}</span>
      </button>`).join('');
    return `
      <p class="muted small center">Öz elanını ver: ana ekranda və lobbidə hamı görəcək. Bir neçə elan olduqda növbə ilə göstərilir.</p>
      <div class="elan-preview">${this.adCard({ ...dr, nickname: u.nickname })}</div>
      <form class="card stack" onsubmit="return false">
        <label>Başlıq <span class="count">${dr.title.length}/${A.limits.title}</span>
          <input data-elan="title" maxlength="${A.limits.title}" value="${esc(dr.title)}" placeholder="Məs.: Kofe Evi açıldı ☕"></label>
        <label>Mətn <span class="count">${dr.body.length}/${A.limits.body}</span>
          <textarea data-elan="body" maxlength="${A.limits.body}" rows="3" placeholder="Qısa təsvir, əlaqə…">${esc(dr.body)}</textarea></label>
        <div class="stack" style="gap:8px"><span class="label">Rəng</span><div class="elan-swatches">${themes}</div></div>
        <div class="stack" style="gap:8px"><span class="label">Müddət</span><div class="plans">${plans}</div></div>
        <button type="button" class="btn primary" data-app="elan-publish" ${full || (u.hasPassword && poor) ? 'disabled' : ''}>
          ${icon('zap')} Yayımla · ${plan.price} inno</button>
        ${full ? '<p class="hint">Hazırda bütün yerlər doludur, bir az sonra yoxla</p>'
          : !u.hasPassword ? '<p class="hint">Elan vermək üçün qeydiyyat lazımdır</p>'
          : poor ? `<p class="hint">Daha ${plan.price - u.coins} inno lazımdır · <button type="button" class="link" data-app="sheet" data-arg="buy">İnno al</button></p>` : ''}
        <p class="hint">Nalayiq sözlər olan elanlar qəbul edilmir və admin tərəfindən dayandırıla bilər.</p>
      </form>`;
  },

  async setPassword(form) {
    if (form.password2.value !== form.password.value) return toast('Şifrələr eyni deyil');
    const data = await this.post('/api/password', { password: form.password.value });
    if (!data) return;
    this.user = { ...this.user, ...data.user };
    toast('Hesabın qorundu ✅');
    this.render();
  },

  async share() {
    const url = `${location.origin}/?room=${this.room.code}`;
    const text = t(`${this.room.gameName} oynayırıq! Otaq kodu: ${this.room.code}`);
    try {
      if (navigator.share) return await navigator.share({ title: t('Oyuna qoşul'), text, url });
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('Link kopyalandı');
    } catch {}
  },

  tickTimers() {
    document.querySelectorAll('[data-deadline]').forEach((el) => {
      const left = Math.max(0, Math.ceil((Number(el.dataset.deadline) - this.now()) / 1000));
      const txt = el.dataset.format === 'sec' || left < 60 ? String(left) : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (el.textContent !== txt) {
        el.textContent = txt;
        if (el.dataset.tick && left > 0 && left <= 5) Sound.play('tick');
      }
    });
  },

  // ---------- Ekranlar ----------

  render() {
    const root = $('#app');
    let night = false;
    if (!store.get('pg_lang')) root.innerHTML = this.viewLangPick(true); // ilk giriş: əvvəlcə dil
    else if (!this.user) root.innerHTML = this.viewAuth();
    else if (!this.room && this.screen === 'ranks') root.innerHTML = this.viewRanks();
    else if (!this.room && this.screen === 'shop') root.innerHTML = this.viewShop();
    else if (!this.room && this.screen === 'admin' && this.user.isAdmin) root.innerHTML = this.viewAdmin();
    else if (!this.room && this.screen === 'reviews') root.innerHTML = this.viewReviews();
    else if (!this.room) {
      root.innerHTML = this.viewHome();
      // Gündəlik bonus hazırdırsa pəncərəni bir dəfə özümüz aç
      if (this.user.daily && this.user.daily.available && !this.dailyShown && !this.sheet) { this.dailyShown = true; this.sheet = 'daily'; }
    }
    else if (this.room.status === 'lobby') root.innerHTML = this.viewLobby();
    else {
      const gc = GameClients[this.room.gameId];
      const out = gc ? gc.render(this.room) : { html: '<p>Bu oyun hələ dəstəklənmir</p>' };
      root.innerHTML = this.viewGameChrome(out.html);
      night = !!out.night;
    }
    if (this.sheet === 'lang') root.insertAdjacentHTML('beforeend', this.viewLangSheet());
    else if (this.user && this.sheet === 'register' && !this.user.hasPassword) root.insertAdjacentHTML('beforeend', this.viewRegisterSheet());
    else if (this.user && this.sheet === 'logout' && !this.user.hasPassword) root.insertAdjacentHTML('beforeend', this.viewLogoutSheet());
    else if (this.user && this.sheet === 'item' && this.shop.data && this.shop.preview) root.insertAdjacentHTML('beforeend', this.viewItemSheet());
    else if (this.user && this.sheet === 'review') root.insertAdjacentHTML('beforeend', this.viewReviewSheet());
    else if (this.user && this.sheet === 'feedback') root.insertAdjacentHTML('beforeend', this.viewFeedbackSheet());
    else if (this.user && this.sheet === 'daily' && this.user.daily) root.insertAdjacentHTML('beforeend', this.viewDailySheet());
    else if (this.user && this.sheet === 'buy' && this.shop.data) root.insertAdjacentHTML('beforeend', this.viewBuySheet());
    else if (this.user && this.user.isAdmin && this.sheet === 'admin-user') root.insertAdjacentHTML('beforeend', this.viewAdminUserSheet());
    else this.sheet = null;
    translateDom(root);
    document.body.classList.toggle('night', night);
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = night ? '#0b1020' : '#f4f5f8';
    this.tickTimers();
  },

  flagButton() {
    return `<button class="btn ghost small icon-only flag-btn" data-app="sheet" data-arg="lang" aria-label="Dil" title="Dil">
      <span class="flag">${FLAGS[LANG]}</span></button>`;
  },

  langList(first) {
    return `<div class="lang-list">${LANGS.map((l) => `
      <button class="lang-btn${!first && LANG === l.id ? ' on' : ''}" data-app="lang" data-arg="${l.id}">
        <span class="flag">${FLAGS[l.id]}</span><b class="grow" data-nt>${l.name}</b>
        ${!first && LANG === l.id ? icon('check') : icon('chev', 'chev')}
      </button>`).join('')}</div>`;
  },

  // İlk dəfə girəndə tam ekran; sonra bayraq düyməsi ilə pəncərədə
  viewLangPick() {
    return `
      <div class="lang-pick">
        <div class="logo lg">${icon('logo')}</div>
        <div class="stack center" style="gap:4px" data-nt>
          <h1>Dil seçin</h1>
          <p class="muted">Выберите язык · Choose a language</p>
        </div>
        ${this.langList(true)}
      </div>`;
  },

  viewLangSheet() {
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="lang-title">
          <div class="row">
            <div class="grow"><h2 id="lang-title">Dil</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          ${this.langList(false)}
        </div>
      </div>`;
  },

  viewAuth() {
    const m = this.authMode;
    const tab = (mode, label) =>
      `<button type="button" class="tab ${m === mode ? 'active' : ''}" data-app="auth-mode" data-arg="${mode}">${label}</button>`;
    const nick = `<label>Nickname <input name="nickname" required minlength="2" maxlength="20" autocomplete="username"
      autocapitalize="off" spellcheck="false" placeholder="Oyunda görünəcək ad"></label>`;
    const body = {
      quick: `${nickField()}
        <button class="btn primary" type="submit">Başla ${icon('arrow')}</button>
        <p class="hint">Şifrə lazım deyil. Xallarını qorumaq üçün sonra şifrə qoya bilərsən.</p>`,
      login: `${nick}
        <label>Şifrə <input name="password" type="password" required autocomplete="current-password" placeholder="••••••"></label>
        <button class="btn primary" type="submit">Daxil ol ${icon('arrow')}</button>`,
      register: `${nickField()}
        <label>Şifrə <input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Ən azı 6 simvol"></label>
        <label>Şifrəni təkrarla <input name="password2" type="password" required minlength="6" autocomplete="new-password" placeholder="••••••"></label>
        <button class="btn primary" type="submit">Hesab yarat ${icon('arrow')}</button>
        <p class="hint">Hesabla xal toplayırsan və istənilən cihazdan girə bilərsən.</p>`,
    }[m];
    return `
      <div class="auth">
        <div class="auth-lang">${this.flagButton()}</div>
        <div class="auth-head">
          <div class="logo lg">${icon('logo')}</div>
          <div class="stack" style="gap:6px">
            <h1>Oyun Gecəsi</h1>
            <p class="muted">
              <span class="rotator" aria-hidden="true"><span id="rotator-word">${ROTATOR_WORDS[Rotator.i]}</span></span>
              bir masa ətrafında, hər kəs öz telefonundan oynayır.
            </p>
          </div>
        </div>
        <div class="card stack">
          <div class="tabs">${tab('quick', 'Tez başla')}${tab('login', 'Giriş')}${tab('register', 'Qeydiyyat')}</div>
          <form id="auth" class="stack" autocomplete="on">${body}</form>
        </div>
        ${this.stats && (this.stats.online >= 3 || this.stats.gamesToday >= 5) ? `<p class="live-stats">
          <span class="dot"></span> ${this.stats.online} nəfər onlayn · bu gün ${this.stats.gamesToday} oyun</p>` : ''}
        <div class="auth-foot">
          <span>${icon('phone', 'sm')} Yükləmə yoxdur</span>
          <span>${icon('users', 'sm')} 3–20 nəfər</span>
          <span>${icon('clock', 'sm')} 1 dəqiqəyə başla</span>
        </div>
        <div class="auth-games">
          <span class="eyebrow">Oyunlar və qaydalar</span>
          <div class="auth-games-row">${Object.keys(RULES_PAGES).map((id) => `
            <a class="auth-game" href="${rulesUrl(id)}"><span class="auth-game-emoji">${RULES_PAGES[id].emoji}</span><b>${esc(RULES_PAGES[id].name)}</b></a>`).join('')}
          </div>
        </div>
      </div>`;
  },

  viewHome() {
    const u = this.user;
    const games = this.games
      .map((g) => g.comingSoon
        ? `<div class="card game-row soon">
             <div class="icon alt">${gameIcon(g)}</div>
             <div class="grow"><b>${esc(g.name)}</b><span class="muted small">${esc(g.description)}</span></div>
             <span class="badge">Tezliklə</span>
           </div>`
        : `<div class="card game-row">
             <div class="icon">${gameIcon(g)}</div>
             <div class="grow"><b>${esc(g.name)}</b><span class="muted small">${icon('users', 'sm')} ${g.minPlayers}–${g.maxPlayers} nəfər</span></div>
             <button class="btn primary small" data-app="create" data-arg="${esc(g.id)}">${icon('plus', 'sm')} Otaq yarat</button>
           </div>`)
      .join('');
    // Xal və inno ayrıca blok deyil: Reytinq/Mağaza düymələrinin içində
    // Naviqasiya düymələri: başlıq + dəyər + ox (basıla bildiyi aydın olsun)
    const quick = (screen, ic, cls, label, value) => `
      <button class="quick" data-app="screen" data-arg="${screen}" aria-label="${label}" title="${label}">
        <span class="stat-ic ${cls}">${icon(ic, 'sm')}</span>
        <span class="quick-text"><b>${label}</b>${value ? `<span class="muted small">${value}</span>` : ''}</span>
        ${icon('chev', 'sm quick-chev')}
      </button>`;
    return `
      <div class="home-head">
        <div class="initial${Look.frame(u)}">${initial(u.nickname)}</div>
        <div class="profile-who"><span class="muted small">Xoş gəldin</span><b class="profile-name">${Look.name(u)}</b></div>
        ${this.flagButton()}
        <button class="btn ghost small icon-only" data-app="logout" aria-label="Çıxış" title="Çıxış">${icon('logout')}</button>
      </div>
      <div class="quick-row${u.isAdmin ? ' three' : ''}">
        ${quick('ranks', 'trophy', 'gold', 'Reytinq', `${u.points} xal`)}
        ${quick('shop', 'bag', 'coin', 'Mağaza', `${u.coins} inno`)}
        ${u.isAdmin ? quick('admin', 'shield', 'dark', 'Admin', '') : ''}
      </div>
      ${u.daily && u.daily.available ? `
      <button class="daily-bar" data-app="sheet" data-arg="daily">
        <span class="daily-gift">🎁</span><span class="grow"><b>Gündəlik bonus hazırdır</b><span class="small">Gün ${u.daily.day}/7 · +${u.daily.rewards[u.daily.day - 1]} inno</span></span>${icon('chev', 'sm')}
      </button>` : ''}
      ${u.hasPassword ? '' : `
      <button class="guest-bar" data-app="sheet" data-arg="register">
        ${icon('lock', 'sm')}<span class="grow">Şifrə qoy, hesabın itməsin</span>${icon('chev', 'sm')}
      </button>`}
      ${this.viewAds({ empty: true })}
      <form id="join" class="card join-card">
        <div class="join-label"><b>Otağa qoşul</b><span class="muted small">Hostun ekranındakı 4 rəqəmli kod</span></div>
        <div class="join">
          <input class="code-input" name="code" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="0000" autocomplete="off" aria-label="Otaq kodu">
          <button class="btn primary" type="submit" aria-label="Qoşul">${icon('arrow')}</button>
        </div>
      </form>
      <div class="games">${games}</div>
      <div class="home-links">
        <button class="quick" data-app="screen" data-arg="reviews">
          <span class="stat-ic gold">⭐</span>
          <span class="quick-text"><b>Rəylər</b><span class="muted small">${this.reviews && this.reviews.count ? `${this.reviews.avg} · ${this.reviews.count} rəy` : 'Fikrini bildir'}</span></span>
          ${icon('chev', 'sm quick-chev')}
        </button>
        <button class="quick" data-app="sheet" data-arg="feedback">
          <span class="stat-ic coin">💬</span>
          <span class="quick-text"><b>Təklif / şikayət</b><span class="muted small">Yalnız admin görür</span></span>
        </button>
      </div>`;
  },

  monthKey() {
    return new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 7);
  },

  subHeader(title) {
    return `
      <div class="topbar">
        <button class="btn ghost small icon-only" data-app="screen" data-arg="home" aria-label="Geri">${icon('back')}</button>
        <div class="title">${title}</div>
        <span style="width:40px"></span>
      </div>`;
  },

  viewRanks() {
    const b = this.board;
    const d = b.data && b.data.period === b.period ? b.data : null;
    const tab = (id, label) =>
      `<button type="button" class="tab ${b.period === id ? 'active' : ''}" data-app="period" data-arg="${id}">${label}</button>`;
    const row = (e) => `
      <div class="player rank-row${Look.row(e)}${e.id === this.user.id ? ' mine' : ''}">
        <span class="rank r${e.rank}">${e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}</span>
        <span class="name"><span class="rank-name">${Look.name(e)}${e.id === this.user.id ? ' <span class="tag">(sən)</span>' : ''}</span>
          <span class="sub">${e.wins} qələbə</span></span>
        <span class="score">${e.points}</span>
      </div>`;
    let body;
    if (!d) body = '<p class="hint">Yüklənir…</p>';
    else if (!d.top.length) {
      body = `<div class="card center stack"><div class="emoji-xl" style="margin:0 auto">🏁</div>
        <h3>Hələ heç kim xal toplamayıb</h3><p class="muted small">Bir oyun oyna və siyahıda birinci ol!</p></div>`;
    } else {
      const inTop = d.me && d.top.some((e) => e.id === d.me.id);
      body = `<div class="players">${d.top.map(row).join('')}</div>
        ${d.me && !inTop ? `<p class="hint">Sənin yerin</p>${row(d.me)}` : ''}
        ${!d.me ? '<p class="hint">Oyna, xal topla və siyahıya düş.</p>' : ''}`;
    }
    const month = d ? d.month : this.monthKey();
    return `
      ${this.subHeader('Reytinq')}
      <div class="rank-hero">
        <span class="tile-icon violet">${icon('trophy')}</span>
        <div class="grow">
          <b>${b.period === 'month' ? monthLabel(month) : 'Bütün zamanlar'}</b>
          <p class="muted small">${b.period === 'month'
            ? `Ayın sonuna ${daysLeftInMonth()} gün qalıb. Hər ay reytinq sıfırdan başlayır.`
            : 'Hesab açılandan bəri toplanan bütün xallar.'}</p>
        </div>
      </div>
      ${this.viewPrizeStrip(d)}
      <div class="tabs">${tab('month', 'Bu ay')}${tab('all', 'Bütün zamanlar')}</div>
      ${d && d.rewards ? `<p class="hint">Qələbə +${d.rewards.win.points} xal, məğlubiyyət +${d.rewards.lose.points} xal</p>` : ''}
      ${body}`;
  },

  viewAdmin() {
    const A = this.admin;
    const tab = (id, label) =>
      `<button type="button" class="tab ${A.tab === id ? 'active' : ''}" data-app="admin-tab" data-arg="${id}">${label}</button>`;
    const loading = '<p class="hint">Yüklənir…</p>';
    const date = (ms) => (ms ? new Date(ms).toLocaleString(LANG === 'en' ? 'en-GB' : LANG, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
    let body = '';
    if (A.tab === 'overview') {
      const s = A.stats;
      const stat = (n, label) => `<div class="card stat"><b>${n}</b><span class="muted small">${label}</span></div>`;
      body = !s ? loading : `<div class="stat-grid">
        ${stat(s.users - s.seedUsers, 'Real istifadəçi')}${stat(s.seedUsers, '🤖 Saxta hesab')}
        ${stat(s.registered - s.seedUsers, 'Qeydiyyatlı (real)')}${stat(s.users - s.registered, 'Qonaq')}
        ${stat(s.activeToday, 'Son 24 saatda aktiv')}${stat(s.online, 'İndi onlayn')}
        ${stat(s.games, 'Oynanmış oyun')}${stat(s.gamesToday, 'Son 24 saatda oyun')}
        ${stat(s.rooms, 'Açıq otaq')}${stat(s.activeAds, 'Aktiv elan')}
        ${stat(s.coins, 'Dövriyyədəki inno')}
      </div>
      ${this.viewRewardsForm()}
      ${this.viewPrizesForm()}`;
    }
    if (A.tab === 'users') {
      const rows = !A.users ? loading : !A.users.length ? '<p class="hint">Heç kim tapılmadı</p>' : A.users.map((u) => `
        <div class="card admin-user">
          <div class="row">
            <span class="initial sm${Look.frame(u)}">${initial(u.nickname)}</span>
            <div class="grow">
              <b>${Look.name(u)}</b> ${u.isAdmin ? '<span class="badge">Admin</span>' : u.seed ? '<span class="badge seed-badge">🤖 Saxta</span>' : u.registered ? '<span class="badge real-badge">Real</span>' : '<span class="badge">Qonaq</span>'}
              <div class="muted small">${u.points} xal · ${u.coins} inno · son giriş ${date(u.lastSeenAt)}</div>
            </div>
          </div>
          ${u.isAdmin ? '' : `<div class="row admin-actions">
            <button class="btn small outline" data-app="admin-edit" data-arg="${u.id}">${icon('sliders', 'sm')} Redaktə</button>
            <button class="btn small ghost danger" data-app="admin-delete" data-arg="${u.id}">${icon('x', 'sm')} Sil</button>
          </div>`}
          ${u.isAdmin && u.id === this.user.id ? `<div class="row admin-actions">
            <button class="btn small outline" data-app="admin-edit" data-arg="${u.id}">${icon('sliders', 'sm')} Redaktə</button></div>` : ''}
        </div>`).join('');
      const kindTab = (id, label) => `<button type="button" class="tab ${A.kind === id ? 'active' : ''}" data-app="admin-kind" data-arg="${id}">${label}</button>`;
      const seedCount = A.stats ? A.stats.seedUsers : null;
      body = `<div class="tabs">${kindTab('all', 'Hamısı')}${kindTab('real', 'Real')}${kindTab('seed', '🤖 Saxta')}</div>
        ${A.kind === 'seed' && A.users && A.users.length ? `<div class="card seed-note">
          <span class="grow small">Saxta hesablar reytinqi canlandırmaq üçündür: onlarla heç kim daxil ola bilmir, aylıq mükafat almırlar.</span>
          <button class="btn small ghost danger" data-app="admin-seed-delete">${icon('x', 'sm')} Hamısını sil</button>
        </div>` : ''}
        <div class="row">
          <input data-admin-search value="${esc(A.q)}" placeholder="Nickname ilə axtar" autocomplete="off" autocapitalize="off" spellcheck="false">
          <button class="btn primary small" data-app="admin-edit" data-arg="" style="min-height:52px;flex-shrink:0">${icon('plus', 'sm')} Yeni hesab</button>
        </div>
        <div class="stack" style="gap:8px">${rows}</div>`;
    }
    if (A.tab === 'ads') {
      const label = { active: 'Aktiv', ended: 'Bitib', stopped: 'Dayandırılıb' };
      body = !A.ads ? loading : !A.ads.length ? '<p class="hint">Hələ elan yoxdur</p>' : A.ads.map((a) => `
        <div class="stack admin-elan${a.status === 'active' ? '' : ' faded'}" style="gap:6px">
          ${this.adCard(a)}
          <div class="row">
            <span class="badge">${label[a.status]}</span>
            <span class="muted small grow">${a.price} inno · ${date(a.createdAt)} → ${date(a.endsAt)}</span>
            ${a.status === 'active' ? `<button class="btn small ghost danger" data-app="admin-elan-stop" data-arg="${a.id}">Dayandır</button>` : ''}
          </div>
        </div>`).join('');
    }
    if (A.tab === 'feedback') {
      const KIND = { idea: '💡 Təklif', complaint: '😠 Şikayət', bug: '🐞 Xəta', other: '💬 Digər' };
      const ST = { new: 'Yeni', read: 'Oxundu', done: 'Həll olundu' };
      const ftab = (id, label) => `<button type="button" class="tab ${A.fbFilter === id ? 'active' : ''}" data-app="admin-fb-filter" data-arg="${id}">${label}</button>`;
      body = `<div class="tabs">${ftab('new', 'Yeni')}${ftab('all', 'Hamısı')}</div>
        ${!A.feedback ? loading : !A.feedback.length ? '<p class="hint">Müraciət yoxdur</p>' : A.feedback.map((f) => `
        <div class="card fb-item ${f.status}">
          <div class="row"><span class="badge">${KIND[f.kind] || f.kind}</span><b class="grow" data-nt>${esc(f.nickname)}</b><span class="muted small">${date(f.createdAt)}</span></div>
          <p class="review-text" data-nt>${esc(f.text)}</p>
          <div class="row admin-actions">
            <span class="badge st-${f.status}">${ST[f.status]}</span><span class="grow"></span>
            ${f.status !== 'read' && f.status !== 'done' ? `<button class="btn small outline" data-app="admin-fb-status" data-arg="${f.id}:read">Oxundu</button>` : ''}
            ${f.status !== 'done' ? `<button class="btn small outline" data-app="admin-fb-status" data-arg="${f.id}:done">${icon('check', 'sm')} Həll olundu</button>` : ''}
            <button class="btn small ghost danger" data-app="admin-fb-delete" data-arg="${f.id}">${icon('x', 'sm')}</button>
          </div>
        </div>`).join('')}`;
    }
    if (A.tab === 'reviews') {
      body = !A.reviews ? loading : !A.reviews.length ? '<p class="hint">Hələ rəy yoxdur</p>' : A.reviews.map((r) => `
        <div class="card review${r.hidden ? ' faded' : ''}">
          <div class="row"><b class="grow" data-nt>${esc(r.nickname)}</b>${this.stars(r.stars)}</div>
          ${r.text ? `<p class="review-text" data-nt>${esc(r.text)}</p>` : ''}
          <div class="row admin-actions">
            <span class="muted small grow">${date(r.updatedAt)}${r.hidden ? ' · gizlədilib' : ''}</span>
            <button class="btn small outline" data-app="admin-rv-hide" data-arg="${r.id}:${r.hidden ? 0 : 1}">${r.hidden ? 'Göstər' : 'Gizlət'}</button>
            <button class="btn small ghost danger" data-app="admin-rv-delete" data-arg="${r.id}">${icon('x', 'sm')} Sil</button>
          </div>
        </div>`).join('');
    }
    return `
      ${this.subHeader('Admin paneli')}
      <div class="tabs scroll">${tab('overview', 'İcmal')}${tab('users', 'İstifadəçilər')}${tab('ads', 'Elanlar')}${tab('feedback', `Müraciətlər${A.stats && A.stats.newFeedback ? ` <span class="count-badge">${A.stats.newFeedback}</span>` : ''}`)}${tab('reviews', 'Rəylər')}</div>
      ${body}`;
  },

  viewRewardsForm() {
    const r = this.admin.rewards;
    if (!r) return '';
    const num = (name, v) => `<input name="${name}" type="number" inputmode="numeric" min="0" max="100000" step="1" required value="${v}">`;
    return `
      <form id="admin-rewards" class="card stack">
        <div><h3>Oyun mükafatları</h3><p class="muted small">Hər bitmiş oyundan sonra oyunçuya verilir. Dəyişiklik növbəti oyunlardan etibarən işləyir.</p></div>
        <div class="reward-grid">
          <span></span><span class="eyebrow">Xal</span><span class="eyebrow">İnno</span>
          <b>${icon('trophy', 'sm')} Qələbə</b>${num('winPoints', r.win.points)}${num('winCoins', r.win.coins)}
          <b>${icon('x', 'sm')} Məğlubiyyət</b>${num('losePoints', r.lose.points)}${num('loseCoins', r.lose.coins)}
        </div>
        <button class="btn primary" type="submit">${icon('check')} Yadda saxla</button>
      </form>`;
  },

  viewPrizesForm() {
    const p = this.admin.prizes;
    if (!p) return '';
    const medals = ['🥇 1-ci yer', '🥈 2-ci yer', '🥉 3-cü yer'];
    return `
      <form id="admin-prizes" class="card stack">
        <div><h3>Aylıq mükafat</h3><p class="muted small">Ay bitəndə (Bakı vaxtı) reytinqin ilk yerlərinə avtomatik inno verilir. Adminlər və saxta hesablar mükafat almır. 0 = mükafat yoxdur.</p></div>
        <div class="prize-grid">
          ${p.map((v, i) => `<label class="small">${medals[i]}<input name="p${i}" type="number" inputmode="numeric" min="0" max="100000" step="1" required value="${v}"></label>`).join('')}
        </div>
        <button class="btn primary" type="submit">${icon('check')} Yadda saxla</button>
      </form>`;
  },

  viewAdminUserSheet() {
    const id = this.admin.editId;
    const u = id ? (this.admin.users || []).find((x) => x.id === id) : null;
    if (id && !u) { this.sheet = null; return ''; }
    const lockNick = u && u.isAdmin;
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><h2 id="sheet-title">${u ? 'Hesabı redaktə et' : 'Yeni hesab'}</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          <form id="admin-user" class="stack" autocomplete="off">
            ${lockNick
              ? `<label>Nickname <input name="nickname" value="${esc(u.nickname)}" readonly></label>
                 <p class="hint">Admin hesabının nickname-i .env faylından idarə olunur</p>`
              : nickField(u ? u.nickname : '', u ? u.nickname : '')}
            <div class="row" style="gap:10px;align-items:flex-start">
              <label class="grow">Xal <input name="points" type="number" inputmode="numeric" min="0" max="10000000" step="1" required value="${u ? u.points : 0}"></label>
              <label class="grow">İnno <input name="coins" type="number" inputmode="numeric" min="0" max="10000000" step="1" required value="${u ? u.coins : 0}"></label>
            </div>
            <label>${u ? 'Yeni şifrə' : 'Şifrə'}
              <input name="password" type="text" ${u ? '' : 'required'} minlength="6" autocomplete="off" placeholder="${u ? 'Dəyişmək istəmirsənsə boş saxla' : 'Ən azı 6 simvol'}"></label>
            ${u ? '<p class="hint">Şifrə dəyişsə, oyunçunun bütün cihazlardakı girişləri bağlanacaq. Xal dəyişikliyi aylıq reytinqə də yazılır.</p>' : ''}
            <button class="btn primary" type="submit">${icon('check')} ${u ? 'Yadda saxla' : 'Hesab yarat'}</button>
          </form>
        </div>
      </div>`;
  },

  viewItemSheet() {
    const d = this.shop.data;
    const u = this.user;
    const i = d.items.find((x) => x.id === this.shop.preview);
    const type = d.types.find((x) => x.id === i.type);
    const owned = d.owned.includes(i.id);
    const on = this.equippedId(i.type) === i.id;
    const look = { ...(u.look || {}), [i.type]: i.type === 'badge' ? i.emoji : i.id };
    const me = { nickname: u.nickname, look };
    let action;
    if (on) action = `<button class="btn outline" data-app="item-remove" data-arg="${i.id}">${icon('x')} Çıxart</button>`;
    else if (owned) action = `<button class="btn primary" data-app="item-wear" data-arg="${i.id}">${icon('check')} Tax</button>`;
    else if (!u.hasPassword) action = `<button class="btn primary" data-app="item-buy" data-arg="${i.id}">${icon('lock')} Almaq üçün qeydiyyatdan keç</button>`;
    else if (u.coins < this.priceOf(i)) {
      action = `<button class="btn primary" disabled>${icon('coin')} Al · ${this.priceOf(i)} inno</button>
        <p class="hint">Daha ${this.priceOf(i) - u.coins} inno lazımdır · <button type="button" class="link" data-app="sheet" data-arg="buy">İnno al</button></p>`;
    } else action = `<button class="btn primary" data-app="item-buy" data-arg="${i.id}">${icon('coin')} Al · ${this.priceOf(i)} inno</button>`;
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><span class="eyebrow">${esc(type ? type.label : '')}</span>
              <h2 id="sheet-title">${i.emoji ? `${esc(i.emoji)} ` : ''}${esc(i.name)}</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          <span class="eyebrow">Lobbidə belə görünəcəksən</span>
          <div class="player item-preview${Look.row(me)}">
            <span class="avatar-wrap"><span class="initial sm${Look.frame(me)}">${initial(u.nickname)}</span><span class="dot"></span></span>
            <span class="name">${Look.name(me)}</span>
          </div>
          ${i.type === 'win' ? `<button class="btn outline" data-app="fx-preview" data-arg="${i.id}">▶ Effekti önizlə</button>
            <p class="hint">Oyunu udanda otaqdakı hər kəsin ekranında oynayır</p>` : ''}
          ${!owned && this.priceOf(i) !== i.price ? `<p class="deal-note">🔥 Həftənin təklifi: <s>${i.price}</s> → ${this.priceOf(i)} inno</p>` : ''}
          <p class="muted small">${on ? 'Bu əşya indi taxılıb.' : owned ? 'Bu əşya səndədir.' : `Qiymət: ${this.priceOf(i)} inno · balansın: ${u.coins} inno`}</p>
          ${action}
        </div>
      </div>`;
  },

  // Həftənin təklifi: endirimli əşya + geri sayım
  viewDeal() {
    const d = this.shop.data;
    const deal = d.deal;
    const i = deal && d.items.find((x) => x.id === deal.itemId);
    if (!i || d.owned.includes(i.id)) return '';
    const left = Math.max(0, deal.endsAt - this.now());
    const days = Math.floor(left / 86400e3);
    const hours = Math.floor((left % 86400e3) / 3600e3);
    const sample = i.type === 'bg' ? `<span class="swatch bg-${i.id}"></span>`
      : i.type === 'frame' ? `<span class="initial fr-${i.id}">${initial(this.user.nickname)}</span>`
      : i.type === 'name' ? `<span class="nm nm-${i.id} sample-name" style="font-size:26px">Aa</span>`
      : `<span class="sample-badge" style="font-size:30px">${i.emoji}</span>`;
    return `
      <button class="card deal-card" data-app="shop-item" data-arg="${i.id}">
        <span class="deal-sample">${sample}</span>
        <span class="grow deal-text">
          <span class="eyebrow">🔥 Həftənin təklifi · −${Math.round((1 - deal.price / deal.oldPrice) * 100)}%</span>
          <b>${esc(i.name)}</b>
          <span class="small"><s>${deal.oldPrice}</s> <b class="deal-price">${icon('coin', 'sm')} ${deal.price}</b> · ${days ? `${days} gün ` : ''}${hours} saat qalıb</span>
        </span>
        ${icon('chev', 'sm')}
      </button>`;
  },

  // Əşyanın indiki qiyməti (həftənin təklifi ilə)
  priceOf(i) {
    const deal = this.shop.data && this.shop.data.deal;
    return deal && deal.itemId === i.id ? deal.price : i.price;
  },

  viewDailySheet() {
    const d = this.user.daily;
    const tiles = d.rewards.map((n, i) => {
      const day = i + 1;
      const done = d.available ? day < d.day : day <= d.day;
      const today = day === d.day;
      return `<div class="daily-tile${done ? ' done' : ''}${today ? ' today' : ''}${day === 7 ? ' big' : ''}">
        <span class="small">Gün ${day}</span><b>${done ? '✓' : day === 7 ? '🎁' : icon('coin', 'sm')}</b><span>+${n}</span></div>`;
    }).join('');
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack daily-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><h2 id="sheet-title">🎁 Gündəlik bonus</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          <p class="muted small">Hər gün gir, inno topla. 7-ci gün böyük hədiyyə! Bir gün buraxsan, sayma yenidən başlayır.</p>
          <div class="daily-grid">${tiles}</div>
          ${d.available
            ? `<button class="btn primary big-btn" data-app="daily-claim">${icon('coin')} +${d.rewards[d.day - 1]} inno götür</button>`
            : `<p class="banner good center">Bu günün bonusu götürüldü ✅ Sabah yenə gəl!</p>`}
        </div>
      </div>`;
  },

  // İnno paketləri: ödəniş WhatsApp-da razılaşdırılır, admin sonra paneldən innonu əlavə edir
  viewBuySheet() {
    const { packs, whatsapp, starter } = this.shop.data.buy;
    const u = this.user;
    const base = packs[0].price / packs[0].inno; // ən kiçik paketin 1 inno qiyməti
    const msg = (p) => `Salam! İnno almaq istəyirəm.\nHesab adı: ${u.nickname}\nİnno miqdarı: ${p.inno} inno\nMəbləğ: ${p.price} AZN`;
    const items = packs.map((p) => {
      const off = Math.round((1 - p.price / (p.inno * base)) * 100);
      const inner = `
        <span class="pack-amount">${icon('coin')} ${p.inno} <small>inno</small></span>
        ${off > 0 ? `<span class="badge pack-off">-${off}%</span>` : ''}
        <span class="pack-price">${p.price} ₼</span>`;
      return u.hasPassword
        ? `<a class="pack" href="https://wa.me/${esc(whatsapp)}?text=${encodeURIComponent(msg(p))}" target="_blank" rel="noopener">${inner}</a>`
        : `<button type="button" class="pack" data-app="sheet" data-arg="register">${inner}</button>`;
    }).join('');
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><h2 id="sheet-title">İnno al</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          ${u.hasPassword
            ? '<p class="muted small">Paketi seç: WhatsApp hazır mesajla açılacaq. Ödənişdən sonra inno hesabına əlavə olunur.</p>'
            : '<div class="banner bad small">İnno almaq üçün əvvəlcə qeydiyyatdan keç, yoxsa alınan inno hesabınla birlikdə itə bilər.</div>'}
          ${starter ? (() => {
            const off = Math.round((1 - starter.price / (starter.inno * base)) * 100);
            const smsg = `Salam! Başlanğıc paketini almaq istəyirəm.\nHesab adı: ${u.nickname}\nİnno miqdarı: ${starter.inno} inno\nMəbləğ: ${starter.price} AZN`;
            const inner = `<span class="starter-tag">🔥 Başlanğıc paketi · bir dəfəlik</span>
              <span class="pack-amount">${icon('coin')} ${starter.inno} <small>inno</small></span>
              <span class="badge pack-off">-${off}%</span>
              <span class="pack-price">${starter.price} ₼</span>`;
            return u.hasPassword
              ? `<a class="pack starter" href="https://wa.me/${esc(whatsapp)}?text=${encodeURIComponent(smsg)}" target="_blank" rel="noopener">${inner}</a>`
              : `<button type="button" class="pack starter" data-app="sheet" data-arg="register">${inner}</button>`;
          })() : ''}
          <div class="packs">${items}</div>
          ${u.hasPassword ? `<p class="hint">${icon('phone', 'sm')} Mesajda hesab adın (<b data-nt>${esc(u.nickname)}</b>) və paket avtomatik yazılır</p>` : ''}
        </div>
      </div>`;
  },

  viewLogoutSheet() {
    const u = this.user;
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><h2 id="sheet-title">Çıxmazdan əvvəl</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          <div class="banner bad small">Şifrən yoxdur: çıxsan, hesabın silinəcək. ${u.points} xal və ${u.coins} inno itəcək.</div>
          <p class="muted small">Şifrə qoy, sonra istənilən cihazdan eyni nickname ilə girə bilərsən.</p>
          ${upgradeForm(u)}
          <button type="button" class="btn ghost danger" data-app="logout-guest">${icon('logout')} Hesabı sil və çıx</button>
        </div>
      </div>`;
  },

  // Ayın sonunda ilk 3 yerə inno + keçən ayın qalibləri
  viewPrizeStrip(d) {
    if (!d || !d.prizes) return '';
    const medals = ['🥇', '🥈', '🥉'];
    const prizes = d.prizes.map((n, i) => (n ? `<span class="prize">${medals[i]} ${n}</span>` : '')).join('');
    const last = d.lastWinners;
    return `
      ${prizes ? `<div class="card prize-strip">
        <span class="stat-ic coin">${icon('trophy', 'sm')}</span>
        <span class="grow"><b>Ayın sonunda mükafat</b><span class="prize-list">${prizes} <span class="muted small">inno</span></span></span>
      </div>` : ''}
      ${last && last.list.length ? `<div class="card last-winners">
        <span class="eyebrow">${monthLabel(last.month)} qalibləri</span>
        ${last.list.map((w) => `<div class="row"><span>${medals[w.rank - 1]}</span><b class="grow" data-nt>${esc(w.nickname)}</b>
          <span class="muted small">+${w.coins} inno</span></div>`).join('')}
      </div>` : ''}`;
  },

  viewRegisterSheet() {
    const d = this.shop.data;
    const item = this.shop.preview && d && d.items.find((i) => i.id === this.shop.preview);
    return `
      <div class="sheet-backdrop" data-app="sheet-close">
        <div class="sheet card stack" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <div class="row">
            <div class="grow"><h2 id="sheet-title">Qeydiyyatdan keç</h2></div>
            <button type="button" class="btn ghost small icon-only sheet-x" data-app="sheet-close" aria-label="Bağla">${icon('x')}</button>
          </div>
          <p class="muted small">${item
            ? `«${esc(item.name)}» almaq üçün hesabın qeydiyyatlı olmalıdır. Bir dəqiqəlik işdir, oyundan çıxmırsan.`
            : 'Şifrə qoy ki, hesabın, xalların və innon itməsin. Mağazadan alış da yalnız qeydiyyatlı hesabla olur.'}</p>
          ${upgradeForm(this.user)}
        </div>
      </div>`;
  },

  viewShop() {
    const d = this.shop.data;
    const u = this.user;
    if (!d) return `${this.subHeader('Mağaza')}<p class="hint">Yüklənir…</p>`;
    const tabs = [...d.types, { id: 'ads', label: 'Reklam' }]
      .map((t) => `<button type="button" class="tab ${this.shop.tab === t.id ? 'active' : ''}" data-app="shop-tab" data-arg="${t.id}">${t.label}</button>`)
      .join('');

    // Önizləmə: seçilmiş (hələ alınmamış) əşya varsa onunla göstər
    const look = { ...(u.look || {}) };
    const pv = this.shop.preview && d.items.find((i) => i.id === this.shop.preview);
    if (pv) look[pv.type] = pv.type === 'badge' ? pv.emoji : pv.id;
    const me = { nickname: u.nickname, look };

    const items = d.items
      .filter((i) => i.type === this.shop.tab)
      .map((i) => {
        const owned = d.owned.includes(i.id);
        const on = this.equippedId(i.type) === i.id;
        const sample = i.type === 'name'
          ? `<span class="nm nm-${i.id} sample-name">Aa</span>`
          : i.type === 'bg'
            ? `<span class="swatch bg-${i.id}"></span>`
            : i.type === 'frame'
              ? `<span class="initial fr-${i.id}">${initial(u.nickname)}</span>`
              : `<span class="sample-badge">${i.emoji}</span>`;
        const status = on
          ? `<span class="item-status on">${icon('check', 'sm')} Taxılıb</span>`
          : owned
            ? '<span class="item-status">Sənindir</span>'
            : `<span class="item-status price${u.coins < this.priceOf(i) ? ' short' : ''}">${this.priceOf(i) !== i.price ? `<s>${i.price}</s> ` : ''}${icon('coin', 'sm')} ${this.priceOf(i)}</span>`;
        return `
          <button class="shop-item${on ? ' on' : ''}${pv && pv.id === i.id ? ' previewing' : ''}" data-app="shop-item" data-arg="${i.id}">
            <span class="sample">${sample}</span>
            <b>${esc(i.name)}</b>
            ${i.anim ? '<span class="badge anim-badge">Hərəkətli</span>' : ''}
            ${status}
          </button>`;
      })
      .join('');

    return `
      ${this.subHeader('Mağaza')}
      <div class="wallet">
        <div>
          <span class="eyebrow">Balansın</span>
          <div class="wallet-amount">${icon('coin')} ${u.coins} <span>inno</span></div>
        </div>
        <div class="wallet-side">
          <button class="btn small wallet-buy" data-app="sheet" data-arg="buy">${icon('plus', 'sm')} İnno al</button>
          <p class="small">Hər qələbə +${d.rewards.win.coins} inno</p>
        </div>
      </div>
      ${u.hasPassword ? '' : `
      <div class="card guest-note">
        <span class="notice-icon">${icon('lock')}</span>
        <span class="grow small"><b>Baxmaq pulsuzdur</b><br><span class="muted">Almaq üçün qeydiyyat lazımdır</span></span>
        <button class="btn small dark" data-app="sheet" data-arg="register">Qeydiyyat</button>
      </div>`}
      ${this.viewDeal()}
      ${this.shop.tab === 'ads' ? `<div class="tabs">${tabs}</div>${this.viewAdShop()}` : `
      <div class="stack" style="gap:8px">
        <span class="eyebrow">Lobbidə belə görünəcəksən${pv ? ' (önizləmə)' : ''}</span>
        <div class="player${Look.row(me)}">
          <span class="avatar-wrap"><span class="initial sm${Look.frame(me)}">${initial(u.nickname)}</span><span class="dot"></span></span>
          <span class="name">${Look.name(me)}</span>
        </div>
      </div>
      <div class="tabs">${tabs}</div>
      <div class="shop-grid">${items}</div>
      <p class="hint">Əşyaya toxun: önizlə, al və ya tax</p>`}`;
  },

  viewLobby() {
    const r = this.room;
    const players = r.players
      .map((p) => `
        <div class="player${Look.row(p)}">
          <span class="avatar-wrap"><span class="initial sm${Look.frame(p)}">${initial(p.nickname)}</span><span class="dot ${p.online ? '' : 'off'}"></span></span>
          <span class="name">${Look.name(p)}${p.id === r.me ? ' <span class="tag">(sən)</span>' : ''}</span>
          ${p.id === r.hostId ? `<span class="crown" title="Host">${icon('crown', 'sm')}</span>` : ''}
          ${r.isHost && p.id !== r.me ? `<button class="btn ghost small icon-only" data-app="kick" data-arg="${p.id}" aria-label="Çıxar">${icon('x', 'sm')}</button>` : ''}
        </div>`)
      .join('');

    const settings = r.settingsSchema
      .map((s) => `
        <label class="small">${esc(s.label)}
          <select data-setting="${esc(s.key)}" ${r.isHost ? '' : 'disabled'}>
            ${s.options.map((o) => `<option value="${esc(o.value)}" ${r.settings[s.key] === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
          </select>
        </label>`)
      .join('');

    const need = r.minPlayers - r.players.length;
    return `
      <div class="topbar">
        <button class="btn ghost small icon-only" data-app="leave" aria-label="Otaqdan çıx">${icon('back')}</button>
        <div class="title">${esc(r.gameName)}</div>
        <span style="width:40px"></span>
      </div>
      <div class="room-hero">
        <span class="eyebrow">Otaq kodu</span>
        <div class="room-code">${esc(r.code)}</div>
        ${this.qrSvg(r.code)}
        <span class="qr-hint">Kameranı QR koda tut, dərhal qoşul</span>
        <button class="btn small" data-app="share">${icon('share', 'sm')} Dəvət et</button>
      </div>
      ${RULES_PAGES[r.gameId] ? `<a class="rules-link" href="${rulesUrl(r.gameId)}" target="_blank" rel="noopener">📖 ${esc(r.gameName)}: qaydalar</a>` : ''}
      <div class="section-title"><h3>Oyunçular</h3><span class="pill">${icon('users', 'sm')} ${r.players.length}/${r.maxPlayers}</span></div>
      <div class="players">${players}</div>
      ${GameClients[r.gameId] && GameClients[r.gameId].lobby ? GameClients[r.gameId].lobby(r) : ''}
      ${this.viewAds()}
      ${settings ? `<details class="card"><summary><span class="notice-icon" style="background:var(--soft);color:var(--primary)">${icon('sliders')}</span><b class="grow">Ayarlar</b>${icon('chev', 'chev')}</summary><div class="settings" style="margin-top:16px">${settings}</div></details>` : ''}
      ${r.isHost ? this.viewVoicePicker() : ''}
      <div class="spacer"></div>
      ${r.isHost
        ? `<button class="btn primary" data-app="start" ${need > 0 ? 'disabled' : ''}>${icon('play')} Oyunu başlat</button>
           ${need > 0 ? `<p class="hint">Başlamaq üçün daha ${need} nəfər lazımdır</p>` : ''}`
        : '<p class="hint">Host oyunu başladana qədər gözlə…</p>'}
      ${this.closeNote(r)}`;
  },

  // Otağa qoşulma linki üçün QR (telefonun kamerası ilə oxunur)
  qrSvg(code) {
    try {
      const q = qrcode(0, 'M');
      q.addData(`${location.origin}/?room=${code}`);
      q.make();
      return `<div class="qr" aria-label="QR">${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>`;
    } catch {
      return '';
    }
  },

  // Oyun bitəndə: qaliblərin alınmış qələbə effekti otaqdakı hər kəsə; effekti olmayan qalib öz ekranında sadə konfeti görür
  celebrate(room) {
    const winners = (room.winners || []).map((id) => room.players.find((p) => p.id === id)).filter(Boolean);
    const premium = winners.filter((p) => p.look && p.look.win && Effects.has(p.look.win));
    if (premium.length) {
      premium.slice(0, 3).forEach((p, i) => setTimeout(() => {
        Effects.play(p.look.win);
        toast(`✨ ${p.nickname}: ${t('qələbə effekti')}`, 3000);
      }, i * 2200));
    } else if (room.winners && room.winners.includes(room.me)) {
      Effects.play('basic');
    }
  },

  // Oyun bitib və yeni oyun başlamayıbsa: otağın bağlanmasına qalan vaxt
  closeNote(r) {
    if (!r.closesAt) return '';
    return `<p class="hint">${icon('clock', 'sm')} Yeni oyun başlamasa, otaq <b data-deadline="${r.closesAt}"></b> sonra bağlanacaq</p>`;
  },

  viewVoicePicker() {
    const cur = Narrator.enabled ? Narrator.voice : 'off';
    const tab = (id, label) =>
      `<button type="button" class="tab ${cur === id ? 'active' : ''}" data-app="voice" data-arg="${id}">${label}</button>`;
    return `
      <div class="card stack voice-card">
        <div class="row">
          <span class="notice-icon" style="background:var(--soft);color:var(--primary)">${icon('sound')}</span>
          <span class="grow"><b>Aparıcı səsi</b><br><span class="muted small">Sənin telefonundan oxunur. Toxun, dinlə</span></span>
        </div>
        <div class="tabs">${voices().map((v) => tab(v.id, `<span data-nt>${v.name}</span>`)).join('')}${tab('off', 'Səssiz')}</div>
      </div>`;
  },

  viewGameChrome(inner) {
    const r = this.room;
    const hostTools = r.isHost
      ? `<button class="btn ghost small icon-only" data-app="narrator" title="Aparıcı səsi" aria-label="Aparıcı səsi">${icon(Narrator.enabled ? 'sound' : 'mute')}</button>`
      : '<span style="width:40px"></span>';
    return `
      <div class="topbar">
        <button class="btn ghost small icon-only" data-app="leave" aria-label="Oyundan çıx">${icon('back')}</button>
        <div class="title">${esc(r.gameName)} <span class="muted small">#${esc(r.code)}</span></div>
        ${hostTools}
      </div>
      ${inner}
      ${r.earned ? `<div class="card earned">
          <span>${icon('star')} +${r.earned.points} xal</span>
          ${r.earned.coins ? `<span>${icon('coin')} +${r.earned.coins} inno</span>` : ''}
        </div>` : ''}
      ${r.isHost && r.status === 'finished' ? `<button class="btn primary" data-app="lobby">${icon('replay')} Yenidən oyna</button>` : ''}
      ${this.closeNote(r)}
      ${r.isHost && r.status === 'playing' ? '<button class="btn ghost" data-app="lobby">Oyunu dayandır</button>' : ''}`;
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
