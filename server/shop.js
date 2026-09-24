// Mağaza kataloqu. Hər əşyanın görünüşü public/css/style.css-dədir:
//   name  -> .nm-<id>  (adın rəngi)
//   bg    -> .bg-<id>  (lobbidə və oyunda oyunçu sətrinin arxa fonu)
//   badge -> emoji, adın yanında göstərilir
// Qiymətlər "inno" ilə (daxili adı coins).
// Oyun mükafatları admin paneldən dəyişir (db.getRewards); bunlar ilkin dəyərlərdir.
const DEFAULT_REWARDS = { win: { points: 15, coins: 10 }, lose: { points: 5, coins: 0 } };
// Ayın sonunda reytinqin ilk 3 yerinə verilən inno (admin paneldən dəyişir)
const DEFAULT_PRIZES = [200, 100, 50];

const TYPES = [
  { id: 'name', label: 'Ad rəngi' },
  { id: 'bg', label: 'Arxa fon' },
  { id: 'badge', label: 'Nişan' },
  { id: 'frame', label: 'Çərçivə' },
  { id: 'win', label: 'Qələbə effekti' },
];

const ITEMS = [
  { id: 'emerald', type: 'name', name: 'Zümrüd', price: 30 },
  { id: 'ruby', type: 'name', name: 'Yaqut', price: 30 },
  { id: 'ocean', type: 'name', name: 'Okean', price: 50 },
  { id: 'sunset', type: 'name', name: 'Gün batımı', price: 50 },
  { id: 'gold', type: 'name', name: 'Qızıl', price: 120 },
  { id: 'neon', type: 'name', name: 'Neon', price: 150 },
  { id: 'rainbow', type: 'name', name: 'Göy qurşağı', price: 250 },
  { id: 'ice', type: 'name', name: 'Buz', price: 80 },
  { id: 'pulse', type: 'name', name: 'Nəbz', price: 180, anim: true },
  { id: 'shine', type: 'name', name: 'Parıltı', price: 220, anim: true },
  { id: 'flame', type: 'name', name: 'Od', price: 300, anim: true },

  { id: 'mint', type: 'bg', name: 'Nanə', price: 50 },
  { id: 'sky', type: 'bg', name: 'Səma', price: 50 },
  { id: 'peach', type: 'bg', name: 'Şaftalı', price: 50 },
  { id: 'midnight', type: 'bg', name: 'Gecə yarısı', price: 120 },
  { id: 'aurora', type: 'bg', name: 'Aurora', price: 200 },
  { id: 'royal', type: 'bg', name: 'Qızıl zal', price: 300 },
  { id: 'forest', type: 'bg', name: 'Meşə', price: 80 },
  { id: 'waves', type: 'bg', name: 'Dalğalar', price: 250, anim: true },
  { id: 'lava', type: 'bg', name: 'Lava', price: 320, anim: true },
  { id: 'disco', type: 'bg', name: 'Disko', price: 400, anim: true },
  { id: 'galaxy', type: 'bg', name: 'Qalaktika', price: 500, anim: true },
  { id: 'snow', type: 'bg', name: 'Qar gecəsi', price: 350, anim: true },
  { id: 'bubbles', type: 'bg', name: 'Dərinlik', price: 350, anim: true },
  { id: 'fireflies', type: 'bg', name: 'Atəşböcəkləri', price: 400, anim: true },
  { id: 'northern', type: 'bg', name: 'Qütb işığı', price: 450, anim: true },
  { id: 'nebula', type: 'bg', name: 'Dumanlıq', price: 550, anim: true },
  { id: 'meteor', type: 'bg', name: 'Meteor yağışı', price: 600, anim: true },
  { id: 'synthwave', type: 'bg', name: 'Retro dalğa', price: 600, anim: true },

  { id: 'coffee', type: 'badge', name: 'Qəhvə', emoji: '☕', price: 20 },
  { id: 'fire', type: 'badge', name: 'Alov', emoji: '🔥', price: 30 },
  { id: 'rocket', type: 'badge', name: 'Raket', emoji: '🚀', price: 40 },
  { id: 'ghost', type: 'badge', name: 'Kabus', emoji: '👻', price: 40 },
  { id: 'spy', type: 'badge', name: 'Casus', emoji: '🕵️', price: 60 },
  { id: 'crown', type: 'badge', name: 'Tac', emoji: '👑', price: 150 },
  { id: 'diamond', type: 'badge', name: 'Almaz', emoji: '💎', price: 200 },
  { id: 'dice', type: 'badge', name: 'Zər', emoji: '🎲', price: 30 },
  { id: 'target', type: 'badge', name: 'Hədəf', emoji: '🎯', price: 40 },
  { id: 'clover', type: 'badge', name: 'Yonca', emoji: '🍀', price: 50 },
  { id: 'bolt', type: 'badge', name: 'İldırım', emoji: '⚡', price: 60 },
  { id: 'tophat', type: 'badge', name: 'Silindr', emoji: '🎩', price: 80 },
  { id: 'dragon', type: 'badge', name: 'Əjdaha', emoji: '🐉', price: 120 },
  { id: 'unicorn', type: 'badge', name: 'Təkbuynuz', emoji: '🦄', price: 150 },
  { id: 'cup', type: 'badge', name: 'Kubok', emoji: '🏆', price: 300 },

  // Avatar çərçivələri (.fr-<id>): lobbidə, oyunda və profildə avatarın ətrafında
  { id: 'goldring', type: 'frame', name: 'Qızıl halqa', price: 120 },
  { id: 'icering', type: 'frame', name: 'Buz halqa', price: 150 },
  { id: 'neonring', type: 'frame', name: 'Neon halqa', price: 220, anim: true },
  { id: 'firering', type: 'frame', name: 'Alov halqa', price: 350, anim: true },
  { id: 'rainbowring', type: 'frame', name: 'Göy qurşağı halqa', price: 400, anim: true },
  { id: 'orbit', type: 'frame', name: 'Orbit', price: 500, anim: true },

  // Qələbə effektləri: oyunu udanda otaqdakı HƏR KƏSİN ekranında oynayır (public/js/effects.js)
  { id: 'hearts', type: 'win', name: 'Ürək yağışı', emoji: '❤️', price: 150, anim: true },
  { id: 'party', type: 'win', name: 'Bayram', emoji: '🎉', price: 200, anim: true },
  { id: 'goldconfetti', type: 'win', name: 'Qızıl konfeti', emoji: '✨', price: 250, anim: true },
  { id: 'money', type: 'win', name: 'Pul yağışı', emoji: '💸', price: 300, anim: true },
  { id: 'fireworks', type: 'win', name: 'Fişənglər', emoji: '🎆', price: 450, anim: true },
  { id: 'crowns', type: 'win', name: 'Tac yağışı', emoji: '👑', price: 600, anim: true },
];

const byId = new Map(ITEMS.map((i) => [i.id, i]));

// ---------- Reklam ----------
// Oyunçu inno verib ana ekranda öz elanını göstərir. Eyni anda çox elan olsa, növbə ilə fırlanır.
const AD_PLANS = [
  { id: 'day', days: 1, price: 100 },
  { id: 'days3', days: 3, price: 250 },
  { id: 'week', days: 7, price: 500 },
];
const AD_THEMES = ['indigo', 'emerald', 'amber', 'rose', 'slate'];
const AD_LIMITS = { title: 40, body: 120, maxActive: 10 };

// ---------- İnno satışı ----------
// Ödəniş WhatsApp üzərindən: oyunçu paketi seçir, hazır mesajla yazır, admin paneldən innonu əlavə edir.
const INNO_PACKS = [
  { inno: 20, price: 2 },
  { inno: 100, price: 9 },
  { inno: 500, price: 40 },
];
const WHATSAPP = process.env.PG_WHATSAPP || '994517370071'; // wa.me formatı: + və boşluqsuz
// İlk alış üçün sərfəli təklif (admin ödənişi görüb innonu əlavə edir)
const STARTER_PACK = { inno: 150, price: 5 };

// Gündəlik bonus: ardıcıl girişin 1..7-ci günü (7-dən sonra yenidən 1)
const DAILY = [5, 5, 10, 10, 15, 20, 50];

// Həftənin təklifi: hər həftə bir premium əşyaya endirim (həftə nömrəsinə görə sabit seçilir)
const DEAL_DISCOUNT = 0.3;
const DEAL_MIN_PRICE = 150;

// Bazada saxlanan {name, bg, badge} -> müştəriyə göndərilən görünüş (badge emoji ilə)
function lookView(look) {
  if (!look) return null;
  const out = {};
  for (const t of TYPES) {
    const item = look[t.id] && byId.get(look[t.id]);
    if (item) out[t.id] = t.id === 'badge' ? item.emoji : item.id;
  }
  return Object.keys(out).length ? out : null;
}

// Bakı vaxtı ilə həftə (bazar ertəsi 00:00-dan)
function weekStart(t = Date.now()) {
  const baku = t + 4 * 3600e3;
  const day = Math.floor(baku / 86400e3);
  const dow = (day + 3) % 7; // 0 = bazar ertəsi
  return (day - dow) * 86400e3 - 4 * 3600e3;
}

function weeklyDeal(t = Date.now()) {
  const start = weekStart(t);
  const pool = ITEMS.filter((i) => i.price >= DEAL_MIN_PRICE);
  const item = pool[Math.floor(start / (7 * 86400e3)) % pool.length];
  return { itemId: item.id, oldPrice: item.price, price: Math.round(item.price * (1 - DEAL_DISCOUNT) / 5) * 5, endsAt: start + 7 * 86400e3 };
}

// Əşyanın indiki qiyməti (həftənin təklifi nəzərə alınmaqla)
function priceOf(item, t = Date.now()) {
  const d = weeklyDeal(t);
  return d.itemId === item.id ? d.price : item.price;
}

module.exports = {
  DEFAULT_REWARDS, DEFAULT_PRIZES, TYPES, ITEMS, byId, lookView, AD_PLANS, AD_THEMES, AD_LIMITS, INNO_PACKS, WHATSAPP,
  STARTER_PACK, DAILY, weeklyDeal, priceOf,
};
