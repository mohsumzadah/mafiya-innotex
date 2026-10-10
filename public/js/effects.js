'use strict';

// Qələbə effektləri: ekran üzərində canvas. Kitabxanasız, ~3.5 saniyə.
// Effects.play(id) — mağazadakı "win" əşyasının id-si (server/shop.js); 'basic' pulsuz konfetidir.

const Effects = (() => {
  const PRESETS = {
    basic: { kind: 'confetti', colors: ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'], count: 90 },
    goldconfetti: { kind: 'confetti', colors: ['#facc15', '#fde68a', '#f59e0b', '#fff7cc', '#b45309'], count: 180, glow: true },
    hearts: { kind: 'shapes', shapes: ['heart', 'heart', 'heartlight'], count: 45 },
    party: { kind: 'shapes', shapes: ['star', 'balloon', 'streamer', 'star'], count: 46, mix: 'basic' },
    money: { kind: 'shapes', shapes: ['coin', 'bill', 'coin'], count: 52 },
    crowns: { kind: 'shapes', shapes: ['crown', 'gem', 'star'], count: 40, mix: 'goldconfetti' },
    fireworks: { kind: 'fireworks', bursts: 7 },
  };
  let canvas = null;
  let ctx = null;
  let parts = [];
  let raf = null;
  let until = 0;
  let timers = [];

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

  // Emoji deyil: hər forma canvas-da çəkilir (ürək, sikkə, pul, tac, ulduz, şar, lent, qiymətli daş)
  const PALETTE = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4'];
  function shapes(p) {
    const W = innerWidth;
    for (let i = 0; i < p.count; i++) {
      const kind = p.shapes[i % p.shapes.length];
      parts.push({
        t: 'shape', kind, x: rnd(0, W), y: rnd(-innerHeight * 0.8, -20),
        vx: rnd(-0.6, 0.6), vy: rnd(2.2, 4.5), size: rnd(18, 32), rot: rnd(-0.4, 0.4), vr: kind === 'balloon' ? rnd(-0.01, 0.01) : rnd(-0.04, 0.04),
        color: PALETTE[i % PALETTE.length],
      });
    }
  }

  function drawShape(c, q) {
    const s = q.size;
    c.lineJoin = 'round'; c.lineCap = 'round';
    const heart = (fill, hl) => {
      c.beginPath();
      c.moveTo(0, s * 0.42);
      c.bezierCurveTo(-s * 0.95, -s * 0.12, -s * 0.5, -s * 0.72, 0, -s * 0.26);
      c.bezierCurveTo(s * 0.5, -s * 0.72, s * 0.95, -s * 0.12, 0, s * 0.42);
      c.closePath();
      const g = c.createLinearGradient(0, -s * 0.5, 0, s * 0.45); g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
      c.fillStyle = g; c.fill(); c.strokeStyle = hl; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.arc(-s * 0.3, -s * 0.2, s * 0.1, 0, 6.3); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
    };
    if (q.kind === 'heart') heart(['#fb7185', '#be123c'], '#9f1239');
    else if (q.kind === 'heartlight') heart(['#fbcfe8', '#f472b6'], '#db2777');
    else if (q.kind === 'coin') {
      const w = Math.abs(Math.cos(q.rot * 1.5)) * 0.9 + 0.1; // sikkə fırlananda yastılanır
      c.scale(w, 1);
      const g = c.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, 0, s * 0.5); g.addColorStop(0, '#fff3a3'); g.addColorStop(1, '#d97706');
      c.beginPath(); c.arc(0, 0, s * 0.5, 0, 6.3); c.fillStyle = g; c.fill(); c.strokeStyle = '#b45309'; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.33, 0, 6.3); c.strokeStyle = 'rgba(255,247,204,.9)'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#b45309'; c.font = `800 ${s * 0.46}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('₼', 0, 1);
    } else if (q.kind === 'bill') {
      const w = s * 1.5, h = s * 0.8;
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#86efac'); g.addColorStop(1, '#16a34a');
      c.fillStyle = g; c.strokeStyle = '#166534'; c.lineWidth = 1.2;
      c.beginPath(); if (c.roundRect) c.roundRect(-w / 2, -h / 2, w, h, 4); else c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, 0, h * 0.28, 0, 6.3); c.strokeStyle = '#dcfce7'; c.stroke();
      c.fillStyle = '#dcfce7'; c.beginPath(); c.arc(-w * 0.36, 0, 2.2, 0, 6.3); c.arc(w * 0.36, 0, 2.2, 0, 6.3); c.fill();
    } else if (q.kind === 'crown') {
      const w = s * 1.1, h = s * 0.8;
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#fde047'); g.addColorStop(1, '#d97706');
      c.beginPath();
      c.moveTo(-w / 2, h / 2); c.lineTo(-w / 2 - 2, -h / 2); c.lineTo(-w / 4, -h * 0.05); c.lineTo(0, -h / 2 - 3); c.lineTo(w / 4, -h * 0.05); c.lineTo(w / 2 + 2, -h / 2); c.lineTo(w / 2, h / 2); c.closePath();
      c.fillStyle = g; c.fill(); c.strokeStyle = '#b45309'; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = '#ef4444'; c.beginPath(); c.arc(0, -h * 0.05, 2.4, 0, 6.3); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-w * 0.3, h * 0.28, 1.6, 0, 6.3); c.arc(w * 0.3, h * 0.28, 1.6, 0, 6.3); c.fill();
    } else if (q.kind === 'gem') {
      const r = s * 0.5;
      c.beginPath(); c.moveTo(-r * 0.6, -r * 0.7); c.lineTo(r * 0.6, -r * 0.7); c.lineTo(r, -r * 0.1); c.lineTo(0, r); c.lineTo(-r, -r * 0.1); c.closePath();
      const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#a5f3fc'); g.addColorStop(1, '#0ea5e9');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#0284c7'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(-r, -r * 0.1); c.lineTo(r, -r * 0.1); c.moveTo(-r * 0.3, -r * 0.7); c.lineTo(0, -r * 0.1); c.lineTo(r * 0.3, -r * 0.7); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = .9; c.stroke();
    } else if (q.kind === 'star') {
      const R = s * 0.52, r = s * 0.22;
      c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r : R; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = q.color; c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.stroke();
    } else if (q.kind === 'balloon') {
      c.beginPath(); c.ellipse(0, -s * 0.1, s * 0.4, s * 0.5, 0, 0, 6.3); c.fillStyle = q.color; c.fill();
      c.beginPath(); c.ellipse(-s * 0.14, -s * 0.28, s * 0.09, s * 0.16, -0.5, 0, 6.3); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
      c.beginPath(); c.moveTo(-3, s * 0.4); c.lineTo(3, s * 0.4); c.lineTo(0, s * 0.33); c.closePath(); c.fillStyle = q.color; c.fill();
      c.beginPath(); c.moveTo(0, s * 0.4); c.quadraticCurveTo(-6, s * 0.7, 0, s); c.strokeStyle = 'rgba(100,116,139,.8)'; c.lineWidth = 1; c.stroke();
    } else if (q.kind === 'streamer') {
      c.beginPath(); c.moveTo(0, -s * 0.5);
      c.bezierCurveTo(s * 0.5, -s * 0.2, -s * 0.5, s * 0.1, 0, s * 0.5);
      c.strokeStyle = q.color; c.lineWidth = 4; c.stroke();
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
      timers.push(setTimeout(() => burst(rnd(innerWidth * 0.15, innerWidth * 0.85), rnd(innerHeight * 0.15, innerHeight * 0.5)), i * 380));
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
        drawShape(ctx, q);
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
    // Təkrar basılanda köhnə effekt silinir: hissəciklər yığılıb lag yaratmasın
    timers.forEach(clearTimeout); timers = [];
    parts = [];
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    until = performance.now() + 3500;
    if (p.kind === 'confetti') confetti(p);
    if (p.kind === 'shapes') shapes(p);
    if (p.kind === 'fireworks') fireworks(p);
    if (p.mix) confetti(PRESETS[p.mix]);
    if (!raf) raf = requestAnimationFrame(step);
  }

  return { play, has: (id) => id in PRESETS };
})();
window.Effects = Effects;
