// Axtarış sistemləri üçün statik oyun səhifələrinin mətni (az / ru / en).
// server/landing.js bu mətndən HTML yaradır: /mafia, /ru/mafia, /en/mafia və s.

const SITE = {
  az: {
    name: 'Mafiya oyunu',
    title: 'Mafiya oyunu — Online Mafiya oyna, pulsuz | Çatla, səs ver, mafiyanı tap',
    description: 'Online Mafiya oyunu: gecə mafiya ov edir, gündüz hamı çatda müzakirə edib səs verir. Azərbaycan və ya rus dilli otaq seç, dostlarınla otaq aç — yükləmə yoxdur, pulsuz.',
    play: 'İndi oyna',
    playFree: 'Pulsuz oyna — yükləmə yoxdur',
    games: 'Oyunlar',
    howTo: 'Necə oynanılır?',
    rules: 'Qaydalar',
    faq: 'Tez-tez verilən suallar',
    players: 'oyunçu',
    minutes: 'dəqiqə',
    other: 'Digər oyunlar',
    footer: 'Mafiya oyunu — online Mafiya: öz dilində otaq seç, çatla, səs ver, mafiyanı tap.',
    homeH1: 'Online Mafiya oyunu: çatla, səs ver, mafiyanı tap',
    homeIntro: 'Mafiya oyunu: gecə mafiya gizlicə ov edir, gündüz hamı çatda müzakirə edib şübhəlini qovur. Otağı quran adam hansı dillərdə (Azərbaycan, rus, ingilis) danışılacağını seçir — sən də öz dilindəki otağa qoşulursan. Sürətli oyna düyməsini bas və ya dostların üçün kodla otaq aç.',
    features: ['Yükləmə və qeydiyyat tələb olunmur', '4–15 oyunçu, hər kəs öz yerindən', 'Azərbaycan, rus və ingilis dilli otaqlar — dili otağı quran seçir', 'Çat, xal, reytinq, personaj görünüşləri və mükafatlar'],
  },
  ru: {
    name: 'Игра Мафия',
    title: 'Игра Мафия онлайн — играть в мафию бесплатно, без регистрации | Чат и голосование',
    description: 'Онлайн-игра Мафия: ночью мафия охотится, днём все обсуждают в чате и голосуют. Комнаты на русском и азербайджанском — язык выбирает создатель комнаты. Без установки, бесплатно.',
    play: 'Играть сейчас',
    playFree: 'Играть бесплатно — без установки',
    games: 'Игры',
    howTo: 'Как играть?',
    rules: 'Правила',
    faq: 'Частые вопросы',
    players: 'игроков',
    minutes: 'минут',
    other: 'Другие игры',
    footer: 'Игра Мафия — онлайн-мафия на русском: выбирайте комнату на своём языке, общайтесь, голосуйте, ищите мафию.',
    homeH1: 'Играть в мафию онлайн: чат, голосование, поиск мафии',
    homeIntro: 'Игра Мафия онлайн: ночью мафия тайно охотится, днём все обсуждают в чате и изгоняют подозреваемого. Создатель комнаты выбирает, на каких языках общаются (русский, азербайджанский, английский) — заходите в комнату на своём языке, жмите «Быстрая игра» или создайте комнату по коду для друзей.',
    features: ['Без установки и регистрации', '4–15 игроков, каждый у себя', 'Комнаты на русском, азербайджанском и английском — язык выбирает создатель', 'Чат, очки, рейтинг, облики персонажей и призы'],
  },
  en: {
    name: 'Mafia Game',
    title: 'Mafia Game Online — play Mafia free with friends | Chat, vote, find the mafia',
    description: 'Online Mafia game: the mafia hunts at night, everyone chats and votes by day. The room creator picks the languages (Azerbaijani, Russian, English). No download, free.',
    play: 'Play now',
    playFree: 'Play free — no download',
    games: 'Games',
    howTo: 'How to play',
    rules: 'Rules',
    faq: 'FAQ',
    players: 'players',
    minutes: 'minutes',
    other: 'Other games',
    footer: 'Mafia Game — online Mafia: pick a room in your language, chat, vote and find the mafia.',
    homeH1: 'Online Mafia game: chat, vote, find the mafia',
    homeIntro: 'The mafia hunts in secret at night, and by day everyone chats and banishes a suspect. The room creator chooses which languages are spoken (Azerbaijani, Russian, English) — join a room in your language, hit Quick play, or create a private room by code for your friends.',
    features: ['No download, no sign-up needed', '4–15 players, each from their own place', 'Rooms in Azerbaijani, Russian and English — the creator picks the languages', 'Chat, points, leaderboard, character looks and prizes'],
  },
};

const GAMES = {
  village: {
    slug: { az: 'mafiya', ru: 'mafiya', en: 'mafia' },
    emoji: '🏘️',
    players: '4–15',
    time: '10–30',
    az: {
      name: 'Mafiya oyunu',
      title: 'Mafiya oyunu online — qaydalar və pulsuz oyna',
      description: 'Mafiya oyunu: gecə mafiya ov edir, gündüz hamı çatda müzakirə edib səs verir. Rollar: mafia, həkim, komissar, vətəndaş. Açıq otaq və ya kodla — pulsuz.',
      h1: 'Mafiya oyunu — online oyna, çatla və mafiyanı tap',
      intro: 'Mafiya oyunu — gecələr mafianın gizlicə ov etdiyi, gündüz isə kəndin meydanda toplaşıb mafianı tapmağa çalışdığı online Mafia oyunudur. Hamı öz telefonundan və ya kompüterindən qoşulur, gündüz çatda müzakirə edir, səs verir. Aparıcı lazım deyil.',
      steps: ['«Sürətli oyna» düyməsini bas və ya açıq otağa qoş, ya da dostların üçün kodla otaq aç', 'Rolunu gizlicə gör: mafia, həkim, komissar və ya vətəndaş', 'Gecə: hamı evinə çəkilir. Mafia qurban seçir, həkim kimisə qoruyur, komissar kimisə yoxlayır', 'Səhər: kimin öldürüldüyü elan olunur, hamı meydana toplaşıb çatda müzakirə edir', 'Səsvermə: kənd şübhəlini qovur. Mafia tapılana və ya kəndi ələ keçirənə qədər davam edir'],
      rules: ['Mafia: gecələr yoldaşları ilə birlikdə bir nəfəri seçir, gündüz özünü vətəndaş kimi göstərir', 'Həkim: hər gecə bir nəfəri xilas edir (eyni adamı iki gecə dalbadal yox)', 'Komissar: hər gecə bir nəfərin mafia olub-olmadığını öyrənir (6+ nəfər)', 'Vətəndaş: gündüz müzakirədə mafianı tapmağa çalışır', 'Bütün mafia qovulsa kənd, mafia sayı vətəndaşlara bərabərləşsə mafia qalib gəlir', 'Ölənlər oyundan çıxır, amma ölülərin ayrıca çatında danışa bilirlər'],
      faq: [['Mafiya oyununu neçə nəfər oynaya bilər?', '4 nəfərdən 15 nəfərə qədər. 6 nəfərdən çox olanda komissar rolu da əlavə olunur.'], ['Aparıcı lazımdırmı?', 'Xeyr. Oyun gecəni, səhəri və səsverməni özü idarə edir.'], ['Oyunu yükləmək lazımdırmı?', 'Xeyr, brauzerdə açılır. Telefonda da, kompüterdə də işləyir.'], ['Açıq otaq nədir?', 'Hər kəsin qoşula biləcəyi otaqdır. Minimum say yığılanda oyun avtomatik başlayır.'], ['Rus dilində və ya Azərbaycan dilində oynaya bilərəm?', 'Bəli. Otağı quran adam otaqda hansı dillərdə danışılacağını seçir (Azərbaycan, rus, ingilis). Siyahıda dilinə uyğun otaqlar yuxarıda görünür.']],
    },
    ru: {
      name: 'Игра Мафия',
      title: 'Мафия онлайн — правила и бесплатная игра на русском',
      description: 'Игра Мафия онлайн: ночью мафия охотится, днём жители обсуждают в чате и голосуют. Роли: мафия, доктор, комиссар, мирный. Открытые комнаты или по коду — бесплатно.',
      h1: 'Мафия онлайн — играйте в мафию с друзьями и найдите мафию',
      intro: 'Мафия онлайн: ночью мафия тайно охотится, а днём жители собираются на площади и ищут её. Все подключаются со своих телефонов или компьютеров, днём обсуждают в чате и голосуют. Ведущий не нужен.',
      steps: ['Нажмите «Быстрая игра», зайдите в открытую комнату или создайте комнату по коду для друзей', 'Тайно узнайте свою роль: мафия, доктор, комиссар или мирный житель', 'Ночь: все расходятся по домам. Мафия выбирает жертву, доктор защищает, комиссар проверяет', 'Утро: объявляют, кто погиб, все собираются на площади и обсуждают в чате', 'Голосование: деревня изгоняет подозреваемого. Игра идёт, пока мафию не найдут или она не захватит деревню'],
      rules: ['Мафия: ночью вместе выбирает жертву, днём притворяется мирным', 'Доктор: каждую ночь спасает одного (не одного и того же две ночи подряд)', 'Комиссар: каждую ночь узнаёт, мафия ли игрок (от 6 игроков)', 'Мирный житель: днём ищет мафию в обсуждении', 'Деревня побеждает, если изгнана вся мафия; мафия — если её столько же, сколько мирных', 'Выбывшие общаются в отдельном чате призраков'],
      faq: [['Сколько человек может играть?', 'От 4 до 15. При 6 и более игроках добавляется комиссар.'], ['Нужен ли ведущий?', 'Нет. Игра сама ведёт ночь, утро и голосование.'], ['Нужно ли что-то скачивать?', 'Нет, игра открывается в браузере на телефоне и компьютере.'], ['Что такое открытая комната?', 'Комната, куда может зайти любой. Когда набирается минимум игроков, игра начинается автоматически.'], ['Можно ли играть на русском?', 'Да. Создатель комнаты выбирает языки общения (русский, азербайджанский, английский). В списке комнаты на вашем языке показываются первыми.']],
    },
    en: {
      name: 'Mafia Game',
      title: 'Online Mafia game — rules and free play',
      description: 'Mafia game: the mafia hunts at night, the village chats and votes by day. Roles: mafia, doctor, detective, citizen. Open rooms or by code — free.',
      h1: 'Mafia game online: chat and find the mafia',
      intro: 'Mafia is an online party game: the mafia hunts in secret at night, and by day the villagers gather in the square to find them. Everyone joins from their phone or computer, chats during the day and votes. No host needed.',
      steps: ['Tap “Quick play”, join an open room, or create a private room by code for your friends', 'Secretly see your role: mafia, doctor, detective or citizen', 'Night: everyone goes home. The mafia picks a victim, the doctor protects, the detective investigates', 'Morning: the victim is announced, everyone gathers in the square and discusses in chat', 'Vote: the village banishes a suspect. It goes on until the mafia is found or takes over'],
      rules: ['Mafia: pick a victim together at night, act innocent by day', 'Doctor: save one person each night (not the same person twice in a row)', 'Detective: learn whether a player is mafia each night (6+ players)', 'Citizen: find the mafia in the day discussion', 'The village wins when all mafia are banished; the mafia wins when they equal the citizens', 'Eliminated players chat in a separate ghost chat'],
      faq: [['How many people can play?', 'From 4 to 15. With 6 or more players a detective is added.'], ['Do we need a host?', 'No. The game runs the night, morning and vote by itself.'], ['Do I need to download anything?', 'No, it runs in the browser on phone and computer.'], ['What is an open room?', 'A room anyone can join. When the minimum number of players is reached, the game starts automatically.'], ['Can I play in my own language?', 'Yes. The room creator picks the languages spoken in the room (Azerbaijani, Russian, English), and rooms in your language are listed first.']],
    },
  },
};


// ---- Şəkillər (oyundan real ekran görüntüləri), rollar, məsləhətlər: SEO üçün zəngin məzmun ----
const SHOT_KEYS = ['discussion', 'night', 'vote', 'rooms', 'shop', 'home'];
SITE.az.shotsTitle = 'Oyundan görüntülər';
SITE.az.shots = {
  discussion: ['Gündüz müzakirəsi', 'Mafiya oyunu: gündüz müzakirəsi və çat, personajlar, heyvanlar və evlər meydanda'],
  night: ['Gecə fazası', 'Mafiya oyununda gecə: komissar yoxlamaq istədiyi oyunçunu seçir'],
  vote: ['Səsvermə', 'Mafiya oyununda səsvermə: kimi kənddən qovuruq?'],
  rooms: ['Otaq dili seçimi', 'Otaq yaradanda dil seçimi: Azərbaycan, rus və ingilis dilli otaqlar'],
  shop: ['Hazır tiplər', 'Mağazada hazır tiplər: mafiya, komissar, kəndli, cəngavər, gəlin və kraliça'],
  home: ['Ana səhifə', 'Mafiya oyununun ana səhifəsi: sürətli oyna və açıq otaqlar'],
};
SITE.ru.shotsTitle = 'Скриншоты игры';
SITE.ru.shots = {
  discussion: ['Дневное обсуждение', 'Игра Мафия онлайн: дневное обсуждение в чате, персонажи, питомцы и домики на площади'],
  night: ['Ночная фаза', 'Мафия онлайн ночью: комиссар выбирает, кого проверить'],
  vote: ['Голосование', 'Голосование в мафии онлайн: кого изгоняем из деревни?'],
  rooms: ['Язык комнаты', 'Создание комнаты: выбор языков общения — русский, азербайджанский, английский'],
  shop: ['Образы персонажей', 'Магазин образов: мафиози, комиссар, крестьянин, рыцарь, невеста и королева'],
  home: ['Главный экран', 'Главный экран игры Мафия: быстрая игра и открытые комнаты'],
};
SITE.en.shotsTitle = 'Game screenshots';
SITE.en.shots = {
  discussion: ['Day discussion', 'Online Mafia game: day discussion in chat with characters, pets and houses in the square'],
  night: ['Night phase', 'Mafia game at night: the detective picks who to investigate'],
  vote: ['Voting', 'Voting in online Mafia: who do we banish from the village?'],
  rooms: ['Room language', 'Creating a room: choose the languages spoken — Azerbaijani, Russian, English'],
  shop: ['Character looks', 'Shop outfits: mobster, detective, villager, knight, bride and queen'],
  home: ['Home screen', 'Mafia game home screen: quick play and open rooms'],
};

SITE.az.rolesTitle = 'Mafiya oyununda rollar';
SITE.ru.rolesTitle = 'Роли в игре Мафия';
SITE.en.rolesTitle = 'Roles in the Mafia game';
SITE.az.tipsTitle = 'Mafiya oyununda qalib gəlmək üçün məsləhətlər';
SITE.ru.tipsTitle = 'Советы, как выигрывать в мафию';
SITE.en.tipsTitle = 'Tips to win at Mafia';
SITE.az.langsTitle = 'Öz dilində oyna';
SITE.ru.langsTitle = 'Играйте на своём языке';
SITE.en.langsTitle = 'Play in your language';
SITE.az.langsText = 'Otağı quran adam otaqda hansı dillərdə danışılacağını seçir: Azərbaycan, rus və ya ingilis. Açıq otaqlar siyahısında sənin dilinə uyğun otaqlar yuxarıda görünür, «Sürətli oyna» isə səni məhz öz dilində danışılan otağa qoşur. Beləcə azərbaycanlılar və rusdillilər bir-birini anlayaraq rahat oynayır.';
SITE.ru.langsText = 'Создатель комнаты выбирает, на каких языках общаются игроки: русский, азербайджанский или английский. В списке открытых комнат сверху показываются комнаты на вашем языке, а «Быстрая игра» подбирает комнату именно с вашим языком. Так русскоязычные и азербайджанские игроки спокойно понимают друг друга.';
SITE.en.langsText = 'The room creator picks which languages are spoken in the room: Azerbaijani, Russian or English. In the open rooms list, rooms in your language are shown first, and “Quick play” puts you into a room that speaks your language, so everyone understands each other.';

GAMES.village.az.roles = [
  ['Mafiya', 'Gecələr yoldaşları ilə gizlicə bir nəfəri seçib aradan götürür. Gündüz özünü vətəndaş kimi aparır, şübhəni başqasına yönəldir.'],
  ['Həkim', 'Hər gecə bir nəfəri qoruyur. Mafiya həmin adamı seçsə, o sağ qalır. Özünü də qoruya bilər.'],
  ['Komissar', 'Hər gecə bir oyunçunun mafiya olub-olmadığını öyrənir. Bu məlumatı gündüz ehtiyatla paylaşmaq lazımdır.'],
  ['Vətəndaş', 'Xüsusi qabiliyyəti yoxdur, amma səsi var. Çatda müzakirə edib, kimin yalan danışdığını tapmalıdır.'],
];
GAMES.village.ru.roles = [
  ['Мафия', 'Ночью тайно выбирает жертву вместе с напарниками. Днём изображает мирного жителя и переводит подозрения на других.'],
  ['Доктор', 'Каждую ночь защищает одного игрока. Если мафия выбрала его, он остаётся жив. Может защитить и себя.'],
  ['Комиссар', 'Каждую ночь узнаёт, мафия ли выбранный игрок. Делиться этим знанием днём нужно осторожно.'],
  ['Мирный житель', 'Особых способностей нет, но есть голос. Обсуждает в чате и вычисляет, кто лжёт.'],
];
GAMES.village.en.roles = [
  ['Mafia', 'Secretly picks a victim with teammates at night. By day acts like a citizen and steers suspicion elsewhere.'],
  ['Doctor', 'Protects one player each night. If the mafia chose them, they survive. Can protect themselves too.'],
  ['Detective', 'Learns each night whether a chosen player is mafia. Share this carefully during the day.'],
  ['Citizen', 'No special power, but a vote. Discusses in chat and works out who is lying.'],
];
GAMES.village.az.tips = ['Çatda çox yazın, amma əsassız ittiham etməyin: səssiz qalan da, həddindən artıq danışan da şübhə doğurur.', 'Komissarsınızsa, tapdığınız mafiyanı dərhal açmayın: əvvəl inamlı oyunçulara işarə verin.', 'Mafiya olaraq yoldaşınızı müdafiə etməyin, bu sizi ələ verər.', 'Kimin kimə səs verdiyini izləyin: mafiya tez-tez bir-birinə səs verməkdən çəkinir.', 'Şəxsi qeyd dəftərində kimin nə dediyini yazın, ölən oyunçunun qeydi hamıya açılır.'];
GAMES.village.ru.tips = ['Активно общайтесь в чате, но не обвиняйте без причины: подозрение вызывает и молчун, и тот, кто говорит слишком много.', 'Если вы комиссар, не раскрывайте найденную мафию сразу: сначала намекните надёжным игрокам.', 'Играя за мафию, не защищайте напарника слишком явно: это выдаёт вас.', 'Следите, кто за кого голосует: мафия часто избегает голосовать друг за друга.', 'Записывайте в личные заметки, кто что сказал: заметки выбывшего игрока становятся видны всем.'];
GAMES.village.en.tips = ['Chat a lot but do not accuse without reason: both silence and over-talking raise suspicion.', 'As the detective, do not reveal a found mafia member at once: hint to trustworthy players first.', 'As mafia, do not defend your partner too obviously, it gives you away.', 'Watch who votes for whom: mafia members often avoid voting for each other.', 'Keep notes of who said what; a player’s notes become visible to everyone once they are eliminated.'];
GAMES.village.az.faq.push(['Mafiya oyununu qeydiyyatsız oynamaq olarmı?', 'Bəli. Yalnız ad yazıb «Sürətli oyna» basmaq kifayətdir. Qeydiyyat xal, reytinq və mağaza üçün lazımdır.'], ['Mafiya oyunu pulsuzdur?', 'Bəli, oyun pulsuzdur. İstəyə görə mağazada personaj görünüşləri və heyvanlar inno ilə alınır, oyunun gedişinə təsir etmir.']);
GAMES.village.ru.faq.push(['Нужна ли регистрация, чтобы играть в мафию?', 'Нет. Достаточно ввести ник и нажать «Быстрая игра». Регистрация нужна для очков, рейтинга и магазина.'], ['Игра Мафия бесплатная?', 'Да, играть бесплатно. По желанию в магазине за inno покупаются образы и питомцы, они не влияют на ход игры.']);
GAMES.village.en.faq.push(['Do I need to register to play Mafia?', 'No. Enter a nickname and tap “Quick play”. Registration is only needed for points, the leaderboard and the shop.'], ['Is the Mafia game free?', 'Yes, it is free. Optional looks and pets in the shop are bought with inno and do not affect gameplay.']);

module.exports = { SITE, GAMES, LANGS: ['az', 'ru', 'en'], SHOT_KEYS };
