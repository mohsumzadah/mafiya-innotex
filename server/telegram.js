// Telegram bot: inno sifarişləri admin tərəfində.
//  1) Oyunçu sifariş yaradır -> bot admin söhbətinə "ödəniş linki gözləyir" mesajı atır
//  2) Admin həmin mesaja Reply edib ödəniş linkini yazır -> link oyunçunun ekranında "Ödə" düyməsi olur
//  3) Oyunçu "Ödədim" basır -> admin mesajında ✅ / ❌ düymələri çıxır
//  4) Admin ✅ basır -> inno hesaba yazılır (yalnız bir dəfə), oyunçuya bildiriş gedir
// Yalnız PG_TG_CHAT söhbətindən gələn Reply/düymələr qəbul olunur. Başqa söhbət yalnız /start ilə öz chat ID-sini öyrənir.
// Sonradan Epoint qoşulanda 2-ci addım avtomatik ödəniş linki ilə əvəz olunacaq (provider sütunu).
const db = require('./db');

const TOKEN = process.env.PG_TG_TOKEN || '';
const CHAT = String(process.env.PG_TG_CHAT || '').trim();
const API = `https://api.telegram.org/bot${TOKEN}`;
const LINK_RE = /https:\/\/[^\s<>"']{4,480}/i;

const enabled = () => !!(TOKEN && CHAT);

async function call(method, body, timeoutMs = 15000) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await r.json().catch(() => ({}));
  if (!data.ok) throw new Error(`${method}: ${data.description || r.status}`);
  return data.result;
}

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const money = (n) => `${Number(n).toFixed(2).replace(/\.00$/, '')} AZN`;

function orderText(o, nickname, state) {
  const head = o.starter ? '🔥 Başlanğıc paketi' : '🪙 İnno sifarişi';
  const lines = [`${head} #${o.id}`, `Oyunçu: <b>${esc(nickname)}</b>`, `Paket: <b>${o.inno} inno</b> · <b>${money(o.price)}</b>`];
  if (state) lines.push('', state);
  return lines.join('\n');
}

let notify = () => {}; // (userId, paid) => oyunçuya "inno:changed" göndər; index.js təyin edir

const nickOf = (userId) => db.nicknameOf(userId) || `#${userId}`;

// ---------- Oyunçu tərəfi (HTTP API-dən çağırılır) ----------

async function sendRequest(order, nickname) {
  const msg = await call('sendMessage', {
    chat_id: CHAT,
    parse_mode: 'HTML',
    text: orderText(order, nickname, '💳 Ödəniş linki gözləyir.\nBu mesaja <b>Reply</b> edib linki yazın (https://...).'),
    reply_markup: { inline_keyboard: [[{ text: '🚫 Ləğv et', callback_data: `cancel:${order.id}` }]] },
  });
  db.updateInnoOrder(order.id, { tgMsgId: msg.message_id });
}

async function sendClaim(order, nickname) {
  const msg = await call('sendMessage', {
    chat_id: CHAT,
    parse_mode: 'HTML',
    reply_to_message_id: order.tgMsgId || undefined,
    text: orderText(order, nickname, '🔔 Oyunçu <b>«Ödədim»</b> basdı. Ödəniş hesaba gəlibmi?'),
    reply_markup: { inline_keyboard: [[
      { text: '✅ Ödəniş gəldi', callback_data: `ok:${order.id}` },
      { text: '❌ Gəlməyib', callback_data: `no:${order.id}` },
    ]] },
  });
  db.updateInnoOrder(order.id, { tgClaimId: msg.message_id });
}

async function sendInfo(text) {
  if (!enabled()) return;
  try { await call('sendMessage', { chat_id: CHAT, parse_mode: 'HTML', text }); } catch (e) { console.error('telegram:', e.message); }
}

// Oyunçu sifarişi ləğv edəndə admin mesajını yenilə
async function markCancelled(order, nickname, who) {
  if (!enabled() || !order.tgMsgId) return;
  try {
    await call('editMessageText', { chat_id: CHAT, message_id: order.tgMsgId, parse_mode: 'HTML', text: orderText(order, nickname, `🚫 Ləğv olundu (${who})`) });
  } catch (e) { console.error('telegram:', e.message); }
}

// ---------- Admin tərəfi (gələn mesajlar və düymələr) ----------

async function onMessage(m) {
  const chatId = String(m.chat && m.chat.id);
  const text = String(m.text || '').trim();
  if (/^\/start\b/.test(text)) {
    await call('sendMessage', { chat_id: chatId, text: `Sənin chat ID-n: ${chatId}` });
    return;
  }
  if (chatId !== CHAT || !m.reply_to_message) return;
  const order = db.innoOrderByMsg(m.reply_to_message.message_id);
  if (!order) return;
  const link = (text.match(LINK_RE) || [])[0];
  if (!link) {
    await call('sendMessage', { chat_id: CHAT, reply_to_message_id: m.message_id, text: '⚠️ Link tapılmadı. https:// ilə başlayan link yazın.' });
    return;
  }
  if (!['requested', 'link_sent'].includes(order.status)) {
    await call('sendMessage', { chat_id: CHAT, reply_to_message_id: m.message_id, text: '⚠️ Bu sifariş artıq bu mərhələdə deyil.' });
    return;
  }
  db.updateInnoOrder(order.id, { payLink: link, status: 'link_sent' });
  notify(order.userId);
  await call('sendMessage', { chat_id: CHAT, reply_to_message_id: m.message_id, text: `✅ Link ${nickOf(order.userId)} üçün göndərildi.` });
}

async function onCallback(cb) {
  const answer = (text) => call('answerCallbackQuery', { callback_query_id: cb.id, text, show_alert: false }).catch(() => {});
  if (!cb.message || String(cb.message.chat.id) !== CHAT) return answer();
  const [action, idStr] = String(cb.data || '').split(':');
  const id = Number(idStr);
  const order = db.innoOrder(id);
  if (!order) return answer('Sifariş tapılmadı');
  const nick = nickOf(order.userId);
  const edit = (state, keep) => call('editMessageText', {
    chat_id: CHAT, message_id: cb.message.message_id, parse_mode: 'HTML', text: orderText(order, nick, state),
    reply_markup: keep ? undefined : { inline_keyboard: [] },
  }).catch(() => {});

  if (action === 'ok') {
    const r = db.confirmInnoOrder(id);
    if (r.error) { await answer(r.error); return edit(`ℹ️ ${r.error}`); }
    notify(order.userId, true);
    await answer('Inno hesaba yazıldı');
    return edit(`✅ Ödəniş təsdiqləndi. ${order.inno} inno ${esc(nick)} hesabına yazıldı.`);
  }
  if (action === 'no') {
    // Gəlməyib: oyunçu yenidən link ilə cəhd edə və ya ləğv edə bilər
    if (order.status !== 'claimed') return answer('Bu sifariş artıq bu mərhələdə deyil');
    db.updateInnoOrder(id, { status: 'link_sent' });
    notify(order.userId);
    await answer('Oyunçuya bildirildi');
    return edit('❌ Ödəniş görünmədi. Oyunçuya bildirildi.');
  }
  if (action === 'cancel') {
    const r = db.cancelInnoOrder(id, null);
    if (r.error) return answer(r.error);
    notify(order.userId);
    await answer('Ləğv olundu');
    return edit('🚫 Admin ləğv etdi');
  }
  return answer();
}

// ---------- Long polling ----------

let offset = 0;
let running = false;

async function loop() {
  let fails = 0;
  while (running) {
    try {
      const updates = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] }, 40000);
      fails = 0;
      for (const u of updates) {
        offset = u.update_id + 1;
        try {
          if (u.message) await onMessage(u.message);
          else if (u.callback_query) await onCallback(u.callback_query);
        } catch (e) { console.error('telegram handler:', e.message); }
      }
    } catch (e) {
      fails++;
      if (fails === 1 || fails % 20 === 0) console.error('telegram poll:', e.message);
      await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * fails)));
    }
  }
}

async function start(onChange) {
  notify = onChange || notify;
  if (!TOKEN) { console.log('Telegram: PG_TG_TOKEN yoxdur, inno sifarişləri söndürülüb'); return; }
  try {
    const me = await call('getMe');
    await call('deleteWebhook', { drop_pending_updates: false }).catch(() => {});
    console.log(`Telegram bot: @${me.username}${CHAT ? '' : ' (PG_TG_CHAT yoxdur: yalnız /start işləyir)'}`);
  } catch (e) {
    console.error('Telegram bot işə düşmədi:', e.message);
    return;
  }
  running = true;
  loop();
}

function stop() { running = false; }

module.exports = { enabled, start, stop, sendRequest, sendClaim, sendInfo, markCancelled };
