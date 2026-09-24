// Söyüş filtri: reklam mətnləri və nickname-lər üçün (az / ru / en).
// Mətn əvvəlcə sadə latın formasına salınır: kiril -> latın, ə -> e, ş -> sh, rəqəm əvəzləri (0 -> o, 3 -> e ...),
// hərf-hərf yazılmış sözlər birləşdirilir ("f.u.c.k", "с у к а" -> "fuck", "suka"), sonra iki cür yoxlanılır:
//   STEMS — mənası birmənalı köklər; sözün içində də axtarılır, təkrar hərflər silinmiş formada da ("fuuuck")
//   WORDS — qısa və ya adi sözlərin içində rast gələn köklər (komanda -> "manda"); yalnız söz sərhədində
// Siyahıya söz əlavə etmək üçün sadəcə latın formasında yazın.

const STEMS = [
  // az
  'qehbe', 'gehbe', 'qahba', 'peyser', 'peysher', 'dalbayob', 'dolbayob', 'amciq', 'amchiq', 'gijdillaq', 'gijdilaq',
  'qijdillaq', 'fahishe', 'ogrash', 'qanciq', 'qanchiq', 'sikim', 'sikdir', 'sikish', 'sikib', 'sikey', 'sikerem',
  'sikdim', 'sikim', 'anavi sik', 'ananisik', 'bacivi', 'gotveren', 'gotunu', 'yarrak', 'yaraq ye',
  // ru (translit)
  'pizd', 'yobany', 'blyat', 'blyad', 'mudak', 'mudil', 'pidor', 'pidar', 'nahuy', 'nahui', 'pohuy', 'pohui',
  'pidoras', 'gandon', 'zalupa', 'shluha', 'dolboeb', 'dolboyob', 'huesos', 'huila', 'hueplet', 'suchka',
  // en
  'fuck', 'motherf', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'whore', 'slut', 'nigg', 'faggot', 'dickhead',
];

// Söz əvvəlində: "sik" (amma "sikke"/"shikayet" yox), "xuy", "suka", "blya" ...
const WORDS = [/\bsik(?!k)/, /\b(hui|huy|huj|xuy|xui)/, /\bsuka\b/, /\bbly(a|at)?\b/, /\bdick\b/, /\bmanda\b/,
  /\b(y?e|yo)b(at|an|al|ut|nu)/, /\bfuk\b/];

const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '',
  ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ә: 'e', ғ: 'g', ү: 'u', ө: 'o', һ: 'h', ј: 'y',
};
const LAT = { ə: 'e', ş: 'sh', ç: 'ch', ğ: 'g', ı: 'i', ö: 'o', ü: 'u', x: 'x', q: 'q', w: 'v' };
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

function normalize(text) {
  let s = String(text || '').toLocaleLowerCase('az').normalize('NFC');
  s = s.replace(/i̇/g, 'i'); // "İ" kiçildiləndə
  s = [...s].map((c) => CYR[c] ?? LAT[c] ?? LEET[c] ?? c).join('');
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); // qalan diakritiklər
  return s;
}

// Uyğun gələn ilk kökü, təmizdirsə null qaytarır
function findProfanity(text) {
  // Tək hərflərdən ibarət ardıcıllığı bir sözə yığ: "f u c k" -> "fuck"
  const tokens = [];
  for (const t of normalize(text).split(/[^a-z0-9]+/).filter(Boolean)) {
    const last = tokens[tokens.length - 1];
    if (t.length === 1 && last && last.single) last.text += t;
    else tokens.push({ text: t, single: t.length === 1 });
  }
  const words = tokens.map((t) => t.text);
  const line = ` ${words.join(' ')} `;
  const variants = [line, ` ${words.map((w) => w.replace(/(.)\1+/g, '$1')).join(' ')} `];
  for (const stem of STEMS) {
    if (variants.some((v) => v.includes(stem))) return stem;
  }
  // Söz qaydaları yalnız orijinal formada: təkrar hərf silinəndə "sikke" -> "sike" olur
  for (const re of WORDS) if (re.test(line)) return re.source;
  return null;
}

module.exports = { findProfanity, normalize };
