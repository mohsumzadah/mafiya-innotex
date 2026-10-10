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
  // Oyun içi personaj və kənd (public/js/games/village.js)
  { id: 'costume', label: 'Hazır tip' },
  { id: 'hat', label: 'Papaq' },
  { id: 'face', label: 'Üz' },
  { id: 'back', label: 'Arxa' },
  { id: 'pet', label: 'Heyvan' },
  { id: 'house', label: 'Ev' },
  { id: 'death', label: 'Ölüm effekti' },
  { id: 'name', label: 'Ad rəngi' },
  { id: 'bg', label: 'Arxa fon' },
  { id: 'badge', label: 'Nişan' },
  { id: 'frame', label: 'Çərçivə' },
  { id: 'win', label: 'Qələbə effekti' },
];

const ITEMS = [
  // Hazır tiplər: tam geyim, aksesuar və rənglərlə hazır personaj (aşağıdakı papaq, üz və arxa aksesuarları üstünə taxmaq olar)
  { id: 'costume_villager', type: 'costume', name: 'Kəndli', price: 350 },
  { id: 'costume_mafia', type: 'costume', name: 'Mafiya', price: 650 },
  { id: 'costume_commissar', type: 'costume', name: 'Komissar', price: 650 },
  { id: 'costume_zombie', type: 'costume', name: 'Zombi', price: 450 },
  { id: 'costume_clown', type: 'costume', name: 'Təlxək', price: 450 },
  { id: 'costume_ninja', type: 'costume', name: 'Ninja', price: 550 },
  { id: 'costume_devil', type: 'costume', name: 'Şeytan', price: 550 },
  { id: 'costume_angel', type: 'costume', name: 'Mələk', price: 550, anim: true },
  { id: 'costume_pirate', type: 'costume', name: 'Quldur kapitan', price: 600 },
  { id: 'costume_robot', type: 'costume', name: 'Robot', price: 650 },
  { id: 'costume_astronaut', type: 'costume', name: 'Kosmonavt', price: 700 },
  { id: 'costume_knight', type: 'costume', name: 'Cəngavər', price: 700 },
  { id: 'costume_vampire', type: 'costume', name: 'Vampir', price: 750 },
  { id: 'costume_bride', type: 'costume', name: 'Gəlin', price: 750 },
  { id: 'costume_king', type: 'costume', name: 'Kral', price: 850 },
  { id: 'costume_queen', type: 'costume', name: 'Kraliça', price: 850 },
  // Papaqlar
  { id: 'hat_party', type: 'hat', name: 'Bayram papağı', price: 60 },
  { id: 'hat_santa', type: 'hat', name: 'Şaxta baba', price: 100 },
  { id: 'hat_top', type: 'hat', name: 'Silindr', price: 120 },
  { id: 'hat_cowboy', type: 'hat', name: 'Kovboy', price: 150 },
  { id: 'hat_wizard', type: 'hat', name: 'Sehrbaz', price: 180 },
  { id: 'hat_pirate', type: 'hat', name: 'Quldur', price: 200 },
  { id: 'hat_crown', type: 'hat', name: 'Tac', price: 300 },
  { id: 'hat_halo', type: 'hat', name: 'Mələk halqası', price: 350, anim: true },
  // Üz aksesuarları
  { id: 'face_mustache', type: 'face', name: 'Bığ', price: 60 },
  { id: 'face_nerd', type: 'face', name: 'Ağıllı eynək', price: 70 },
  { id: 'face_sun', type: 'face', name: 'Gün eynəyi', price: 80 },
  { id: 'face_clown', type: 'face', name: 'Təlxək burnu', price: 90 },
  { id: 'face_patch', type: 'face', name: 'Göz bağı', price: 100 },
  { id: 'face_mono', type: 'face', name: 'Monokl', price: 120 },
  { id: 'face_mask', type: 'face', name: 'Maska', price: 150 },
  // Arxa aksesuarlar
  { id: 'back_bag', type: 'back', name: 'Çanta', price: 80 },
  { id: 'back_cape', type: 'back', name: 'Plaş', price: 200 },
  { id: 'back_wings', type: 'back', name: 'Mələk qanadı', price: 350, anim: true },
  { id: 'back_bat', type: 'back', name: 'Yarasa qanadı', price: 350, anim: true },
  { id: 'back_jet', type: 'back', name: 'Reaktiv çanta', price: 450, anim: true },
  // Ev heyvanları (personajın yanında gəzir)
  { id: 'pet_chick', type: 'pet', name: 'Cücə', emoji: '🐥', price: 100 },
  { id: 'pet_dog', type: 'pet', name: 'İt', emoji: '🐶', price: 150 },
  { id: 'pet_cat', type: 'pet', name: 'Pişik', emoji: '🐱', price: 150 },
  { id: 'pet_bunny', type: 'pet', name: 'Dovşan', emoji: '🐰', price: 200 },
  { id: 'pet_fox', type: 'pet', name: 'Tülkü', emoji: '🦊', price: 250 },
  { id: 'pet_ghost', type: 'pet', name: 'Kiçik kabus', emoji: '👻', price: 300 },
  { id: 'pet_panda', type: 'pet', name: 'Panda', emoji: '🐼', price: 350 },
  { id: 'pet_dragon', type: 'pet', name: 'Əjdaha balası', emoji: '🐉', price: 500 },
  { id: 'pet_unicorn', type: 'pet', name: 'Təkbuynuz', emoji: '🦄', price: 600 },
  // Hazır evlər (premium)
  { id: 'house_igloo', type: 'house', name: 'İqlu', price: 400 },
  { id: 'house_tree', type: 'house', name: 'Ağac ev', price: 450 },
  { id: 'house_pagoda', type: 'house', name: 'Pagoda', price: 500 },
  { id: 'house_mill', type: 'house', name: 'Dəyirman', price: 600, anim: true },
  { id: 'house_castle', type: 'house', name: 'Şato', price: 800 },
  { id: 'house_tower', type: 'house', name: 'Qız qalası', price: 1000 },
  // Ölüm effektləri: gecə öldürüləndə evinin qarşısında oynayır, hamı görür
  { id: 'death_chasm', type: 'death', name: 'Yerin yarılması', emoji: '🌋', price: 350, anim: true },
  { id: 'death_poison', type: 'death', name: 'Zəhər', emoji: '☠️', price: 150, anim: true },
  { id: 'death_slash', type: 'death', name: 'Bıçaq zərbəsi', emoji: '🗡️', price: 150, anim: true },
  { id: 'death_lightning', type: 'death', name: 'İldırım', emoji: '⚡', price: 180, anim: true },
  { id: 'death_meteor', type: 'death', name: 'Meteor', emoji: '☄️', price: 200, anim: true },
  { id: 'death_piano', type: 'death', name: 'Düşən piano', emoji: '🎹', price: 250, anim: true },
  { id: 'death_shark', type: 'death', name: 'Köpək balığı', emoji: '🦈', price: 300, anim: true },
  { id: 'death_rocket', type: 'death', name: 'Raket', emoji: '🚀', price: 350, anim: true },
  { id: 'death_ufo', type: 'death', name: 'UFO oğurluğu', emoji: '🛸', price: 400, anim: true },
  { id: 'death_dragon', type: 'death', name: 'Əjdaha atəşi', emoji: '🐉', price: 500, anim: true },

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
// Nə qədər çox alınsa, 1 inno o qədər ucuzdur (500 inno = 15 AZN)
const INNO_PACKS = [
  { inno: 20, price: 2 },
  { inno: 50, price: 4 },
  { inno: 150, price: 8 },
  { inno: 300, price: 12 },
  { inno: 500, price: 15 },
  { inno: 1000, price: 25 },
];
const WHATSAPP = process.env.PG_WHATSAPP || '994517370071'; // wa.me formatı: + və boşluqsuz
// İlk alış üçün sərfəli təklif (admin ödənişi görüb innonu əlavə edir)
const STARTER_PACK = { inno: 150, price: 5 };

// Gündəlik bonus: ardıcıl girişin 1..7-ci günü (7-dən sonra yenidən 1)
const DAILY = [5, 5, 10, 10, 15, 20, 50];

// Dəvət bonusu: dəvət olunan oyunçu ilk oyununu (ən azı 3 nəfərlik) bitirəndə hər ikisi inno alır.
// Bir nəfər ən çox `max` dəvət üçün qazanc ala bilər.
const REFERRAL = { inviter: 15, invitee: 10, max: 10 };

// Həftənin təklifi: hər həftə bir premium əşyaya endirim (həftə nömrəsinə görə sabit seçilir)
const DEAL_DISCOUNT = 0.3;
const DEAL_MIN_PRICE = 150;

// Pulsuz personaj redaktoru: dəri, saç forması, saç rəngi, köynək (indekslər, rənglər müştəri tərəfdədir)
const CHAR_RANGES = { skin: 8, hair: 14, hairColor: 14, shirt: 16, eyes: 6, brows: 4, mouth: 6, outfit: 6, pants: 8, extra: 5 };
const CHAR_REQUIRED = ['skin', 'hair', 'hairColor', 'shirt']; // köhnə hesablar yalnız bunları saxlayır, qalanı 0 sayılır
function cleanChar(c) {
  if (!c || typeof c !== 'object') return null;
  const out = {};
  for (const [k, n] of Object.entries(CHAR_RANGES)) {
    const raw = c[k] === undefined && !CHAR_REQUIRED.includes(k) ? 0 : Number(c[k]);
    if (!Number.isInteger(raw) || raw < 0 || raw >= n) return null;
    out[k] = raw;
  }
  return out;
}

// Bazada saxlanan {name, bg, badge} -> müştəriyə göndərilən görünüş (badge emoji ilə)
function lookView(look) {
  if (!look) return null;
  const out = {};
  for (const t of TYPES) {
    const item = look[t.id] && byId.get(look[t.id]);
    if (item) out[t.id] = t.id === 'badge' ? item.emoji : item.id;
  }
  const ch = cleanChar(look.char);
  if (ch) out.char = ch;
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
  DEFAULT_REWARDS, DEFAULT_PRIZES, TYPES, ITEMS, byId, lookView, cleanChar, AD_PLANS, AD_THEMES, AD_LIMITS, INNO_PACKS, WHATSAPP,
  STARTER_PACK, DAILY, REFERRAL, weeklyDeal, priceOf,
};
