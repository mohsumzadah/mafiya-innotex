'use strict';

// Qələbə effektləri: ekran üzərində canvas. Kitabxanasız, ~3.5 saniyə.
// Effects.play(id) — mağazadakı "win" əşyasının id-si (server/shop.js); 'basic' pulsuz konfetidir.

const Effects = (() => {
  const PRESETS = {
    basic: { kind: 'confetti', colors: ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'], count: 90 },
    goldconfetti: { kind: 'confetti', colors: ['#facc15', '#fde68a', '#f59e0b', '#fff7cc', '#b45309'], count: 180, glow: true },
    hearts: { kind: 'emoji', emoji: ['❤️', '💖', '💕'], count: 45 },
    party: { kind: 'emoji', emoji: ['🎉', '🥳', '🎊', '🎈'], count: 50, mix: 'basic' },
    money: { kind: 'emoji', emoji: ['💸', '💵', '💰', '🪙'], count: 55 },
    crowns: { kind: 'emoji', emoji: ['👑', '💎', '✨'], count: 45, mix: 'goldconfetti' },
    fireworks: { kind: 'fireworks', bursts: 7 },
  };
  let canvas = null;
  let ctx = null;
  let parts = [];
  let raf = null;
  let until = 0;

  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  const rnd = (a, b) => a + Math.random() * (b - a);

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);
  }

  function confetti(p) {
    const W = innerWidth;
    for (let i = 0; i < p.count; i++) {
      parts.push({
        t: 'rect', x: rnd(0, W), y: rnd(-innerHeight * 0.6, -10), vx: rnd(-1.2, 1.2), vy: rnd(2, 5),
        w: rnd(6, 11), h: rnd(8, 16), rot: rnd(0, 6.3), vr: rnd(-0.2, 0.2), color: p.colors[i % p.colors.length], glow: p.glow,
      });
    }
  }

  function emoji(p) {
    const W = innerWidth;
    for (let i = 0; i < p.count; i++) {
      parts.push({
        t: 'emoji', ch: p.emoji[i % p.emoji.length], x: rnd(0, W), y: rnd(-innerHeight * 0.8, -20),
        vx: rnd(-0.6, 0.6), vy: rnd(2.2, 4.5), size: rnd(22, 38), rot: rnd(-0.4, 0.4), vr: rnd(-0.03, 0.03),
      });
    }
  }

  function burst(x, y) {
    const hue = rnd(0, 360);
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const sp = rnd(2, 6.5);
      parts.push({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: `hsl(${hue + rnd(-25, 25)} 95% 62%)` });
    }
  }

  function fireworks(p) {
    for (let i = 0; i < p.bursts; i++) {
      setTimeout(() => burst(rnd(innerWidth * 0.15, innerWidth * 0.85), rnd(innerHeight * 0.15, innerHeight * 0.5)), i * 380);
    }
  }

  function step() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    parts = parts.filter((q) => {
      if (q.t === 'spark') {
        q.x += q.vx; q.y += q.vy; q.vy += 0.07; q.vx *= 0.985; q.life -= 0.012;
        if (q.life <= 0) return false;
        ctx.globalAlpha = Math.max(0, q.life);
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(q.x, q.y, 2.4, 0, 6.3); ctx.fill();
        return true;
      }
      q.x += q.vx + Math.sin((now / 400) + q.y / 60) * 0.5;
      q.y += q.vy; q.rot += q.vr;
      if (q.y > innerHeight + 40) return false;
      ctx.save();
      ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.globalAlpha = now > until - 600 ? Math.max(0, (until - now) / 600) : 1;
      if (q.t === 'rect') {
        if (q.glow) { ctx.shadowColor = q.color; ctx.shadowBlur = 8; }
        ctx.fillStyle = q.color; ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h * Math.abs(Math.cos(q.rot * 2)));
      } else {
        ctx.font = `${q.size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(q.ch, 0, 0);
      }
      ctx.restore();
      return true;
    });
    ctx.globalAlpha = 1;
    if (parts.length && now < until + 2500) raf = requestAnimationFrame(step);
    else { ctx.clearRect(0, 0, innerWidth, innerHeight); raf = null; parts = []; }
  }

  function play(id) {
    const p = PRESETS[id] || PRESETS.basic;
    if (reduced()) return;
    ensureCanvas();
    until = performance.now() + 3500;
    if (p.kind === 'confetti') confetti(p);
    if (p.kind === 'emoji') emoji(p);
    if (p.kind === 'fireworks') fireworks(p);
    if (p.mix) confetti(PRESETS[p.mix]);
    if (!raf) raf = requestAnimationFrame(step);
  }

  return { play, has: (id) => id in PRESETS };
})();
window.Effects = Effects;
