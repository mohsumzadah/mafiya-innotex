'use strict';

// Kənd oyunu: səhnə (meydan + evlər + personajlar) davamlı DOM-dur, hər yeniləmədə yenidən yaradılmır,
// beləcə personajlar evdən meydana və başqa evlərə yumşaq yeriyir (CSS transition).
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
  
  const local = { key: null, selected: null, showRole: false };
  const scene = { el: null, sig: '', dying: {}, done: {}, last: null };

  const player = (room, id) => room.players.find((x) => x.id === id);
  const nick = (room, id) => (player(room, id) || {}).nickname || 'Oyunçu';
  const nm = (room, id) => `<span data-nt>${esc(nick(room, id))}</span>`;
  const roleName = (r) => (r && ROLES[r] ? `${ROLES[r].icon} ${ROLES[r].name}` : '');
  const timer = (g, tick) => (g.deadline ? `<span class="timer" data-deadline="${g.deadline}"${tick ? ' data-tick="1"' : ''}></span>` : '');

  // ---------- Səhnə (SVG illüstrasiya) ----------

  const SKIN = ['#ffdcb5', '#f3c79a', '#dba070', '#b07846', '#7b4f2e', '#ffe9d9', '#e0ac8a', '#4a2f1d'];
  const HAIR = ['#2b1d12', '#5a3a1c', '#c9892b', '#e8c75a', '#a33b24', '#1f2937', '#6b4ea8', '#e5e7eb', '#9ca3af', '#ec4899', '#22d3ee', '#22c55e', '#ef4444', '#3b82f6'];
  const SHIRTS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b', '#1f2937', '#f8fafc', '#fde047', '#a3e635', '#7dd3fc'];
  const PANTS = ['#334155', '#1e3a8a', '#111827', '#7c2d12', '#3f6212', '#6b21a8', '#be123c', '#e2e8f0'];
  const N = { hair: 14, eyes: 6, brows: 4, mouth: 6, outfit: 6, extra: 5 };
  const ROOFS = ['#e5484d', '#f59e0b', '#16a34a', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#d946ef', '#0891b2', '#dc2626', '#65a30d', '#7c3aed'];
  const KILLS = ['poison', 'slash', 'lightning', 'meteor', 'piano', 'shark', 'rocket', 'ufo', 'dragon', 'chasm'];
  const killOf = (look) => {
    const k = look && look.death ? String(look.death).replace('death_', '') : '';
    return KILLS.includes(k) ? k : 'plain';
  };

  function homePos(i, n) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: 50 + 39 * Math.cos(a), y: 50 + 37 * Math.sin(a) };
  }
  // Evin qabağı: hər oyunçu öz evinin qarşısında dayanır
  function doorPos(i, n) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: 50 + 31 * Math.cos(a), y: 50 + 29 * Math.sin(a) };
  }

  // ----- Evlər -----
  const GLASS = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" class="vh-glass"/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="#fff" stroke-width="1.4"/>`;
  const HOUSES = {
    castle: () => ({
      shape: `<rect x="22" y="42" width="56" height="56" fill="#c9ced9"/><rect x="5" y="30" width="26" height="68" fill="#b4bbc9"/><rect x="69" y="30" width="26" height="68" fill="#b4bbc9"/>
        <path d="M3 30 L18 5 L33 30Z" fill="#6d5acd"/><path d="M67 30 L82 5 L97 30Z" fill="#6d5acd"/>
        <path d="M22 42h6v-5h6v5h6v-5h6v5h6v-5h6v5h6v-5h6v5" fill="none"/><rect x="22" y="36" width="5" height="6" fill="#c9ced9"/><rect x="31" y="36" width="5" height="6" fill="#c9ced9"/><rect x="40" y="36" width="5" height="6" fill="#c9ced9"/><rect x="55" y="36" width="5" height="6" fill="#c9ced9"/><rect x="64" y="36" width="5" height="6" fill="#c9ced9"/><rect x="73" y="36" width="5" height="6" fill="#c9ced9"/>
        <rect x="49" y="14" width="2" height="26" fill="#6b4a2e"/><path d="M51 14 L66 19 L51 24Z" fill="#ef4444"/>
        <path d="M5 62h26M5 80h26M69 62h26M69 80h26M22 60h56M22 78h56" stroke="rgba(0,0,0,.08)" stroke-width="1"/>
        <rect x="39" y="66" width="22" height="32" rx="11" fill="#5b3a1e"/><path d="M50 66v32M39 80h22" stroke="#3b2412" stroke-width="1.4"/>`,
      glass: GLASS(13, 46, 10, 12) + GLASS(77, 46, 10, 12) + GLASS(30, 50, 9, 11) + GLASS(61, 50, 9, 11),
      body: 'M3 5 L97 5 L97 98 L3 98Z',
    }),
    tower: () => ({
      shape: `<path d="M26 98 L30 34 Q30 30 34 30 L66 30 Q70 30 70 34 L74 98Z" fill="#dcc79c"/>
        <path d="M50 30 L66 30 Q70 30 70 34 L74 98 L50 98Z" fill="rgba(120,90,40,.2)"/>
        <path d="M30 44 Q50 49 70 44M29 56 Q50 61 71 56M28 68 Q50 73 72 68M27 80 Q50 85 73 80M26 92 Q50 97 74 92" stroke="rgba(110,80,45,.28)" stroke-width="1.1" fill="none"/>
        <path d="M71 44 L86 60 L86 98 L72 98Z" fill="#cdb585"/><path d="M78 52 L86 60 L86 98 L78 98Z" fill="rgba(90,60,30,.22)"/><path d="M72 62h14M72 78h14" stroke="rgba(110,80,45,.3)" stroke-width="1"/>
        <path d="M34 30 L35 12 Q35 9 38 9 L62 9 Q65 9 65 12 L66 30Z" fill="#e2d1aa"/><path d="M50 9 L62 9 Q65 9 65 12 L66 30 L50 30Z" fill="rgba(120,90,40,.16)"/>
        <rect x="32" y="26" width="36" height="5" rx="1.5" fill="#cdb585"/><rect x="33" y="8" width="34" height="5" rx="1.5" fill="#cdb585"/>
        <path d="M35 8 L37 4 L41 4 L43 8M45 8 L47 4 L53 4 L55 8M57 8 L59 4 L63 4 L65 8" fill="#cdb585"/>
        <path d="M37 4 Q50 -9 63 4Z" fill="#b89a6a"/><rect x="49.2" y="-14" width="1.6" height="12" fill="#6b4a2e"/>
        <rect x="50.8" y="-14" width="11" height="2.6" fill="#00b5e2"/><rect x="50.8" y="-11.4" width="11" height="2.6" fill="#ef3340"/><rect x="50.8" y="-8.8" width="11" height="2.6" fill="#509e2f"/>
        <rect x="44" y="80" width="12" height="18" rx="6" fill="#5b3a1e"/>`,
      glass: '<rect x="48.4" y="36" width="3.6" height="10" rx="1.8" class="vh-glass"/><rect x="48.4" y="52" width="3.6" height="10" rx="1.8" class="vh-glass"/><rect x="48.4" y="66" width="3.6" height="9" rx="1.8" class="vh-glass"/><rect x="48.6" y="14" width="3.2" height="8" rx="1.6" class="vh-glass"/><rect x="77" y="70" width="3.4" height="9" rx="1.7" class="vh-glass"/>',
      body: '',
    }),
    pagoda: () => ({
      shape: `<rect x="26" y="76" width="48" height="22" fill="#f4d9a8"/><path d="M6 78 Q50 62 94 78 L86 82 L14 82Z" fill="#c0392b"/>
        <rect x="31" y="56" width="38" height="20" fill="#f4d9a8"/><path d="M15 58 Q50 42 85 58 L78 62 L22 62Z" fill="#c0392b"/>
        <rect x="37" y="38" width="26" height="18" fill="#f4d9a8"/><path d="M24 40 Q50 24 76 40 L70 44 L30 44Z" fill="#c0392b"/>
        <rect x="49" y="8" width="2" height="18" fill="#6b4a2e"/><circle cx="50" cy="8" r="3" fill="#facc15"/>
        <rect x="43" y="82" width="14" height="16" rx="7" fill="#7c2d12"/>`,
      glass: GLASS(33, 62, 8, 9) + GLASS(59, 62, 8, 9) + GLASS(43, 44, 14, 9) + GLASS(30, 82, 8, 9) + GLASS(62, 82, 8, 9),
      body: 'M6 8 L94 8 L94 98 L6 98Z',
    }),
    igloo: () => ({
      shape: `<path d="M6 98 A44 44 0 0 1 94 98Z" fill="#eef6ff"/><path d="M12 82 Q50 70 88 82M18 66 Q50 54 82 66M30 52 Q50 44 70 52M50 98 V56M28 98 Q30 70 38 56M72 98 Q70 70 62 56" stroke="#c8dcf0" stroke-width="1.2" fill="none"/>
        <path d="M34 98 L34 84 Q34 70 50 70 Q66 70 66 84 L66 98Z" fill="#9db9d8"/><path d="M40 98 L40 86 Q40 77 50 77 Q60 77 60 86 L60 98Z" fill="#5b7ea6"/>
        <path d="M16 74 l2 7 l2-7M78 74 l2 8 l2-8" fill="#fff" stroke="#c8dcf0" stroke-width=".8"/>`,
      glass: '<circle cx="50" cy="48" r="7.5" class="vh-glass"/>',
      body: 'M6 98 A44 44 0 0 1 94 98Z',
    }),
    tree: () => ({
      shape: `<path d="M41 98 L45 50 L58 50 L63 98Z" fill="#7c4a1d"/><circle cx="50" cy="32" r="28" fill="#2f9e44"/><circle cx="26" cy="46" r="16" fill="#37b24d"/><circle cx="74" cy="46" r="16" fill="#37b24d"/><circle cx="42" cy="22" r="12" fill="#51cf66"/>
        <rect x="33" y="42" width="34" height="24" rx="2" fill="#f4d9a8"/><path d="M28 44 L50 24 L72 44Z" fill="#c2410c"/><rect x="45" y="52" width="10" height="14" rx="5" fill="#7c4a1d"/>
        <path d="M60 70 L66 98M66 70 L72 98M61 76h8M63 84h8M65 92h8" stroke="#a67c52" stroke-width="1.6" fill="none"/>`,
      glass: GLASS(36, 47, 8, 8) + GLASS(57, 47, 8, 8),
      body: 'M20 4 L82 4 L90 56 L66 98 L41 98 L20 56Z',
    }),
    mill: () => ({
      shape: `<path d="M28 98 L38 42 L62 42 L72 98Z" fill="#e8d5b0"/><path d="M28 98 L38 42 L50 42 L50 98Z" fill="rgba(0,0,0,.06)"/><path d="M34 44 L50 22 L66 44Z" fill="#a0522d"/>
        <g class="vh-blades"><rect x="48.4" y="-8" width="3.2" height="62" fill="#8b5e3c"/><rect x="-4" y="31.4" width="108" height="3.2" fill="#8b5e3c"/><rect x="51.6" y="-6" width="9" height="20" fill="#f5ead0"/><rect x="39.4" y="46" width="9" height="20" fill="#f5ead0"/><rect x="66" y="34.6" width="20" height="9" fill="#f5ead0"/><rect x="14" y="22.4" width="20" height="9" fill="#f5ead0"/></g>
        <rect x="43" y="78" width="14" height="20" rx="7" fill="#6b3f1d"/><circle cx="50" cy="38" r="3" fill="#6b4a2e"/>`,
      glass: GLASS(44, 56, 12, 11),
      body: 'M-4 -8 L104 -8 L104 98 L-4 98Z',
    }),
  };

  function houseSvg(c, kind) {
    const k = kind ? String(kind).replace('house_', '') : '';
    if (HOUSES[k]) {
      const h = HOUSES[k]();
      return `<svg class="vh vh-${k}" viewBox="0 0 100 104" aria-hidden="true">
        <ellipse cx="52" cy="99" rx="46" ry="6" fill="rgba(0,0,0,.2)"/>
        <g>${h.shape}</g><g class="vh-shade-g">${h.shape}</g><g class="vh-win">${h.glass}</g></svg>`;
    }
    return `<svg class="vh" viewBox="0 0 100 104" aria-hidden="true">
      <ellipse cx="52" cy="99" rx="46" ry="6" fill="rgba(0,0,0,.2)"/>
      <rect x="64" y="14" width="11" height="26" rx="2" fill="#8b5e3c"/><rect x="62" y="11" width="15" height="6" rx="2" fill="#6f4a2e"/>
      <rect x="13" y="48" width="74" height="50" rx="4" fill="#f6e7c8"/>
      <rect x="13" y="86" width="74" height="12" rx="4" fill="#e3cfa2"/>
      <path d="M3 54 L50 8 L97 54 Z" fill="${c}"/>
      <path d="M50 8 L97 54 L50 54 Z" fill="rgba(0,0,0,.16)"/>
      <path d="M14 46 L50 14 M24 50 L50 24 M60 24 L88 48 M70 30 L82 42" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-linecap="round" fill="none"/>
      <rect x="2" y="52" width="96" height="5" rx="2.5" fill="rgba(0,0,0,.18)"/>
      <path class="vh-shade" d="M3 54 L50 8 L97 54 L87 54 L87 98 L13 98 L13 54 Z" fill="#050a30"/>
      <g class="vh-win">${GLASS(20, 62, 17, 17)}${GLASS(63, 62, 17, 17)}</g>
      <rect x="42" y="68" width="18" height="30" rx="9" fill="#7c4a1d"/><circle cx="55" cy="84" r="1.6" fill="#facc15"/>
    </svg>`;
  }

  // ----- Personaj -----
  const HATS = {
    hat_crown: '<path d="M10.5 8 L12 -2 L16.5 4 L20 -4 L23.5 4 L28 -2 L29.5 8 Z" fill="#facc15" stroke="#b45309" stroke-width=".8"/><circle cx="20" cy="2" r="1.3" fill="#ef4444"/><circle cx="13" cy="3.5" r="1" fill="#3b82f6"/><circle cx="27" cy="3.5" r="1" fill="#22c55e"/>',
    hat_top: '<rect x="12.5" y="-8" width="15" height="14" rx="1.5" fill="#111827"/><rect x="12.5" y="1" width="15" height="3" fill="#dc2626"/><ellipse cx="20" cy="6" rx="13" ry="2.6" fill="#111827"/>',
    hat_wizard: '<path d="M9.5 7 L21 -16 L30.5 7 Z" fill="#6d28d9"/><ellipse cx="20" cy="7" rx="14" ry="2.6" fill="#5b21b6"/><circle cx="20" cy="-2" r="1.4" fill="#fde047"/><circle cx="24" cy="2.5" r="1" fill="#fde047"/>',
    hat_pirate: '<path d="M5 9 Q20 -9 35 9 Q20 3.5 5 9Z" fill="#111827"/><circle cx="20" cy="2.2" r="2.4" fill="#f3f4f6"/><path d="M18 4.5h4" stroke="#111827" stroke-width="1"/>',
    hat_santa: '<path d="M9.5 8 Q20 -14 31 8 Z" fill="#dc2626"/><rect x="8.5" y="5.5" width="23" height="4" rx="2" fill="#fff"/><circle cx="28" cy="-4" r="2.6" fill="#fff"/>',
    hat_cowboy: '<ellipse cx="20" cy="6.5" rx="16.5" ry="3" fill="#92400e"/><path d="M12 6.5 Q13 -3 20 -3 Q27 -3 28 6.5Z" fill="#a8541a"/><rect x="12.5" y="3" width="15" height="2" fill="#451a03"/>',
    hat_party: '<path d="M13 7 L20 -12 L27 7Z" fill="#ec4899"/><path d="M15.5 1 L24.5 1M14 4.5 L26 4.5" stroke="#fde047" stroke-width="1.6"/><circle cx="20" cy="-12" r="2" fill="#22d3ee"/>',
    hat_halo: '<ellipse class="acc-halo" cx="20" cy="-3" rx="10" ry="3" fill="none" stroke="#facc15" stroke-width="2.2"/>',
  };
  const FACES = {
    face_sun: '<rect x="10.5" y="15.5" width="9" height="6.4" rx="2.4" fill="#111827"/><rect x="20.5" y="15.5" width="9" height="6.4" rx="2.4" fill="#111827"/><path d="M19.5 17.5h1" stroke="#111827" stroke-width="1.4"/>',
    face_nerd: '<circle cx="16" cy="18.5" r="4.4" fill="rgba(255,255,255,.25)" stroke="#111827" stroke-width="1.2"/><circle cx="24" cy="18.5" r="4.4" fill="rgba(255,255,255,.25)" stroke="#111827" stroke-width="1.2"/><path d="M20.4 18.3h-.8" stroke="#111827" stroke-width="1.2"/>',
    face_mono: '<circle cx="24" cy="18.5" r="4.6" fill="rgba(255,255,255,.3)" stroke="#d4a017" stroke-width="1.4"/><path d="M28 21 Q32 30 29 38" stroke="#d4a017" stroke-width=".9" fill="none"/>',
    face_mask: '<path d="M9 15.5 Q20 12.5 31 15.5 L30 21.5 Q25.5 22 24 20 Q20 18.5 16 20 Q14.5 22 10 21.5Z" fill="#111827"/><circle cx="16" cy="18.2" r="1.5" fill="#fff"/><circle cx="24" cy="18.2" r="1.5" fill="#fff"/>',
    face_mustache: '<path d="M13.5 24.4 Q17 20.8 20 23.4 Q23 20.8 26.5 24.4 Q23 25.4 20 24.4 Q17 25.4 13.5 24.4Z" fill="#2b1d12"/>',
    face_clown: '<circle cx="20" cy="22" r="3" fill="#ef4444"/><circle cx="19" cy="21" r=".9" fill="rgba(255,255,255,.6)"/>',
    face_patch: '<circle cx="24" cy="18.5" r="3.6" fill="#111827"/><path d="M10 11 L31 24" stroke="#111827" stroke-width="1.2"/>',
  };
  const BACKS = {
    back_cape: '<path d="M7 28 L-1 62 Q20 68 41 62 L33 28Z" fill="#b91c1c"/><path d="M7 28 L-1 62 Q8 64 14 64 L14 28Z" fill="rgba(0,0,0,.18)"/>',
    back_wings: '<g class="acc-wing"><path d="M8 34 Q-12 18 -6 50 Q2 40 8 44Z" fill="#fff" stroke="#cbd5e1" stroke-width=".8"/><path d="M32 34 Q52 18 46 50 Q38 40 32 44Z" fill="#fff" stroke="#cbd5e1" stroke-width=".8"/></g>',
    back_bat: '<g class="acc-wing"><path d="M8 34 Q-14 24 -8 52 L-2 44 L2 52 L8 44Z" fill="#4c1d95"/><path d="M32 34 Q54 24 48 52 L42 44 L38 52 L32 44Z" fill="#4c1d95"/></g>',
    back_jet: '<rect x="5" y="30" width="7" height="18" rx="3" fill="#94a3b8"/><rect x="28" y="30" width="7" height="18" rx="3" fill="#94a3b8"/><path class="acc-flame" d="M6 48 L8.5 58 L11 48Z" fill="#fb923c"/><path class="acc-flame" d="M29 48 L31.5 58 L34 48Z" fill="#fb923c"/>',
    back_bag: '<rect x="3" y="30" width="9" height="17" rx="3" fill="#8b5a2b"/><rect x="28" y="30" width="9" height="17" rx="3" fill="#8b5a2b"/>',
  };

  const darken = (hex, k = 0.78) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.round(v * k));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
  };

  // Seçilməyibsə (bot, yeni hesab) oyunçunun nömrəsinə görə müxtəlif, yaraşıqlı tip
  function resolveChar(i, shirtDef, look) {
    const c = look && look.char;
    if (c) {
      return {
        skin: SKIN[c.skin] || SKIN[1], hairC: HAIR[c.hairColor] || HAIR[0], shirt: SHIRTS[c.shirt] || SHIRTS[6], pants: PANTS[c.pants || 0],
        hair: c.hair, eyes: c.eyes || 0, brows: c.brows || 0, mouth: c.mouth || 0, outfit: c.outfit || 0, extra: c.extra || 0,
      };
    }
    return {
      skin: SKIN[(i * 2 + 1) % 5], hairC: HAIR[(i * 3 + 2) % 7], shirt: shirtDef, pants: PANTS[(i * 3) % 3],
      hair: i % 4, eyes: i % 3 === 0 ? 0 : i % 3, brows: i % 3, mouth: i % 3 === 2 ? 1 : 0, outfit: i % 5 === 3 ? 1 : 0, extra: i % 7 === 4 ? 1 : 0,
    };
  }

  function hairMarkup(st, h, shirt) {
    return [
      `<path d="M9 16c0-9 5-13 11-13s11 4 11 13c-3-5-7-6-11-6s-8 1-11 6z" fill="${h}"/>`,
      `<path d="M8 17c-1-10 5-15 12-15s13 5 12 15l1.5 14c-3.5 0-4.5-3-4.5-8-3-2.5-6-4-9-4s-6 1.5-9 4c0 5-1 8-4.5 8z" fill="${h}"/>`,
      `<path d="M8 15c0-7 5-12 12-12s12 5 12 12z" fill="${shirt}"/><rect x="5" y="13.5" width="30" height="3.4" rx="1.7" fill="${shirt}"/>`,
      `<path d="M9 16c0-9 5-13 11-13s11 4 11 13c-3-5-7-6-11-6s-8 1-11 6z" fill="${h}"/><circle cx="20" cy="3.5" r="4" fill="${h}"/>`,
      `<path d="M9.5 14C9.5 7 14 5 20 5s10.5 2 10.5 9c-3-3.6-6.5-4.4-10.5-4.4S12.5 10.4 9.5 14z" fill="${h}" opacity=".85"/>`,
      `<path d="M8.5 15 L8.8 6 L12.8 10 L14.5 1.5 L18.8 8.8 L21.5 .5 L25 8.8 L28.6 2.5 L31 10.8 L31.5 15 C28 10 12 10 8.5 15Z" fill="${h}"/>`,
      `<g fill="${h}"><circle cx="10" cy="10" r="5.6"/><circle cx="15" cy="5" r="5.6"/><circle cx="21.5" cy="3.4" r="5.8"/><circle cx="27.5" cy="5.2" r="5.6"/><circle cx="31.5" cy="10.5" r="5.4"/><circle cx="8.8" cy="17" r="3.6"/><circle cx="31.2" cy="17" r="3.6"/></g>`,
      `<path d="M9 16c0-9 5-13 11-13s11 4 11 13c-3-5-7-6-11-6s-8 1-11 6z" fill="${h}"/><circle cx="5.5" cy="21" r="4.4" fill="${h}"/><circle cx="34.5" cy="21" r="4.4" fill="${h}"/><circle cx="8.2" cy="13.5" r="1.6" fill="#ec4899"/><circle cx="31.8" cy="13.5" r="1.6" fill="#ec4899"/>`,
      `<path d="M9 16c0-9 5-13 11-13s11 4 11 13c-3-5-7-6-11-6s-8 1-11 6z" fill="${h}"/><path d="M31 8 Q42 10 39 28 Q35 21 31 17Z" fill="${h}"/><circle cx="31.5" cy="9" r="1.7" fill="#ec4899"/>`,
      `<path d="M8 16C8 6 14 3 20 3S32 6 32 16V25Q30 27 28 23V14C24 10 16 10 12 14V23Q10 27 8 25Z" fill="${h}"/>`,
      `<path d="M17 11 L18 3 Q20 -3 22 3 L23 11Z" fill="${h}"/><path d="M10 14 C10 11 14 9 17 10 L17 13 C14 11 12 12 10 14Z" fill="${h}" opacity=".5"/>`,
      `<path d="M8.6 15C7.6 5 19 -1 30 5.5C33.4 7.6 32.4 12 31.4 15C29 10 24 8 18 9C14 9 11 11 8.6 15Z" fill="${h}"/>`,
      `<path d="M9 16c0-9 5-13 11-13s11 4 11 13l1 12c-3 0-4-3-4-7-3-2.6-6-4-8-4s-5 1.4-8 4c0 4-1 7-4 7z" fill="${h}"/><g fill="${h}"><circle cx="33" cy="26" r="2.7"/><circle cx="33.6" cy="31" r="2.7"/><circle cx="33" cy="36" r="2.5"/></g><rect x="31" y="38" width="4" height="2" rx="1" fill="#ec4899"/>`,
      `<ellipse cx="14.5" cy="8.5" rx="3" ry="1.5" fill="#fff" opacity=".35"/>`,
    ][st];
  }

  function eyesMarkup(k) {
    return [
      '<circle cx="16" cy="18.5" r="1.7" fill="#1f2937"/><circle cx="24" cy="18.5" r="1.7" fill="#1f2937"/>',
      '<ellipse cx="16" cy="18.4" rx="2.5" ry="3" fill="#fff"/><ellipse cx="24" cy="18.4" rx="2.5" ry="3" fill="#fff"/><circle cx="16.3" cy="18.8" r="1.7" fill="#1f2937"/><circle cx="24.3" cy="18.8" r="1.7" fill="#1f2937"/><circle cx="16.9" cy="17.9" r=".6" fill="#fff"/><circle cx="24.9" cy="17.9" r=".6" fill="#fff"/>',
      '<path d="M13.6 19.8 Q16 16 18.4 19.8M21.6 19.8 Q24 16 26.4 19.8" stroke="#1f2937" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
      '<path d="M13.6 18.8h4.6M21.8 18.8h4.6" stroke="#1f2937" stroke-width="1.7" stroke-linecap="round"/><path d="M13.6 18.8l-1.2 1.4M18.2 18.8l1 1.4M21.8 18.8l-1 1.4M26.4 18.8l1.2 1.4" stroke="#1f2937" stroke-width=".8"/>',
      '<path d="M16 20.4C12.8 17.8 14.4 15.6 16 17.2C17.6 15.6 19.2 17.8 16 20.4Z" fill="#ef4444"/><path d="M24 20.4C20.8 17.8 22.4 15.6 24 17.2C25.6 15.6 27.2 17.8 24 20.4Z" fill="#ef4444"/>',
      '<circle cx="16" cy="18.5" r="1.7" fill="#1f2937"/><path d="M21.6 19.6 Q24 16.4 26.4 19.6" stroke="#1f2937" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    ][k];
  }
  function browsMarkup(k, h) {
    const c = darken(h, 0.7);
    return [
      '',
      `<path d="M13.4 14.4 Q16 12.8 18.6 14.1M21.4 14.1 Q24 12.8 26.6 14.4" stroke="${c}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`,
      `<path d="M13.2 14.2 Q16 12.4 18.8 13.8M21.2 13.8 Q24 12.4 26.8 14.2" stroke="${c}" stroke-width="2.1" fill="none" stroke-linecap="round"/>`,
      `<path d="M13.4 12.6 L18.6 14.6M26.6 12.6 L21.4 14.6" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    ][k];
  }
  function mouthMarkup(k) {
    return [
      '<path d="M17 23.5q3 2.6 6 0" stroke="#7c3a2a" fill="none" stroke-width="1.4" stroke-linecap="round"/>',
      '<path d="M15.8 22.4 Q20 28.6 24.2 22.4Z" fill="#fff" stroke="#7c3a2a" stroke-width="1.2" stroke-linejoin="round"/>',
      '<path d="M17.4 24.2 Q21 25.8 24.2 22.8" stroke="#7c3a2a" fill="none" stroke-width="1.4" stroke-linecap="round"/>',
      '<path d="M17.6 24.2h4.8" stroke="#7c3a2a" stroke-width="1.5" stroke-linecap="round"/>',
      '<path d="M16.6 23 Q20 26.6 23.4 23" stroke="#7c3a2a" fill="none" stroke-width="1.4" stroke-linecap="round"/><path d="M18.6 24.6 Q20 28.4 21.6 24.6Z" fill="#f472b6"/>',
      '<ellipse cx="20" cy="24.4" rx="1.7" ry="2.1" fill="#7c3a2a"/>',
    ][k];
  }
  function extraMarkup(k, h) {
    return [
      '',
      '<g fill="#a0522d" opacity=".55"><circle cx="13.5" cy="21.6" r=".7"/><circle cx="15.8" cy="22.8" r=".7"/><circle cx="12.6" cy="23.6" r=".7"/><circle cx="26.5" cy="21.6" r=".7"/><circle cx="24.2" cy="22.8" r=".7"/><circle cx="27.4" cy="23.6" r=".7"/></g>',
      `<path d="M9.5 19 Q9 31 20 31.5 Q31 31 30.5 19 Q28.6 26.6 20 26.6 Q11.4 26.6 9.5 19Z" fill="${h}"/>`,
      '<circle cx="12.5" cy="21.2" r="3.4" fill="#f87171" opacity=".5"/><circle cx="27.5" cy="21.2" r="3.4" fill="#f87171" opacity=".5"/>',
      '<path d="M26 15.6 L29 21.6" stroke="#b91c1c" stroke-width="1.1" stroke-linecap="round"/><path d="M25.2 17.4h1.8M26.6 19.6h1.8" stroke="#7f1d1d" stroke-width=".8"/>',
    ][k];
  }

  // Bədən: geyim tipinə görə (0 köynək, 1 kapüşonlu, 2 don, 3 kostyum, 4 kombinezon, 5 forma)
  function bodyMarkup(o, shirt, skin, pants) {
    const dk = darken(shirt, 0.82);
    const lightInner = '#f1f5f9';
    const arms = (col) => `<ellipse cx="6.5" cy="39" rx="4.2" ry="9" fill="${col}"/><ellipse cx="33.5" cy="39" rx="4.2" ry="9" fill="${col}"/><circle cx="6.5" cy="47" r="3.4" fill="${skin}"/><circle cx="33.5" cy="47" r="3.4" fill="${skin}"/>`;
    const legs = (col) => `<g class="vc-legs"><rect class="vc-l" x="11.5" y="47" width="7" height="15" rx="3.5" fill="${col}"/><rect class="vc-r" x="21.5" y="47" width="7" height="15" rx="3.5" fill="${col}"/></g><ellipse cx="15" cy="61.6" rx="5" ry="2.4" fill="#1f2937"/><ellipse cx="25" cy="61.6" rx="5" ry="2.4" fill="#1f2937"/>`;
    const shade = '<path d="M8 42h24v4a9 9 0 0 1-9 7h-6a9 9 0 0 1-9-7z" fill="rgba(0,0,0,.14)"/>';
    switch (o) {
      case 1:
        return `${legs(pants)}${arms(shirt)}<rect x="7.5" y="27" width="25" height="26" rx="10" fill="${shirt}"/>${shade}<path d="M11.5 27.5 Q20 38 28.5 27.5 L28.5 31 Q20 42 11.5 31Z" fill="${dk}"/><rect x="13" y="42" width="14" height="8" rx="3" fill="rgba(0,0,0,.13)"/><path d="M17 33v6M23 33v6" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>`;
      case 2:
        return `<g class="vc-legs"><rect class="vc-l" x="13" y="52" width="5.4" height="10" rx="2.7" fill="${skin}"/><rect class="vc-r" x="21.6" y="52" width="5.4" height="10" rx="2.7" fill="${skin}"/></g><ellipse cx="15.7" cy="61.8" rx="4.6" ry="2.2" fill="#1f2937"/><ellipse cx="24.3" cy="61.8" rx="4.6" ry="2.2" fill="#1f2937"/>${arms(skin)}<path d="M9.5 28 H30.5 L36.5 57 Q20 61 3.5 57Z" fill="${shirt}"/><path d="M9.5 28 H30.5 L31.4 33 H8.6Z" fill="${dk}"/><path d="M8.6 33 H31.4" stroke="#fff" stroke-width="1.2" opacity=".7"/><ellipse cx="6.5" cy="33" rx="3.8" ry="4.6" fill="${shirt}"/><ellipse cx="33.5" cy="33" rx="3.8" ry="4.6" fill="${shirt}"/>`;
      case 3:
        return `${legs(pants)}${arms(shirt)}<rect x="8" y="27" width="24" height="26" rx="9" fill="${shirt}"/><path d="M15.5 27.4 L20 37 L24.5 27.4Z" fill="#fff"/><path d="M20 29 L17.8 32.6 L20 47 L22.2 32.6Z" fill="#dc2626"/><path d="M8.6 30 L16 27.6 L20 39 M31.4 30 L24 27.6 L20 39" stroke="rgba(0,0,0,.25)" stroke-width="1" fill="none"/><circle cx="20" cy="43" r="1" fill="rgba(255,255,255,.7)"/>`;
      case 4:
        return `${legs(pants)}${arms(lightInner)}<rect x="8" y="27" width="24" height="26" rx="10" fill="${lightInner}"/><path d="M12.4 27 V37 H27.6 V27 M12.4 37 V51 Q20 55 27.6 51 V37Z" fill="${pants}"/><path d="M12.4 27 L13.6 38M27.6 27 L26.4 38" stroke="${pants}" stroke-width="3"/><circle cx="13.2" cy="38.4" r="1.2" fill="#facc15"/><circle cx="26.8" cy="38.4" r="1.2" fill="#facc15"/><rect x="16.5" y="40.5" width="7" height="5" rx="1.5" fill="rgba(0,0,0,.18)"/>`;
      case 5:
        return `${legs(pants)}${arms(shirt)}<rect x="8" y="27" width="24" height="26" rx="10" fill="${shirt}"/><rect x="8" y="35" width="24" height="3.6" fill="#fff" opacity=".85"/><rect x="8" y="39.6" width="24" height="1.8" fill="#fff" opacity=".55"/><text x="20" y="51" font-size="9" font-weight="800" text-anchor="middle" fill="#fff" opacity=".95" font-family="Arial,sans-serif">7</text><path d="M8 30 H32" stroke="rgba(0,0,0,.12)" stroke-width="1"/>`;
      default:
        return `${legs(pants)}${arms(shirt)}<rect x="8" y="27" width="24" height="26" rx="10" fill="${shirt}"/>${shade}`;
    }
  }

  // ----- Hazır tiplər (kostyumlar): rənglər/forma dəyişir, üstünə öz geyim hissələri əlavə olunur -----
  const COSTUMES = {
    costume_vampire: {
      over: { skin: '#efe3e6', hairC: '#16161f', hair: 11, shirt: '#1f1f2e', pants: '#111827', outfit: 3, eyes: 0, brows: 3, mouth: 0, extra: 0 },
      back: '<path d="M5 27 L-7 65 Q20 73 47 65 L35 27Z" fill="#14141f"/><path d="M5 27 L-7 65 Q4 67 12 67 L12 27Z" fill="#7f1d1d"/><path d="M35 27 L47 65 Q36 67 28 67 L28 27Z" fill="#7f1d1d"/><path d="M7 29 L0 10 L14 24Z M33 29 L40 10 L26 24Z" fill="#14141f"/>',
      face: '<circle cx="16" cy="18.5" r="1.9" fill="#dc2626"/><circle cx="24" cy="18.5" r="1.9" fill="#dc2626"/><path d="M17.2 24 L18.5 27.6 L19.8 24Z M20.2 24 L21.5 27.6 L22.8 24Z" fill="#fff"/>',
    },
    costume_bride: {
      over: { skin: '#ffdcb5', hairC: '#7a4a22', hair: 1, shirt: '#ffffff', outfit: 2, eyes: 1, brows: 1, mouth: 0, extra: 0 },
      // Duvaq arxada: üzü və saçı örtmür
      back: '<path d="M9 10 Q20 -3 31 10 L38.5 57 Q20 64 1.5 57Z" fill="#f1f5ff" stroke="#c7d2e5" stroke-width=".9"/><path d="M13 20 L8 55M27 20 L32 55" stroke="#dbe3f3" stroke-width=".8" fill="none"/>',
      hat: '<path d="M9.4 11.4 Q20 1.4 30.6 11.4" fill="none" stroke="#3f8f4f" stroke-width="1.4" stroke-linecap="round"/><circle cx="11.4" cy="9.6" r="2.1" fill="#f9a8d4"/><circle cx="15.6" cy="6.3" r="2.3" fill="#fff" stroke="#f3c6dc" stroke-width=".5"/><circle cx="20" cy="5" r="2.5" fill="#f472b6"/><circle cx="24.4" cy="6.3" r="2.3" fill="#fff" stroke="#f3c6dc" stroke-width=".5"/><circle cx="28.6" cy="9.6" r="2.1" fill="#f9a8d4"/><circle cx="11.4" cy="9.6" r=".7" fill="#fde68a"/><circle cx="20" cy="5" r=".8" fill="#fde68a"/><circle cx="28.6" cy="9.6" r=".7" fill="#fde68a"/>',
      body: '<path d="M9.5 28 H30.5 L31.4 33 H8.6Z" fill="#f4f6fb"/><path d="M9.5 28 H30.5 L36.5 57 Q20 61 3.5 57Z" fill="none" stroke="#dde3ee" stroke-width=".9" stroke-linejoin="round"/><path d="M13 33 Q20 38 27 33" stroke="#e2e8f0" stroke-width=".9" fill="none"/><path d="M9 41 H31" stroke="#f9a8d4" stroke-width="2.2"/><path d="M20 41 V57M14 42 L10 57M26 42 L30 57" stroke="#eef1f7" stroke-width=".9" fill="none"/><path d="M3.6 56.6 Q6 59.4 8.6 57.4 Q11.2 60 14 58 Q16.8 60.4 19.6 58.4 Q22.4 60.4 25.2 58.2 Q28 60 30.6 57.4 Q33.4 59.2 36.4 56.6" fill="none" stroke="#e2e8f0" stroke-width="1.1" stroke-linecap="round"/><g><path d="M33 47 L33 53" stroke="#16a34a" stroke-width="1.4" stroke-linecap="round"/><circle cx="33" cy="45" r="2.6" fill="#ec4899"/><circle cx="35.6" cy="43.6" r="2.1" fill="#f9a8d4"/><circle cx="30.6" cy="43.6" r="2" fill="#fff" stroke="#f3c6dc" stroke-width=".5"/></g>',
    },
    costume_queen: {
      over: { skin: '#f3c79a', hairC: '#3b1d0f', hair: 1, shirt: '#7e22ce', outfit: 2, eyes: 1, brows: 1, mouth: 0, extra: 0 },
      back: '<path d="M8 28 L-1 63 Q20 70 41 63 L32 28Z" fill="#581c87"/><path d="M-1 63 Q20 70 41 63" stroke="#f8fafc" stroke-width="2.2" fill="none"/>',
      hat: '<path d="M10.4 9 L11.4 -1 L15.6 4.4 L20 -3.4 L24.4 4.4 L28.6 -1 L29.6 9Z" fill="#facc15" stroke="#b45309" stroke-width=".8" stroke-linejoin="round"/><rect x="10.4" y="7" width="19.2" height="2.8" rx="1" fill="#f59e0b" stroke="#b45309" stroke-width=".6"/><circle cx="20" cy="1.4" r="1.4" fill="#ef4444"/><circle cx="11.6" cy="1.6" r=".9" fill="#a855f7"/><circle cx="28.4" cy="1.6" r=".9" fill="#a855f7"/><circle cx="15.6" cy="8.4" r=".8" fill="#fff"/><circle cx="20" cy="8.4" r=".8" fill="#3b82f6"/><circle cx="24.4" cy="8.4" r=".8" fill="#fff"/>',
      body: '<path d="M9.5 28.4 Q20 37 30.5 28.4 L30.5 32.6 Q20 41 9.5 32.6Z" fill="#fff" stroke="#e5e7eb" stroke-width=".5"/><g fill="#1f2937"><circle cx="13.4" cy="31.6" r=".75"/><circle cx="17.2" cy="34.2" r=".75"/><circle cx="22.8" cy="34.2" r=".75"/><circle cx="26.6" cy="31.6" r=".75"/></g><path d="M9 41 H31 L31.8 43.6 H8.2Z" fill="#facc15" stroke="#b45309" stroke-width=".5"/><circle cx="20" cy="42.3" r="1.6" fill="#ef4444" stroke="#b45309" stroke-width=".5"/><path d="M20 44.6 V58M14.6 44.6 L11 57.6M25.4 44.6 L29 57.6" stroke="#6b21a8" stroke-width=".9" fill="none"/><path d="M3.6 55.2 Q20 59.4 36.4 55.2 L36.7 57.4 Q20 61.6 3.3 57.4Z" fill="#facc15" stroke="#b45309" stroke-width=".5"/>',
    },
    costume_king: {
      over: { skin: '#f3c79a', hairC: '#d1d5db', hair: 0, shirt: '#b91c1c', pants: '#1f2937', outfit: 3, eyes: 0, brows: 2, mouth: 0, extra: 2 },
      back: '<path d="M7 28 L-3 63 Q20 69 43 63 L33 28Z" fill="#b91c1c"/><path d="M-3 63 Q20 69 43 63" stroke="#f8fafc" stroke-width="3" fill="none"/>',
      hat: '<path d="M11.5 8 Q20 -1 28.5 8Z" fill="#b91c1c"/><path d="M10 8.4 L11.4 -2 L16 4.4 L20 -5 L24 4.4 L28.6 -2 L30 8.4Z" fill="#facc15" stroke="#b45309" stroke-width=".8"/><circle cx="20" cy="1.4" r="1.6" fill="#ef4444"/><circle cx="13.5" cy="3.6" r="1" fill="#3b82f6"/><circle cx="26.5" cy="3.6" r="1" fill="#22c55e"/>',
      body: '<path d="M9 28 Q20 37 31 28 L31 33 Q20 42 9 33Z" fill="#f8fafc"/><g fill="#111"><circle cx="14" cy="32" r=".8"/><circle cx="20" cy="35" r=".8"/><circle cx="26" cy="32" r=".8"/></g>',
    },
    costume_mafia: {
      over: { skin: '#f0c08e', hairC: '#111827', hair: 0, shirt: '#1b1f2a', pants: '#111827', outfit: 3, eyes: 0, brows: 3, mouth: 3, extra: 0 },
      hat: '<ellipse cx="20" cy="9.2" rx="17.5" ry="3.6" fill="#0f172a"/><path d="M10.6 9 Q10 -1.4 20 -1.4 Q30 -1.4 29.4 9Z" fill="#1f2937"/><path d="M20 -1.2 Q24 1.6 29.2 8" stroke="#0f172a" stroke-width="1" fill="none"/><rect x="10.6" y="5.2" width="18.8" height="3.4" fill="#7f1d1d"/><path d="M10.6 9.4 Q20 12.6 29.4 9.4" stroke="#475569" stroke-width=".8" fill="none"/>',
      face: '<path d="M10.6 17.2 H29.4 L28.4 21.2 Q25.6 22.6 23.4 21 L22.4 18.8 H17.6 L16.6 21 Q14.4 22.6 11.6 21.2Z" fill="#0b0f17"/><path d="M12 18.2 L15 18 M25 18 L28 18.2" stroke="#64748b" stroke-width=".8" stroke-linecap="round"/><path d="M26 25.2 L29.2 23.4" stroke="#b91c1c" stroke-width="1" stroke-linecap="round" opacity=".0"/>',
      body: '<g stroke="#6b7280" stroke-width=".55" opacity=".85" fill="none"><path d="M11.6 31 V50M14.6 31 V51M25.4 31 V51M28.4 31 V50"/></g><path d="M8.6 30 L16 27.6 L20 39 M31.4 30 L24 27.6 L20 39" stroke="#0b0f17" stroke-width="1.6" fill="none"/><path d="M12.2 37.4 H15.8 V41 H12.2Z" fill="#f8fafc"/><path d="M12.2 37.4 L14 39 L15.8 37.4" stroke="#cbd5e1" stroke-width=".5" fill="none"/><circle cx="20" cy="43" r=".9" fill="#facc15"/><circle cx="20" cy="47" r=".9" fill="#facc15"/>',
    },
    costume_commissar: {
      over: { skin: '#f0c08e', hairC: '#3b2a1a', hair: 0, shirt: '#1e3a8a', pants: '#0f172a', outfit: 3, eyes: 0, brows: 2, mouth: 0, extra: 0 },
      hat: '<path d="M8.4 10 Q8.4 1.4 20 1.4 Q31.6 1.4 31.6 10Z" fill="#1e3a8a"/><rect x="8" y="8.4" width="24" height="3.6" rx="1.4" fill="#0f172a"/><path d="M9.6 12 Q20 16 30.4 12 L29.8 10.4 Q20 13.4 10.2 10.4Z" fill="#0b1220"/><path d="M20 3.2 L21.2 5.6 L23.8 6 L21.9 7.7 L22.4 10.2 L20 9 L17.6 10.2 L18.1 7.7 L16.2 6 L18.8 5.6Z" fill="#facc15" stroke="#b45309" stroke-width=".4"/>',
      body: '<path d="M8.6 29.6 H14.4 L13.4 32.6 H8.2Z M31.4 29.6 H25.6 L26.6 32.6 H31.8Z" fill="#facc15" stroke="#b45309" stroke-width=".4"/><path d="M20 29.4 L17.6 33 L20 48 L22.4 33Z" fill="#0b1220"/><path d="M24.6 36.6 L26.4 36 L28.2 36.6 V40 Q26.4 42 24.6 40Z" fill="#facc15" stroke="#b45309" stroke-width=".5"/><circle cx="26.4" cy="38.4" r=".8" fill="#1e3a8a"/><circle cx="20" cy="42" r=".9" fill="#facc15"/><circle cx="20" cy="46" r=".9" fill="#facc15"/><rect x="9" y="47.4" width="22" height="2.4" fill="#0b1220"/><rect x="18" y="47.2" width="4" height="2.8" rx=".5" fill="#facc15"/>',
    },
    costume_villager: {
      over: { skin: '#e8b98a', hairC: '#5a3a1c', hair: 4, shirt: '#f5ecd6', pants: '#7c4a1d', outfit: 4, eyes: 0, brows: 2, mouth: 0, extra: 1 },
      back: '<path d="M33.4 62 L36.6 18" stroke="#7c4a1d" stroke-width="1.6" stroke-linecap="round"/><path d="M32 22 Q32 14 34.6 13.4 M36.6 18.4 Q36.6 11 36.8 12.4 M39.6 22 Q39.6 14 37 13.4 M32 22 H39.6" stroke="#9ca3af" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      hat: '<ellipse cx="20" cy="9" rx="18.4" ry="4.4" fill="#e7c36a" stroke="#b8923a" stroke-width=".8"/><path d="M11.4 9 Q11 .4 20 .4 Q29 .4 28.6 9Z" fill="#f0d37e" stroke="#b8923a" stroke-width=".8"/><rect x="11.2" y="5.6" width="17.6" height="3" fill="#b91c1c"/><path d="M4 9.4 Q12 12 20 12 Q28 12 36 9.4" fill="none" stroke="#b8923a" stroke-width=".6"/><g stroke="#c9a24a" stroke-width=".5"><path d="M13 3 L14 7M17 1.8 L17.4 5.4M23 1.8 L22.6 5.4M27 3 L26 7"/></g>',
      body: '<path d="M11.2 29 H13.6 L14.6 41 H11.4Z M28.8 29 H26.4 L25.4 41 H28.6Z" fill="#7c4a1d"/><rect x="14.4" y="41" width="11.2" height="7" rx="1.4" fill="#92602a" stroke="#6b4115" stroke-width=".6"/><path d="M14.4 43.6 H25.6" stroke="#6b4115" stroke-width=".5"/><circle cx="13.4" cy="29.6" r=".9" fill="#facc15"/><circle cx="26.6" cy="29.6" r=".9" fill="#facc15"/><path d="M6.4 41.6 H11 M29 41.6 H33.6" stroke="#8b5e2a" stroke-width="1.4" stroke-linecap="round"/>',
    },
    costume_ninja: {
      over: { skin: '#e8c9a0', hairC: '#111827', hair: 13, shirt: '#111827', pants: '#111827', outfit: 1, eyes: 0, brows: 3, mouth: 3, extra: 0 },
      hat: '<path d="M8 17 C8 5 14 1 20 1 S32 5 32 17 C32 12 28 9 20 9 S8 12 8 17Z" fill="#111827"/><rect x="8" y="10.4" width="24" height="3.2" fill="#dc2626"/><path d="M31 11.4 L39 8 M31 12.6 L39 17" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>',
      face: '<path d="M8.6 19.8 Q20 17.6 31.4 19.8 L31.4 29 Q20 33 8.6 29Z" fill="#111827"/><circle cx="16" cy="16.6" r="1.7" fill="#fff"/><circle cx="24" cy="16.6" r="1.7" fill="#fff"/><circle cx="16" cy="16.7" r=".9" fill="#111"/><circle cx="24" cy="16.7" r=".9" fill="#111"/>',
    },
    costume_astronaut: {
      over: { skin: '#ffdcb5', hairC: '#5a3a1c', hair: 0, shirt: '#f8fafc', pants: '#e5e7eb', outfit: 0, eyes: 1, brows: 1, mouth: 0, extra: 0 },
      back: '<rect x="3.5" y="29" width="33" height="21" rx="5" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>',
      hat: '<circle cx="20" cy="17" r="15.5" fill="rgba(186,230,253,.26)" stroke="#e2e8f0" stroke-width="2.2"/><path d="M9.6 11 Q13.4 5 20 4.6" stroke="rgba(255,255,255,.85)" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="8.6" y="29.4" width="22.8" height="4.4" rx="2.2" fill="#94a3b8"/>',
      body: '<rect x="12" y="38" width="7" height="4.6" fill="#ef4444"/><rect x="21" y="38" width="7" height="4.6" fill="#3b82f6"/><circle cx="20" cy="46" r="2" fill="#f59e0b"/>',
    },
    costume_knight: {
      over: { skin: '#f3c79a', hairC: '#5a3a1c', hair: 13, shirt: '#9ca3af', pants: '#6b7280', outfit: 0, eyes: 0, brows: 0, mouth: 0, extra: 0 },
      // Dəmir dəbilqə: açıq üz, burun qoruyucusu, yanaq lövhələri, qırmızı tük
      hat: '<path d="M20 .4 Q27 -10 33 -5 Q28 -3 24 3Z" fill="#dc2626"/><path d="M20 .4 Q13 -9 8 -4 Q12 -2 16 3Z" fill="#b91c1c"/><path d="M7.4 15 C7.4 4.4 13 -.6 20 -.6 S32.6 4.4 32.6 15 L32.6 19 L29.6 19 L29.6 13.4 Q20 8.2 10.4 13.4 L10.4 19 L7.4 19Z" fill="#aab2bd" stroke="#6b7280" stroke-width="1"/><path d="M12 12 C12 5 15 1.6 20 1.6" stroke="#f1f5f9" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".9"/><rect x="7.4" y="10.6" width="25.2" height="3.4" rx="1.2" fill="#8a929e" stroke="#6b7280" stroke-width=".8"/><circle cx="11" cy="12.3" r=".7" fill="#e5e7eb"/><circle cx="16" cy="12.3" r=".7" fill="#e5e7eb"/><circle cx="24" cy="12.3" r=".7" fill="#e5e7eb"/><circle cx="29" cy="12.3" r=".7" fill="#e5e7eb"/><path d="M18.9 13.6 H21.1 V21 Q20 22.4 18.9 21Z" fill="#9aa2ae" stroke="#6b7280" stroke-width=".7"/><path d="M7.4 18 L10.6 18 L11 27 Q9 28.4 7.8 25.6Z M32.6 18 L29.4 18 L29 27 Q31 28.4 32.2 25.6Z" fill="#aab2bd" stroke="#6b7280" stroke-width=".9" stroke-linejoin="round"/>',
      body: '<path d="M11.4 29 H28.6 V45 Q20 51.5 11.4 45Z" fill="#d1d5db" stroke="#9ca3af" stroke-width="1.1"/><path d="M20 29 V47" stroke="#9ca3af" stroke-width="1.2"/><circle cx="6.5" cy="36" r="4.6" fill="#9ca3af" stroke="#6b7280" stroke-width="1"/><circle cx="33.5" cy="36" r="4.6" fill="#9ca3af" stroke="#6b7280" stroke-width="1"/>',
    },
    costume_zombie: {
      over: { skin: '#a8c98f', hairC: '#3f4a2c', hair: 5, shirt: '#6b7280', pants: '#4b5563', outfit: 0, eyes: 0, brows: 3, mouth: 3, extra: 0 },
      face: '<circle cx="16" cy="18.5" r="3.1" fill="#fff"/><circle cx="16.5" cy="19.1" r="1.3" fill="#1f2937"/><path d="M21.8 16.4 l4.6 4.6 m0 -4.6 l-4.6 4.6" stroke="#1f2937" stroke-width="1.7" stroke-linecap="round"/><path d="M11.5 12.6 l7 -1.6 M13 10.6 v4 M16 10 v4 M19 10 v3" stroke="#374151" stroke-width="1" fill="none"/><path d="M16 24.4 h9" stroke="#14532d" stroke-width="1.5"/><path d="M18 23.4 v2.8 M21 23.4 v2.8 M24 23.4 v2.8" stroke="#14532d" stroke-width="1"/>',
      body: '<path d="M8 46 l3.4 4 3.2 -3 3.4 4.4 3.2 -3.6 3.4 3.6 3.4 -3.2 3.2 3.4 V52 H8Z" fill="#6b7280"/><circle cx="14" cy="36" r="1.4" fill="#a8c98f"/><circle cx="26" cy="41" r="1.6" fill="#a8c98f"/>',
    },
    costume_clown: {
      over: { skin: '#fff5ee', hairC: '#ef4444', hair: 6, shirt: '#facc15', pants: '#3b82f6', outfit: 4, eyes: 1, brows: 2, mouth: 1, extra: 3 },
      face: '<path d="M13 23 Q20 32 27 23" stroke="#ef4444" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="20" cy="21.4" r="3.3" fill="#ef4444"/><circle cx="19" cy="20.4" r="1" fill="rgba(255,255,255,.7)"/><path d="M16 13.8 l-2.2 -2.6 2.2 -2.6 2.2 2.6Z M24 13.8 l-2.2 -2.6 2.2 -2.6 2.2 2.6Z" fill="#3b82f6"/>',
      body: '<circle cx="20" cy="31" r="2" fill="#ef4444"/><circle cx="20" cy="38" r="2" fill="#22c55e"/>',
    },
    costume_devil: {
      over: { skin: '#e03131', hairC: '#3f0d12', hair: 5, shirt: '#7f1d1d', pants: '#450a0a', outfit: 0, eyes: 0, brows: 3, mouth: 1, extra: 0 },
      back: '<path d="M29 50 Q47 56 44 40 L49 42 L44 33 L39 43 Q40 49 29 47Z" fill="#e03131"/>',
      hat: '<path d="M9.4 11 L5.6 -4 L16 5Z M30.6 11 L34.4 -4 L24 5Z" fill="#450a0a"/>',
      face: '<circle cx="16" cy="18.5" r="1.9" fill="#fde047"/><circle cx="24" cy="18.5" r="1.9" fill="#fde047"/><circle cx="16" cy="18.5" r=".8" fill="#111"/><circle cx="24" cy="18.5" r=".8" fill="#111"/>',
    },
    costume_angel: {
      over: { skin: '#ffe9d9', hairC: '#e8c75a', hair: 1, shirt: '#ffffff', outfit: 2, eyes: 2, brows: 1, mouth: 0, extra: 3 },
      back: BACKS.back_wings,
      hat: HATS.hat_halo,
      body: '<path d="M9 40 H31" stroke="#fde68a" stroke-width="2"/>',
    },
    costume_robot: {
      over: { shirt: '#94a3b8', pants: '#64748b', outfit: 0 },
      head: '<rect x="7" y="4.4" width="26" height="22" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="1.4"/><rect x="11" y="10.4" width="18" height="9.4" rx="3" fill="#0f172a"/><circle class="rled" cx="16" cy="15" r="2.4" fill="#22d3ee"/><circle class="rled" cx="24" cy="15" r="2.4" fill="#22d3ee"/><path d="M15 23.2h10" stroke="#475569" stroke-width="1.6" stroke-linecap="round"/><path d="M20 4.4 V-1.6" stroke="#64748b" stroke-width="1.6"/><circle cx="20" cy="-2.6" r="2.1" fill="#ef4444"/><rect x="4" y="12" width="3" height="8" rx="1.5" fill="#94a3b8"/><rect x="33" y="12" width="3" height="8" rx="1.5" fill="#94a3b8"/>',
      body: '<rect x="12.6" y="35" width="14.8" height="9.4" rx="2" fill="#0f172a"/><circle cx="17" cy="39.6" r="1.5" fill="#22c55e"/><circle cx="23" cy="39.6" r="1.5" fill="#f59e0b"/>',
    },
    costume_pirate: {
      over: { skin: '#dba070', hairC: '#2b1d12', hair: 13, shirt: '#b91c1c', pants: '#1f2937', outfit: 3, eyes: 0, brows: 2, mouth: 2, extra: 2 },
      hat: '<path d="M2 11 Q20 -10 38 11 Q20 3 2 11Z" fill="#1f2937"/><path d="M2 11 Q20 3 38 11" stroke="#facc15" stroke-width="1.5" fill="none"/><circle cx="20" cy="2.4" r="2.5" fill="#f3f4f6"/><path d="M18.4 4 h3.2" stroke="#1f2937" stroke-width="1"/>',
      face: '<circle cx="24" cy="18.5" r="3.5" fill="#111827"/><path d="M9.6 10.6 L31 24" stroke="#111827" stroke-width="1.3"/><circle cx="12" cy="24" r="1.2" fill="#facc15"/>',
    },
  };

  function charSvg(i, shirtDef, look, vb) {
    look = look || {};
    const co = COSTUMES[look.costume];
    const r = resolveChar(i, shirtDef, look);
    if (co) Object.assign(r, co.over);
    let st = r.hair;
    const hatOn = look.hat || (co && co.hat);
    if (hatOn && (st === 2 || st === 3)) st = 0;
    const flat = hatOn && [5, 6, 10, 11].includes(st);
    const backM = BACKS[look.back] || (co && co.back) || '';
    const hatM = HATS[look.hat] || (co && co.hat) || '';
    const faceM = FACES[look.face] || (co && co.face) || '';
    const head = co && co.head ? co.head : `
      <circle cx="20" cy="17" r="11.5" fill="${r.skin}"/>
      <circle cx="12.5" cy="21" r="2.2" fill="rgba(244,114,114,.35)"/><circle cx="27.5" cy="21" r="2.2" fill="rgba(244,114,114,.35)"/>
      ${r.extra === 2 ? extraMarkup(2, r.hairC) : ''}
      ${flat ? `<g transform="translate(0 5.5) scale(1 .62)">${hairMarkup(st, r.hairC, r.shirt)}</g>` : hairMarkup(st, r.hairC, r.shirt)}
      <g class="vc-face">${eyesMarkup(r.eyes)}${browsMarkup(r.brows, r.hairC)}${mouthMarkup(r.mouth)}</g>
      <g class="vc-x"><path d="M13.8 16.3l4.4 4.4m0-4.4l-4.4 4.4M21.8 16.3l4.4 4.4m0-4.4l-4.4 4.4" stroke="#1f2937" stroke-width="1.6" stroke-linecap="round"/><path d="M17 25q3-2 6 0" stroke="#7c3a2a" fill="none" stroke-width="1.4" stroke-linecap="round"/></g>
      ${r.extra && r.extra !== 2 ? extraMarkup(r.extra, r.hairC) : ''}`;
    return `<svg class="vc" viewBox="${vb || '0 0 40 66'}" aria-hidden="true">
      <ellipse class="vc-sh" cx="20" cy="63" rx="12" ry="3"/>
      ${backM}
      ${bodyMarkup(r.outfit, r.shirt, r.skin, r.pants)}
      ${co && co.body ? co.body : ''}
      ${head}
      ${faceM}${hatM}
    </svg>`;
  }

  // Redaktor üçün kiçik şəkillər: seçimi dəyişib başın / bədənin hissəsini göstərir
  function thumb(key, idx, cur) {
    const ch = { ...cur, [key]: idx };
    const body = key === 'outfit' || key === 'pants';
    return `<span class="thumb">${charSvg(1, '#3b82f6', { char: ch }, body ? '0 24 40 42' : '3 -2 34 36')}</span>`;
  }

  function petHtml(look) {
    return look && look.pet ? PetArt.html(look.pet) : '';
  }

  function treeG(x, y, sc = 1, c1 = '#2f9e44', c2 = '#40c057') {
    return `<g transform="translate(${x} ${y}) scale(${sc})"><ellipse cx="0" cy="3.6" rx="5" ry="1.6" fill="rgba(0,0,0,.2)"/><rect x="-0.9" y="-3" width="1.8" height="6" rx=".8" fill="#7c4a1d"/><circle cx="0" cy="-6" r="4.6" fill="${c1}"/><circle cx="-2.6" cy="-4" r="3.3" fill="${c1}"/><circle cx="2.6" cy="-4" r="3.3" fill="${c1}"/><circle cx="-1" cy="-7.4" r="2.8" fill="${c2}"/></g>`;
  }

  // Arxa fon: çəmən, yollar, meydan, ağaclar, çiçəklər (mərkəz boşdur)
  function backgroundSvg(n) {
    let roads = '';
    for (let i = 0; i < n; i++) {
      const d = doorPos(i, n);
      roads += `<path d="M50 50 L${d.x} ${d.y}" />`;
    }
    let flowers = '';
    const cols = ['#fff', '#fde047', '#f9a8d4', '#fca5a5'];
    for (let k = 0; k < 46; k++) {
      const x = (k * 37 + 11) % 97 + 1.5, y = (k * 53 + 7) % 93 + 2;
      if (Math.hypot((x - 50) / 24, (y - 50) / 22) < 1) continue;
      flowers += `<circle cx="${x}" cy="${y}" r=".55" fill="${cols[k % 4]}"/>`;
    }
    return `<svg class="vil-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="vgrass" cx="50%" cy="48%" r="75%"><stop offset="0" stop-color="#9be15d"/><stop offset=".7" stop-color="#6cc24a"/><stop offset="1" stop-color="#4aa23a"/></radialGradient>
        <radialGradient id="vplaza" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#f3e5bd"/><stop offset="1" stop-color="#e0cc9a"/></radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#vgrass)"/>
      <g stroke="#cdb88a" stroke-width="3.4" stroke-linecap="round" fill="none" opacity=".95">${roads}</g>
      <g stroke="#e8d7ad" stroke-width="2.2" stroke-linecap="round" fill="none">${roads}</g>
      ${flowers}
      <ellipse cx="50" cy="50" rx="25" ry="22.5" fill="#cdb88a"/>
      <ellipse cx="50" cy="50" rx="24" ry="21.5" fill="url(#vplaza)"/>
      <ellipse cx="50" cy="50" rx="17.5" ry="15.5" fill="none" stroke="rgba(150,120,70,.28)" stroke-width=".5" stroke-dasharray="1.5 1.5"/>
      <ellipse cx="50" cy="50" rx="7" ry="6.3" fill="none" stroke="rgba(150,120,70,.22)" stroke-width=".5"/>
      <circle cx="50" cy="50" r="1.1" fill="rgba(150,120,70,.35)"/>
      ${treeG(7, 12, 1.5)}${treeG(94, 10, 1.3, '#2b8a3e', '#51cf66')}${treeG(5, 90, 1.4, '#37b24d', '#69db7c')}${treeG(95, 91, 1.5)}
      ${treeG(50, 5, 1)}${treeG(50, 97, 1)}
    </svg>`;
  }

  const lookOfId = (room, id) => (player(room, id) || {}).look || null;

  function buildScene(room, g) {
    const n = g.players.length;
    const el = document.createElement('div');
    el.className = 'vil-scene';
    let html = `${backgroundSvg(n)}<div class="vil-dark"></div><div class="vil-sun"></div><div class="vil-moon"></div><div class="vil-spot"></div><div class="vil-flash"></div>
      <svg class="vil-gallows" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="97" rx="48" ry="4" fill="rgba(0,0,0,.25)"/><rect x="2" y="86" width="96" height="10" rx="2" fill="#8b5e3c"/><path d="M12 86v10M26 86v10M40 86v10M54 86v10M68 86v10M82 86v10" stroke="#6f4a2e" stroke-width="1.2"/><rect x="50" y="86" width="22" height="3" fill="#3b2412"/><rect x="6" y="8" width="9" height="80" rx="2" fill="#7a5230"/><rect x="6" y="8" width="70" height="9" rx="2" fill="#8b5e3c"/><path d="M15 36 L38 17" stroke="#7a5230" stroke-width="6" fill="none"/><path d="M66 17 L66 30" stroke="#d6b88a" stroke-width="2.4"/><path d="M62 30 Q66 36 70 30" stroke="#d6b88a" stroke-width="2" fill="none"/></svg>`;
    g.players.forEach((p, i) => {
      const h = homePos(i, n);
      const look = lookOfId(room, p.id);
      html += `<div class="vil-house" data-h="${p.id}" style="left:${h.x}%;top:${h.y}%">${houseSvg(ROOFS[i % ROOFS.length], look && look.house)}
        <div class="vil-grave">🪦</div><div class="vil-label"></div></div>`;
    });
    g.players.forEach((p, i) => {
      const d = doorPos(i, n);
      const look = lookOfId(room, p.id);
      html += `<div class="vil-char" data-c="${p.id}" style="left:${d.x}%;top:${d.y}%">${charSvg(i, ROOFS[(i + 3) % ROOFS.length], look)}${petHtml(look)}<span class="vil-tag"></span><span class="vil-rope"></span></div>`;
    });
    el.innerHTML = html;
    return el;
  }

  // ----- Ölüm effektləri (SVG illüstrasiya, emoji deyil) -----
  const GLOW = '<defs><filter id="fxglow" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="fxblur"><feGaussianBlur stdDeviation="3"/></filter></defs>';
  const FXSVG = {
    plain: () => `<svg viewBox="0 0 100 100"><g class="puff" fill="#e5e7eb"><circle cx="38" cy="62" r="16"/><circle cx="58" cy="58" r="19"/><circle cx="48" cy="44" r="15"/><circle cx="70" cy="68" r="12"/></g></svg>`,
    lightning: () => `<svg viewBox="0 0 100 320" preserveAspectRatio="none">${GLOW}
      <g class="lcloud" fill="#2b3350"><ellipse cx="50" cy="12" rx="46" ry="14"/><ellipse cx="22" cy="20" rx="22" ry="12"/><ellipse cx="78" cy="20" rx="22" ry="12"/></g>
      <path class="bolt b1" d="M56 18 L38 78 L62 86 L32 168 L58 176 L44 300" fill="none" stroke="#a5d8ff" stroke-width="15" stroke-linejoin="round" opacity=".55" filter="url(#fxglow)"/>
      <path class="bolt b1" d="M56 18 L38 78 L62 86 L32 168 L58 176 L44 300" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
      <path class="bolt b2" d="M32 168 L10 212 L24 218 L4 270" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round" filter="url(#fxglow)"/>
      <path class="bolt b2" d="M62 86 L84 126 L72 132 L92 176" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" filter="url(#fxglow)"/>
      <ellipse class="scorch" cx="46" cy="308" rx="30" ry="7" fill="#1c1917"/><circle class="spark" cx="46" cy="304" r="18" fill="#fff7c2" filter="url(#fxblur)"/></svg>`,
    meteor: () => `<svg viewBox="0 0 100 100" overflow="visible">${GLOW}
      <defs><radialGradient id="rockg" cx="40%" cy="38%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#e8590c"/><stop offset="1" stop-color="#5c1d06"/></radialGradient><linearGradient id="tailg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ff922b" stop-opacity=".9"/><stop offset="1" stop-color="#fcc419" stop-opacity="0"/></linearGradient></defs>
      <ellipse class="crater" cx="50" cy="84" rx="26" ry="7" fill="#2b1b10"/>
      <g class="met"><path d="M50 50 L150 -140 L110 -150Z" fill="url(#tailg)" filter="url(#fxblur)"/><circle cx="50" cy="50" r="15" fill="url(#rockg)" filter="url(#fxglow)"/><circle cx="46" cy="46" r="4" fill="#fff3bf" opacity=".7"/></g>
      <g class="boom"><circle cx="50" cy="76" r="30" fill="#ff922b" filter="url(#fxblur)"/><circle cx="50" cy="76" r="18" fill="#fff3bf"/><circle class="ring" cx="50" cy="80" r="28" fill="none" stroke="#ffd8a8" stroke-width="3"/><g fill="#e8590c"><circle cx="20" cy="60" r="3"/><circle cx="82" cy="58" r="3.5"/><circle cx="34" cy="38" r="2.5"/><circle cx="70" cy="34" r="3"/></g></g></svg>`,
    slash: () => `<svg viewBox="0 0 100 100" overflow="visible"><defs><linearGradient id="slg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#fecaca"/></linearGradient></defs>
      <path class="sl s1" d="M6 92 Q58 62 96 2 Q72 58 6 92Z" fill="url(#slg)"/><path class="sl s2" d="M94 94 Q42 64 4 4 Q28 60 94 94Z" fill="url(#slg)"/>
      <g class="sparks" stroke="#fecaca" stroke-width="2.4" stroke-linecap="round"><path d="M50 50 L72 28M50 50 L74 58M50 50 L28 28M50 50 L26 60M50 50 L50 20"/></g></svg>`,
    poison: () => `<svg viewBox="0 0 100 100" overflow="visible"><defs><filter id="gasb"><feGaussianBlur stdDeviation="4"/></filter><linearGradient id="liq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9f56b"/><stop offset="1" stop-color="#37b24d"/></linearGradient></defs>
      <g class="flask"><path d="M-6 -16 h12 v12 l12 24 a8 8 0 0 1 -7 11 h-22 a8 8 0 0 1 -7 -11 l12 -24z" fill="#dff3ff" opacity=".8" stroke="#8ecae6" stroke-width="1.5" transform="translate(30 6)"/><path d="M13 22 h34 l5 11 a4 4 0 0 1 -4 5 h-36 a4 4 0 0 1 -4 -5z" fill="url(#liq)" transform="translate(0 4)"/><rect x="26" y="-12" width="8" height="6" rx="2" fill="#a16207"/></g>
      <path class="drip" d="M62 44 Q58 58 52 70" stroke="#69db7c" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="gas" filter="url(#gasb)" fill="#8ce99a"><circle cx="38" cy="70" r="20"/><circle cx="60" cy="64" r="22"/><circle cx="50" cy="50" r="18"/><circle cx="72" cy="76" r="15"/></g>
      <g class="skull"><circle cx="50" cy="26" r="11" fill="#f1f3f5"/><rect x="43" y="32" width="14" height="9" rx="3" fill="#f1f3f5"/><circle cx="45.5" cy="25" r="3" fill="#212529"/><circle cx="54.5" cy="25" r="3" fill="#212529"/><path d="M48 35v5M52 35v5" stroke="#212529" stroke-width="1.2"/></g></svg>`,
    piano: () => `<svg viewBox="0 0 100 100" overflow="visible"><ellipse class="pshadow" cx="50" cy="92" rx="30" ry="6" fill="rgba(0,0,0,.4)"/>
      <g class="piano"><path d="M8 52 L62 20 Q92 22 96 44 L94 56 Z" fill="#111827"/><path d="M8 52 L62 20 L70 22 L20 56Z" fill="#374151"/><rect x="6" y="52" width="90" height="12" rx="3" fill="#0b1220"/><rect x="9" y="55" width="76" height="6" fill="#f8fafc"/><g fill="#111827"><rect x="14" y="55" width="3" height="4"/><rect x="22" y="55" width="3" height="4"/><rect x="36" y="55" width="3" height="4"/><rect x="44" y="55" width="3" height="4"/><rect x="52" y="55" width="3" height="4"/><rect x="66" y="55" width="3" height="4"/></g><rect x="10" y="64" width="5" height="22" fill="#0b1220"/><rect x="82" y="64" width="5" height="22" fill="#0b1220"/><rect x="46" y="64" width="5" height="22" fill="#0b1220"/></g>
      <g class="dust" fill="#d6c7a1"><circle cx="20" cy="84" r="12"/><circle cx="48" cy="88" r="14"/><circle cx="80" cy="84" r="12"/></g>
      <g class="notes" fill="#f8fafc" font-size="16" font-family="Arial"><text x="14" y="40">♪</text><text x="76" y="34">♫</text><text x="46" y="24">♪</text></g></svg>`,
    chasm: () => `<svg viewBox="0 0 120 60" overflow="visible"><defs><radialGradient id="lava" cx="50%" cy="50%"><stop offset="0" stop-color="#fcc419"/><stop offset=".5" stop-color="#e8590c"/><stop offset="1" stop-color="#7f1d1d"/></radialGradient></defs>
      <g class="crack"><path d="M4 30 L22 22 L30 28 L46 16 L56 26 L72 14 L84 26 L100 20 L116 30 L100 42 L86 36 L72 48 L58 38 L44 50 L30 38 L18 44Z" fill="#1c1410"/><path d="M14 31 L30 26 L46 22 L58 30 L74 20 L88 30 L104 28 L92 38 L76 32 L60 42 L46 36 L30 40Z" fill="url(#lava)"/><path d="M8 30 L2 24M116 30 L122 36M46 16 L44 6M84 26 L88 14M58 38 L60 52" stroke="#3b2a1a" stroke-width="2" stroke-linecap="round"/></g>
      <g class="rubble" fill="#78716c"><circle cx="14" cy="18" r="3"/><circle cx="104" cy="16" r="4"/><circle cx="60" cy="8" r="3"/><circle cx="30" cy="52" r="3"/><circle cx="88" cy="50" r="3.5"/></g></svg>`,
    shark: () => `<svg viewBox="0 0 120 70" overflow="visible"><defs><radialGradient id="pool" cx="50%" cy="50%"><stop offset="0" stop-color="#1c7ed6"/><stop offset="1" stop-color="#74c0fc"/></radialGradient></defs>
      <ellipse class="pool" cx="60" cy="48" rx="54" ry="18" fill="url(#pool)" stroke="#e7f5ff" stroke-width="2"/><ellipse class="rip r1" cx="60" cy="48" rx="20" ry="6" fill="none" stroke="#e7f5ff" stroke-width="1.6"/><ellipse class="rip r2" cx="60" cy="48" rx="34" ry="11" fill="none" stroke="#e7f5ff" stroke-width="1.4"/>
      <path class="fin" d="M0 0 L10 -20 L22 0Z" fill="#6b7a8f" transform="translate(40 46)"/>
      <g class="shark"><path d="M20 30 Q50 -2 92 26 L110 8 L106 34 Q80 50 50 42 Q30 40 20 30Z" fill="#7a8ba0"/><path d="M26 34 Q54 46 94 32 Q80 48 50 44Z" fill="#e9eef5"/><circle cx="38" cy="26" r="2.2" fill="#111"/><path d="M24 31 l4 4 l4 -3 l4 4 l4 -3" stroke="#fff" stroke-width="1.6" fill="none"/><path d="M58 14 L66 -6 L74 14Z" fill="#6b7a8f"/></g>
      <g class="splash" fill="#e7f5ff"><circle cx="30" cy="30" r="3"/><circle cx="52" cy="20" r="2.6"/><circle cx="76" cy="26" r="3"/><circle cx="92" cy="34" r="2.4"/></g></svg>`,
    rocket: () => `<svg viewBox="0 0 60 150" overflow="visible">${GLOW}
      <g class="rflame"><path d="M22 112 Q30 150 38 112Z" fill="#ffd43b" filter="url(#fxglow)"/><path d="M25 112 Q30 138 35 112Z" fill="#ff6b6b"/></g>
      <path d="M30 4 Q46 24 46 70 L46 112 L14 112 L14 70 Q14 24 30 4Z" fill="#f8f9fa" stroke="#ced4da" stroke-width="1.2"/><path d="M30 4 Q40 14 43 28 L17 28 Q20 14 30 4Z" fill="#e03131"/><circle cx="30" cy="52" r="9" fill="#4dabf7" stroke="#adb5bd" stroke-width="2"/><circle cx="27" cy="49" r="2.6" fill="#e7f5ff"/>
      <path d="M14 84 L2 112 L14 108Z M46 84 L58 112 L46 108Z" fill="#e03131"/><rect x="20" y="108" width="20" height="6" rx="2" fill="#868e96"/>
      <g class="smoke" fill="#e9ecef"><circle cx="20" cy="130" r="9"/><circle cx="38" cy="136" r="10"/><circle cx="30" cy="148" r="12"/></g></svg>`,
    ufo: () => `<svg viewBox="0 0 120 150" overflow="visible"><defs><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff59d" stop-opacity=".95"/><stop offset="1" stop-color="#fff59d" stop-opacity=".05"/></linearGradient><linearGradient id="disc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ecef"/><stop offset="1" stop-color="#868e96"/></linearGradient></defs>
      <path class="ubeam" d="M44 30 L76 30 L112 150 L8 150Z" fill="url(#beam)"/>
      <g class="saucer"><path d="M40 18 Q60 -8 80 18Z" fill="#a5d8ff" opacity=".9"/><ellipse cx="60" cy="24" rx="52" ry="12" fill="url(#disc)" stroke="#495057" stroke-width="1.4"/><g class="ulights"><circle cx="24" cy="26" r="3" fill="#ff6b6b"/><circle cx="44" cy="31" r="3" fill="#ffd43b"/><circle cx="60" cy="33" r="3" fill="#69db7c"/><circle cx="76" cy="31" r="3" fill="#4dabf7"/><circle cx="96" cy="26" r="3" fill="#ff6b6b"/></g></g>
      <g class="ustars" fill="#fff59d"><circle cx="30" cy="90" r="2"/><circle cx="90" cy="70" r="2.4"/><circle cx="60" cy="110" r="2"/></g></svg>`,
    dragon: () => `<svg viewBox="0 0 220 120" overflow="visible">${GLOW}<defs><linearGradient id="fireg" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffd43b"/><stop offset=".5" stop-color="#ff922b"/><stop offset="1" stop-color="#e03131" stop-opacity=".2"/></linearGradient></defs>
      <g class="dragon"><path class="dw1" d="M120 44 Q150 -6 188 10 Q170 28 176 46 Q150 36 120 56Z" fill="#2b8a3e" stroke="#1b5e20" stroke-width="1.5"/><path d="M96 56 Q130 40 176 64 Q190 80 214 76 Q190 96 170 84 Q130 90 100 76Z" fill="#37b24d"/><path d="M104 74 Q140 86 172 82 Q150 96 112 88Z" fill="#b2f2bb"/><path d="M98 60 Q70 46 52 52 L40 40 L46 58 Q52 72 78 66 Q92 66 100 70Z" fill="#37b24d"/><path d="M52 52 L34 44 L38 58Z" fill="#2b8a3e"/><path d="M44 42 L40 30 L50 40Z" fill="#fcc419"/><circle cx="52" cy="52" r="3" fill="#ffe066"/><circle cx="52" cy="52" r="1.2" fill="#111"/><path class="dw2" d="M130 54 Q164 8 204 24 Q184 40 186 58 Q158 46 130 66Z" fill="#40c057" stroke="#1b5e20" stroke-width="1.5" opacity=".95"/></g>
      <g class="fire" filter="url(#fxglow)"><path d="M42 54 Q8 40 -34 70 Q-6 74 -40 96 Q10 92 40 62Z" fill="url(#fireg)"/><path d="M38 58 Q10 54 -16 72 Q8 74 -8 86 Q22 82 38 64Z" fill="#fff3bf" opacity=".85"/></g></svg>`,
  };

  const PLAN = {
    plain: { cls: [[1100, 'fall dead-face']], ghost: 3000 },
    lightning: { cls: [[480, 'zap'], [1000, 'charred'], [1300, 'fall dead-face']], ghost: 3200, flash: 'white' },
    meteor: { cls: [[1050, 'charred'], [1150, 'fall dead-face']], ghost: 3300, flash: 'red', quake: 1050 },
    slash: { cls: [[800, 'fall dead-face']], ghost: 3000, flash: 'red' },
    poison: { cls: [[800, 'green'], [1900, 'fall dead-face']], ghost: 3700 },
    piano: { cls: [[950, 'squash dead-face']], ghost: 3600, quake: 950 },
    chasm: { cls: [[1000, 'sink dead-face']], ghost: null, quake: 500, end: 3900 },
    shark: { cls: [[1450, 'sink dead-face']], ghost: null, end: 4300 },
    rocket: { cls: [[500, 'dead-face']], move: { at: 600, top: -34 }, ghost: null, end: 3600 },
    ufo: { cls: [[1000, 'abduct dead-face']], ghost: null, end: 4200 },
    dragon: { cls: [[1000, 'charred'], [1500, 'fall dead-face']], ghost: 3700, flash: 'red' },
  };

  function fx(root, kind, x, y) {
    const box = document.createElement('div');
    box.className = `vil-fx vil-fx-${kind}`;
    box.style.left = `${x}%`;
    box.style.top = `${y}%`;
    box.innerHTML = (FXSVG[kind] || FXSVG.plain)();
    root.appendChild(box);
    setTimeout(() => box.remove(), 4600);
    return box;
  }

  function screenFlash(root, cls) {
    const f = root.querySelector('.vil-flash');
    if (!f) return;
    f.className = 'vil-flash';
    void f.offsetWidth;
    f.className = `vil-flash ${cls}`;
  }

  // Gecə qətli: effekt oynayır, personaj reaksiya verir (yanır, əzilir, düşür, oğurlanır), sonra ruh qalxır
  function runKill(root, ch, kind, d, done) {
    const plan = PLAN[kind] || PLAN.plain;
    const at = (ms, fn) => setTimeout(fn, ms);
    ch.classList.remove('hidden');
    ch.classList.add('dying');
    ch.style.left = `${d.x}%`;
    ch.style.top = `${d.y}%`;
    let box = null;
    at(250, () => {
      box = fx(root, kind, d.x, d.y);
      if (plan.flash) screenFlash(root, plan.flash);
    });
    if (plan.quake) at(plan.quake, () => { root.classList.add('quake'); setTimeout(() => root.classList.remove('quake'), 700); });
    for (const [ms, cls] of plan.cls) at(ms, () => ch.classList.add(...cls.split(' ')));
    if (plan.move) at(plan.move.at, () => {
      ch.style.top = `${plan.move.top}%`;
      if (box) box.style.top = `${plan.move.top + 6}%`;
    });
    if (plan.ghost) at(plan.ghost, () => { ch.classList.remove('fall', 'squash', 'charred', 'green', 'zap'); ch.classList.add('ghost'); });
    at(plan.end || plan.ghost + 1900, done);
  }

  // Ölüm animasiyası: qovulan meydana aparılıb asılır, gecə öldürülən öz effekti ilə yıxılır
  function startDeath(id, kind, i, n) {
    const ch = scene.el.querySelector(`[data-c="${id}"]`);
    if (!ch) return;
    scene.dying[id] = true;
    const finish = () => {
      delete scene.dying[id];
      scene.done[id] = true;
      scene.el.classList.remove('exec');
      ch.classList.remove('dying', 'hang', 'fall', 'abduct', 'ghost', 'dead-face', 'squash', 'charred', 'green', 'zap', 'sink');
      ch.style.top = '';
      ch.classList.add('hidden');
      const house = scene.el.querySelector(`[data-h="${id}"]`);
      if (house) { house.classList.add('pop'); setTimeout(() => house.classList.remove('pop'), 1600); }
      if (scene.last) updateScene(...scene.last);
    };
    if (kind === 'hang') {
      ch.classList.remove('hidden');
      ch.classList.add('dying');
      scene.el.classList.add('exec');
      ch.style.left = '50%';
      ch.style.top = '53%';
      const at = (ms, fn) => setTimeout(fn, ms);
      at(1700, () => { ch.classList.add('hang', 'dead-face'); screenFlash(scene.el, 'dim'); });
      at(4700, () => { ch.classList.remove('hang'); ch.classList.add('ghost'); });
      at(6600, finish);
    } else {
      runKill(scene.el, ch, kind, doorPos(i, n), finish);
    }
  }

  function updateScene(room, g, selectedIds) {
    scene.last = [room, g, selectedIds];
    const el = scene.el;
    const n = g.players.length;
    const idx = new Map(g.players.map((p, i) => [p.id, i]));
    const night = g.phase === 'night';
    el.classList.toggle('night', night);
    el.classList.toggle('day', !night);
    const trial = g.phase === 'defense' || g.phase === 'verdict';
    el.classList.toggle('trial', trial);

    const visits = new Map();
    if (night && g.amAlive) {
      if (g.myRole === 'mafia' && g.mafiaVotes) {
        for (const [voter, target] of Object.entries(g.mafiaVotes)) visits.set(Number(voter), target);
      } else if (g.pick != null) {
        visits.set(room.me, g.pick);
      }
    }

    g.players.forEach((p) => {
      const house = el.querySelector(`[data-h="${p.id}"]`);
      const ch = el.querySelector(`[data-c="${p.id}"]`);
      const pl = player(room, p.id);
      const i = idx.get(p.id);
      house.classList.toggle('sel', selectedIds.has(p.id));
      const label = house.querySelector('.vil-label');
      const text = pl ? pl.nickname : '';
      if (label.dataset.t !== text) { label.textContent = text; label.dataset.t = text; }
      const tag = ch.querySelector('.vil-tag');
      if (tag.textContent !== text) tag.textContent = text;
      tag.dataset.app = 'profile';
      tag.dataset.arg = String(p.id);
      ch.classList.toggle('me', p.id === room.me);
      ch.classList.toggle('mate', g.myRole === 'mafia' && p.role === 'mafia' && p.id !== room.me);

      if (!p.alive) {
        if (!scene.done[p.id] && !scene.dying[p.id]) {
          const exec = g.phase === 'voteResult' && g.lastVote && g.lastVote.eliminated === p.id;
          const nk = g.phase === 'morning' && g.lastNight && g.lastNight.killed === p.id;
          if (exec) startDeath(p.id, 'hang', i, n);
          else if (nk) startDeath(p.id, killOf(lookOfId(room, p.id)), i, n);
          else scene.done[p.id] = true;
        }
        if (scene.dying[p.id]) return;
        house.classList.add('dead');
        ch.classList.add('hidden');
        return;
      }
      house.classList.remove('dead');

      let pos;
      let visible = true;
      if (night) {
        const t = visits.get(p.id);
        if (t != null && idx.has(t)) pos = doorPos(idx.get(t), n);
        else { pos = doorPos(i, n); visible = false; }
      } else if (g.phase === 'countdown' || g.phase === 'reveal') {
        pos = doorPos(i, n);
        visible = false;
      } else if (trial && g.accused === p.id) {
        pos = { x: 50, y: 56 }; // ittiham olunan ortaya çıxıb müdafiə edir
      } else {
        pos = doorPos(i, n); // gündüz hər kəs öz evinin qarşısındadır
      }
      ch.classList.toggle('accused', trial && g.accused === p.id);
      const key = `${pos.x.toFixed(1)},${pos.y.toFixed(1)}`;
      const wasVisit = ch.dataset.visit === '1';
      const isVisit = night && visits.get(p.id) != null && idx.has(visits.get(p.id));
      if (wasVisit && !isVisit) {
        // Gecə qonaq gedən səhər öz evindən çıxsın (qurbanın evindən yox)
        const home = doorPos(i, n);
        ch.style.transition = 'none';
        ch.style.left = `${home.x}%`;
        ch.style.top = `${home.y}%`;
        ch.classList.add('hidden');
        void ch.offsetWidth;
        ch.style.transition = '';
        ch.dataset.pos = `${home.x.toFixed(1)},${home.y.toFixed(1)}`;
      }
      ch.dataset.visit = isVisit ? '1' : '0';
      if (ch.dataset.pos !== key) {
        ch.classList.add('walking');
        clearTimeout(ch._wt);
        ch._wt = setTimeout(() => ch.classList.remove('walking'), 1600);
        ch.dataset.pos = key;
      }
      ch.style.left = `${pos.x}%`;
      ch.style.top = `${pos.y}%`;
      ch.classList.toggle('hidden', !visible);
    });
  }

  function mountScene(room, g, selectedIds) {
    const slotEl = document.getElementById('vil-slot');
    if (!slotEl) return;
    const sig = `${room.code}:${g.players.map((p) => p.id).join(',')}`;
    const fresh = !scene.el || scene.sig !== sig;
    if (fresh) {
      scene.el = buildScene(room, g);
      scene.sig = sig;
      scene.dying = {};
      scene.done = {};
      g.players.forEach((p) => { if (!p.alive) scene.done[p.id] = true; });
      slotEl.appendChild(scene.el);
    } else {
      slotEl.appendChild(scene.el);
      void scene.el.offsetWidth;
    }
    updateScene(room, g, selectedIds);
  }

  // ----- Mağaza və ana ekran üçün hazır parçalar -----
  function heroScene() {
    const n = 9;
    let h = `<div class="vil-scene day hero-scene">${backgroundSvg(n)}<div class="vil-sun"></div>`;
    const kinds = [null, 'house_castle', null, 'house_pagoda', null, 'house_tower', null, 'house_igloo', null];
    for (let i = 0; i < n; i++) {
      const a = homePos(i, n);
      h += `<div class="vil-house" style="left:${a.x}%;top:${a.y}%">${houseSvg(ROOFS[i % ROOFS.length], kinds[i])}</div>`;
    }
    const looks = [{ hat: 'hat_crown', pet: 'pet_dog' }, { back: 'back_cape' }, { hat: 'hat_wizard' }, { face: 'face_sun', pet: 'pet_cat' }, {}, { hat: 'hat_santa' }, { face: 'face_mustache' }, {}, { hat: 'hat_pirate' }];
    for (let i = 0; i < n; i++) {
      const a = doorPos(i, n);
      h += `<div class="vil-char idle" style="left:${a.x}%;top:${a.y}%;animation-delay:${i * 0.17}s">${charSvg(i + 2, ROOFS[(i + 5) % ROOFS.length], looks[i])}${petHtml(looks[i])}</div>`;
    }
    return h + '</div>';
  }

  // Mağazada əşyanın kiçik nümunəsi
  function sample(type, id, userLook, emoji) {
    const look = { ...(userLook || {}) };
    if (['hat', 'face', 'back', 'costume'].includes(type)) {
      look[type] = id;
      return `<span class="sample-char">${charSvg(1, '#3b82f6', look)}</span>`;
    }
    if (type === 'pet') return PetArt.sample(id);
    if (type === 'house') return `<span class="sample-house">${houseSvg('#ef4444', id)}</span>`;
    return ItemArt.icon(type, id) || `<span class="sample-badge">${emoji || ''}</span>`;
  }

  // Mağazada ev + personaj + heyvan önizləməsi (geyilmiş əşyalarla)
  function avatar(look) {
    look = look || {};
    return `<div class="avatar-card"><span class="avatar-house">${houseSvg('#ef4444', look.house)}</span><span class="avatar-char">${charSvg(1, '#3b82f6', look)}${petHtml(look)}</span></div>`;
  }

  // Ölüm effektini mağazada önizlə
  function demoDeath(kind, host) {
    host.innerHTML = `<div class="vil-scene day demo-scene">${backgroundSvg(1)}<div class="vil-flash"></div>
      <div class="vil-house" style="left:50%;top:38%">${houseSvg('#ef4444')}</div>
      <div class="vil-char" style="left:50%;top:70%">${charSvg(1, '#3b82f6', {})}</div></div>`;
    const root = host.firstElementChild;
    const ch = root.querySelector('.vil-char');
    runKill(root, ch, kind, { x: 50, y: 70 }, () => { ch.classList.add('hidden'); });
  }

  window.VillageArt = {
    hero: heroScene, sample, avatar, demoDeath, charSvg, houseSvg,
    thumb,
    CHAR: { SKIN, HAIR, SHIRTS, PANTS, N },
  };

  // ---------- Hissələr ----------

  function playerRow(room, p, opts = {}) {
    const pl = player(room, p.id) || { nickname: 'Oyunçu' };
    const me = p.id === room.me;
    const tag = opts.tag ?? (p.role ? roleName(p.role) : '');
    const inner = `
      <span class="initial sm${Look.frame(pl)}">${p.alive ? initial(pl.nickname) : '💀'}</span>
      <span class="name">${Look.name(pl)}${me ? ' <span class="tag">(sən)</span>' : ''}</span>
      ${tag ? `<span class="tag">${esc(tag)}</span>` : ''}
      ${opts.votes ? `<span class="votes">${opts.votes}</span>` : ''}
      ${opts.mark ? `<span class="tag">${opts.mark}</span>` : ''}`;
    const cls = `player${Look.row(pl)}${p.alive ? '' : ' dead'}${opts.selected ? ' selected' : ''}`;
    return opts.selectable
      ? `<button class="${cls}" data-local="select" data-id="${p.id}">${inner}</button>`
      : `<div class="${cls}">${inner}</div>`;
  }

  const playersList = (room, g, rowOpts) =>
    `<div class="players vil-list">${g.players.map((p) => playerRow(room, p, rowOpts ? rowOpts(p) : {})).join('')}</div>`;

  const myRoleChip = (g) => (g.myRole
    ? `<span class="pill vil-rolechip">${roleName(g.myRole)}</span>`
    : '');

  const deadBanner = (g) => (g.amAlive ? '' : '<div class="banner bad">💀 Sən oyundan çıxmısan. Ölülərin çatında danışa bilərsən 👻</div>');

  function nightResult(room, g) {
    const n = g.lastNight;
    if (!n) return '';
    if (n.killed != null) {
      if (n.killed === room.me) return '<div class="banner bad">💀 Bu gecə SƏNİ öldürdülər</div>';
      const role = g.players.find((p) => p.id === n.killed)?.role;
      return `<div class="banner bad">💀 Bu gecə <b>${nm(room, n.killed)}</b> öldürüldü${role ? ` · ${roleName(role)} idi` : ''}</div>`;
    }
    return n.saved
      ? '<div class="banner good">💉 Həkim kimisə xilas etdi! Heç kim ölmədi</div>'
      : '<div class="banner good">🎉 Bu gecə heç kim ölmədi</div>';
  }

  // ---------- Mərhələ panelləri ----------

  function panelCountdown(room, g) {
    return `<div class="vil-status"><h2>🏘️ Oyun başlayır…</h2><div class="big-number timer" style="font-size:56px" data-deadline="${g.deadline}" data-format="sec" data-tick="1"></div></div>`;
  }

  function panelReveal(room, g) {
    const r = ROLES[g.myRole];
    const mates = g.myRole === 'mafia'
      ? g.players.filter((p) => p.role === 'mafia' && p.id !== room.me).map((p) => nm(room, p.id))
      : [];
    return `<div class="vil-status">
      <div class="role-card ${g.myRole}">
        <div class="emoji-xl">${r.icon}</div><h1>${r.name}</h1><p>${r.text}</p>
        ${mates.length ? `<p><b>Yoldaşların:</b> ${mates.join(', ')}</p>` : ''}
      </div>
      ${g.seen ? `<p class="muted">Digərləri gözlənilir… ${g.seenCount}/${g.total}</p>`
        : '<button class="btn good" data-game=\'{"type":"seen"}\'>Hazıram</button>'}
      <p class="muted small">Gecə ${timer(g)} san. sonra başlayır</p></div>`;
  }

  function panelNight(room, g) {
    const role = g.myRole;
    const actor = g.amAlive && ['mafia', 'doctor', 'detective'].includes(role);
    if (!actor) {
      return `<div class="vil-status"><h2>🌙 Kənd yatır</h2>
        <p class="muted">${g.amAlive ? 'Səhərə qədər gözlə…' : 'Ölülərin çatında danışa bilərsən 👻'}</p>
        <p class="muted small">${timer(g)}</p>${deadBanner(g)}</div>`;
    }
    const r = ROLES[role];
    if (role === 'detective' && g.locked && g.checkResult) {
      const who = nm(room, g.checkResult.target);
      return `<div class="vil-status"><h2>${r.icon} ${r.name}</h2>
        ${g.checkResult.isMafia ? `<div class="banner bad">🔴 ${who} MAFİADIR!</div>` : `<div class="banner good">🟢 ${who} mafia deyil</div>`}
        <p class="muted small">Yadda saxla. Səhərə qədər gözlə…</p></div>`;
    }
    const options = new Set(g.options);
    const votesFor = (id) => (role === 'mafia' && g.mafiaVotes ? Object.values(g.mafiaVotes).filter((t) => t === id).length : 0);
    const rows = g.players.filter((p) => options.has(p.id)).map((p) => playerRow(room, p, {
      selectable: true,
      selected: local.selected === p.id || (local.selected == null && g.pick === p.id),
      votes: votesFor(p.id),
    })).join('');
    let hint = '';
    if (role === 'mafia') {
      const mates = Object.entries(g.mafiaVotes || {}).filter(([v]) => Number(v) !== room.me)
        .map(([v, t]) => `${nm(room, Number(v))} → ${nm(room, t)}`);
      hint = `<p class="muted small center">Yoldaşlarla çatda razılaşın.${mates.length ? '<br>' + mates.join('<br>') : ''}</p>`;
    }
    if (role === 'detective' && g.checks && g.checks.length) {
      hint = `<p class="muted small center">Əvvəlki yoxlamalar: ${g.checks.map((c) => `${nm(room, c.target)} ${c.isMafia ? '🔴' : '🟢'}`).join(', ')}</p>`;
    }
    const sel = local.selected ?? null;
    const picked = g.pick != null && (sel == null || sel === g.pick);
    return `<div class="vil-status"><h2>${r.icon} ${r.name}: ${STEP_TITLE[role]}</h2><p class="muted small">${timer(g, true)}</p></div>
      <div class="players vil-list">${rows}</div>${hint}
      ${picked ? '<p class="center muted">Seçim qəbul olundu ✅ Dəyişə bilərsən</p>'
        : `<button class="btn primary" ${sel == null ? 'disabled' : `data-game='${JSON.stringify({ type: 'target', targetId: sel })}'`}>Təsdiqlə</button>`}`;
  }

  function panelMorning(room, g) {
    return `<div class="vil-status"><h2>☀️ Səhər açıldı</h2>${nightResult(room, g)}</div>`;
  }

  function panelDiscussion(room, g) {
    const alive = g.players.filter((p) => p.alive).length;
    const ready = Object.values(g.ready || {}).filter(Boolean).length;
    const mine = !!(g.ready && g.ready[room.me]);
    return `<div class="vil-status"><h2>🗣️ Müzakirə</h2>
        <div class="big-number timer" style="font-size:44px" data-deadline="${g.deadline}" data-tick="1"></div>
        <p class="muted small">Sizcə mafia kimdir? Çatda danışın</p></div>
      ${nightResult(room, g)}${deadBanner(g)}
      ${g.amAlive ? `<button class="btn ${mine ? 'outline' : 'primary'}" data-game='{"type":"ready"}'>${mine ? '✅ Hazıram (ləğv et)' : 'Səsverməyə hazıram'} · ${ready}/${alive}</button>` : ''}`;
  }

  function panelVote(room, g) {
    const counts = {};
    for (const t of Object.values(g.votes || {})) counts[t] = (counts[t] || 0) + 1;
    const myVote = g.votes ? g.votes[room.me] : undefined;
    const voted = Object.keys(g.votes || {}).length;
    const alive = g.players.filter((p) => p.alive).length;
    const head = `<div class="vil-status"><h2>🗳️ Kimi kənddən qovuruq?</h2><p class="muted small">${timer(g, true)} · ${voted}/${alive} səs</p></div>`;
    if (!g.amAlive) {
      return `${head}${deadBanner(g)}${playersList(room, g, (p) => ({ votes: counts[p.id] || 0 }))}`;
    }
    const selected = local.selected ?? myVote ?? null;
    const rows = g.players.filter((p) => p.alive && p.id !== room.me).map((p) => playerRow(room, p, {
      selectable: true, selected: selected === p.id, votes: counts[p.id] || 0,
    })).join('');
    const changed = local.selected != null && local.selected !== myVote;
    return `${head}<div class="players vil-list">${rows}
        <button class="player${selected === 'skip' ? ' selected' : ''}" data-local="select" data-id="skip">
          <span class="initial sm">🤷</span><span class="name">Heç kimi</span>${counts.skip ? `<span class="votes">${counts.skip}</span>` : ''}</button></div>
      ${counts[room.me] ? `<p class="center muted small">Sənə qarşı ${counts[room.me]} səs var</p>` : ''}
      ${myVote !== undefined && !changed
        ? '<p class="center muted">Səsin qəbul olundu ✅ Fikrini dəyişə bilərsən</p>'
        : `<button class="btn primary" ${local.selected == null ? 'disabled' : `data-game='${JSON.stringify({ type: 'vote', targetId: local.selected })}'`}>Səs ver</button>`}`;
  }

  function panelDefense(room, g) {
    const me = g.accused === room.me;
    return `<div class="vil-status"><h2>🛡️ ${me ? 'Özünü müdafiə et!' : `${nm(room, g.accused)} özünü müdafiə edir`}</h2>
      <div class="big-number timer" style="font-size:44px" data-deadline="${g.deadline}" data-tick="1"></div>
      <p class="muted small">${me ? 'Çatda yaz: səni asmasınlar!' : 'Dinləyin. Sonra asmaq və ya bağışlamaq üçün səs verəcəksiniz.'}</p></div>`;
  }

  function panelVerdict(room, g) {
    const votes = g.verdicts || {};
    const hang = Object.values(votes).filter((x) => x === 'hang').length;
    const spare = Object.values(votes).filter((x) => x === 'spare').length;
    const voted = Object.keys(votes).length;
    const my = votes[room.me];
    const head = `<div class="vil-status"><h2>⚖️ Hökm: ${nm(room, g.accused)}</h2><p class="muted small">${timer(g, true)} · ${voted}/${g.voterCount} səs</p></div>`;
    if (!g.amAlive || room.me === g.accused) {
      return `${head}<div class="banner info">${room.me === g.accused ? 'Sənin taleyin həll olunur…' : 'Ölülər səs verə bilməz'}</div>
        <div class="verdict-row"><div class="verdict hang">🪢 ${hang}</div><div class="verdict spare">🕊️ ${spare}</div></div>`;
    }
    return `${head}<div class="verdict-row">
        <button class="verdict hang${my === 'hang' ? ' on' : ''}" data-game='{"type":"verdict","choice":"hang"}'><span>🪢</span><b>Asmaq</b><i>${hang}</i></button>
        <button class="verdict spare${my === 'spare' ? ' on' : ''}" data-game='{"type":"verdict","choice":"spare"}'><span>🕊️</span><b>Bağışla</b><i>${spare}</i></button>
      </div>${my ? '<p class="center muted small">Səsin qəbul olundu ✅ Dəyişə bilərsən</p>' : ''}`;
  }

  function panelVoteResult(room, g) {
    const v = g.lastVote;
    let html;
    if (v.eliminated != null) {
      const role = g.players.find((p) => p.id === v.eliminated)?.role;
      html = v.eliminated === room.me
        ? `<div class="banner bad">🪢 Səni asdılar (${v.hang}–${v.spare})</div>`
        : `<div class="banner bad">🪢 <b>${nm(room, v.eliminated)}</b> asıldı (${v.hang}–${v.spare})${role ? ` · ${roleName(role)} idi` : ''}</div>`;
    } else if (v.accused != null) {
      html = `<div class="banner good">🕊️ <b>${nm(room, v.accused)}</b> bağışlandı (${v.hang}–${v.spare})</div>`;
    } else {
      html = `<div class="banner info">${v.tie ? '⚖️ Səslər bərabər oldu. ' : ''}Heç kim ittiham olunmadı</div>`;
    }
    return `<div class="vil-status"><h2>📜 Nəticə</h2>${html}</div>`;
  }

  function panelOver(room, g) {
    const mafiaWon = g.winner === 'mafia';
    const myTeamWon = g.myRole && (g.myRole === 'mafia') === mafiaWon;
    return `<div class="vil-status"><div class="emoji-xl">${mafiaWon ? '🔪' : '🏆'}</div>
        <h1>${mafiaWon ? 'Mafia qalib gəldi!' : 'Kənd qalib gəldi!'}</h1>
        ${g.myRole ? `<p class="banner ${myTeamWon ? 'good' : 'bad'}">${myTeamWon ? 'Siz qazandınız 🎉' : 'Bu dəfə uduzdunuz 😅'}</p>` : ''}</div>
      <h3>Kim kim idi?</h3>${playersList(room, g)}`;
  }

  const PANELS = {
    countdown: panelCountdown, reveal: panelReveal, night: panelNight, morning: panelMorning,
    discussion: panelDiscussion, vote: panelVote, defense: panelDefense, verdict: panelVerdict, voteResult: panelVoteResult, over: panelOver,
  };

  // ---------- Çat ----------

  const PHASE_LABEL = { countdown: '🏘️ Başlayır', reveal: '🎭 Rollar', night: '🌙 Gecə', morning: '☀️ Səhər', discussion: '🗣️ Müzakirə', vote: '🗳️ Səsvermə', defense: '🛡️ Müdafiə', verdict: '⚖️ Hökm', voteResult: '📜 Nəticə', over: '🏁 Oyun bitdi' };
  const CH_LABEL = { day: '🏘️ Kənd çatı', mafia: '🔪 Mafia çatı (gizli)', dead: '👻 Ölülərin çatı' };

  function chatMsgs(room, g) {
    return (g.chat || []).map((m) => {
      if (m.from == null) return `<div class="vil-msg sys">${esc(m.text)}</div>`;
      const pl = player(room, m.from) || { nickname: m.name || 'Oyunçu' };
      const cls = m.ch === 'mafia' ? ' mafia' : m.ch === 'dead' ? ' dead' : '';
      return `<div class="vil-msg${cls}${m.from === room.me ? ' mine' : ''}"><b><button class="nick-link" data-app="profile" data-arg="${m.from}">${Look.name(pl)}</button>:</b> <span data-nt>${esc(m.text)}</span></div>`;
    }).join('');
  }

  function chatHtml(room, g) {
    const msgs = chatMsgs(room, g);
    const ch = g.chatChannel;
    const ph = ch ? 'Mesaj yaz…' : g.phase === 'night' ? 'Gecə yatırsan 🌙' : g.phase === 'defense' ? 'Müdafiəni dinləyin 🛡️' : 'İndi yazmaq olmaz';
    return `<div class="vil-chat card">
      <div class="vil-chat-head">${ch ? CH_LABEL[ch] : '🏘️ Kənd çatı'}</div>
      <div class="vil-chat-log" id="chat-log">${msgs}</div>
      <form id="chat" class="vil-chat-form" autocomplete="off">
        <input id="chat-input" name="text" maxlength="200" placeholder="${ph}" ${ch ? '' : 'disabled'} enterkeyhint="send" aria-label="Mesaj">
        <button class="btn primary small icon-only" type="submit" ${ch ? '' : 'disabled'} aria-label="Göndər">➤</button>
      </form></div>`;
  }

  // ---------- Şəxsi qeydlər (ölsən də qalır) ----------

  const NOTE_PLACEHOLDER = 'Şübhələrini, kimin nə dediyini bura yaz…';
  let noteTimer = null;
  const saveNote = () => {
    clearTimeout(noteTimer);
    noteTimer = null;
    if (typeof local.note === 'string' && App.room && App.room.game && App.room.game.amAlive) App.emit('game:action', { type: 'note', text: local.note });
  };

  function notesHtml(g) {
    const text = g.amAlive ? (local.note ?? g.notes ?? '') : (g.notes || '');
    const dead = (g.deadNotes || []).map((n) => `<div class="vil-dead-note"><b>💀 ${nm(App.room, n.id)}</b><p data-nt>${esc(n.text)}</p></div>`).join('');
    return `<div class="vil-notes card">
      <div class="vil-chat-head">📝 Qeydlərim <span class="muted small">· ${g.amAlive ? 'ölənə qədər yaza bilərsən, öləndə hamıya görünəcək' : 'öldüyün üçün artıq yaza bilmirsən'}</span></div>
      <textarea id="note-input" maxlength="3000" placeholder="${NOTE_PLACEHOLDER}" aria-label="Qeydlər" ${g.amAlive ? '' : 'readonly'}>${esc(text)}</textarea>
      ${dead ? `<div class="vil-chat-head vil-dead-head">💀 Ölənlərin qeydləri</div><div class="vil-dead-notes">${dead}</div>` : ''}
    </div>`;
  }

  document.addEventListener('input', (e) => {
    if (!e.target || e.target.id !== 'note-input') return;
    local.note = e.target.value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(saveNote, 700);
  });
  document.addEventListener('focusin', (e) => { if (e.target && e.target.id === 'note-input') local.noteFocus = true; });
  document.addEventListener('focusout', (e) => {
    if (e.target && e.target.id === 'note-input') { local.noteFocus = false; if (noteTimer) saveNote(); }
  });

  // ---------- Əsas ----------

  GameClients.village = {
    render(room) {
      const g = room.game;
      const key = `${g.phase}:${g.round}`;
      if (key !== local.key) {
        local.key = key;
        local.selected = null;
        if (g.phase !== 'reveal') local.showRole = false;
        else local.note = undefined; // yeni oyun: köhnə qeydlər silinir
      }
      const panel = (PANELS[g.phase] || (() => ''))(room, g);
      if (key !== local.tabKey) {
        local.tabKey = key;
        // Mobil: müzakirədə və ölülər üçün çat, qalanında hərəkət paneli açılır
        local.tab = (g.phase === 'discussion' || g.phase === 'morning' || g.phase === 'defense' || (!g.amAlive && g.phase !== 'over')) ? 'chat' : 'panel';
      }
      if (local.tab === 'chat') local.seen = (g.chat || []).length;
      const unread = local.tab !== 'chat' && (g.chat || []).length > (local.seen ?? 0);
      return {
        night: g.phase === 'night',
        html: `<div class="vil-layout${g.phase === 'over' ? ' over' : ''}">
          <div class="vil-stage"><div id="vil-slot"></div></div>
          <div class="vil-side" data-tab="${local.tab}">
            <div class="vil-mini">${myRoleChip(g)}<span class="vil-phase">${PHASE_LABEL[g.phase] || ''}</span>${g.deadline ? `<span class="vil-mini-timer">${timer(g)}</span>` : ''}</div>
            <div class="vil-tabs">
              <button class="vil-tab${local.tab === 'panel' ? ' on' : ''}" data-local="tab" data-id="panel">🎯 Hərəkət</button>
              <button class="vil-tab${local.tab === 'chat' ? ' on' : ''}" data-local="tab" data-id="chat">💬 Çat<i class="vil-dot"${unread ? '' : ' hidden'}></i></button>
              <button class="vil-tab${local.tab === 'notes' ? ' on' : ''}" data-local="tab" data-id="notes">📝 Qeyd</button>
            </div>
            <div class="vil-panel">${panel}</div>
            ${chatHtml(room, g)}
            ${notesHtml(g)}
          </div>
        </div>`,
      };
    },
    // App.render-dən sonra çağırılır: davamlı səhnəni yerinə qoyur
    afterRender(room) {
      const g = room.game;
      const sel = new Set();
      if (typeof local.selected === 'number') sel.add(local.selected);
      else if (g.pick != null) sel.add(g.pick);
      mountScene(room, g, sel);
      const log = document.getElementById('chat-log');
      if (log) log.scrollTop = log.scrollHeight;
      const note = document.getElementById('note-input');
      if (note && local.noteFocus) { note.focus(); note.setSelectionRange(note.value.length, note.value.length); }
    },
    // Yalnız çat dəyişəndə səhnəni yenidən çəkmədən mesajları əlavə et (yanıb-sönmə olmasın)
    updateChat(room) {
      const g = room.game;
      const log = document.getElementById('chat-log');
      if (!log) return false;
      const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
      const keep = log.scrollTop;
      log.innerHTML = chatMsgs(room, g);
      log.scrollTop = stick ? log.scrollHeight : keep;
      if (local.tab === 'chat') local.seen = (g.chat || []).length;
      const dot = document.querySelector('.vil-dot');
      if (dot) dot.hidden = !(local.tab !== 'chat' && (g.chat || []).length > (local.seen ?? 0));
      return true;
    },
    local(action, data) {
      if (action === 'tab') local.tab = ['chat', 'notes'].includes(data.id) ? data.id : 'panel';
      if (action === 'toggleRole') local.showRole = !local.showRole;
      if (action === 'select') local.selected = data.id === 'skip' ? 'skip' : Number(data.id);
    },
    leave() { scene.el = null; scene.sig = ''; },
  };
})();
