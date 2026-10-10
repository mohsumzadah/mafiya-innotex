// Axtarış sistemləri üçün statik səhifələr: oyun qaydaları (az/ru/en), sitemap.xml, robots.txt.
// Tətbiqin özü (/) JavaScript-lə işləyir; bu səhifələr isə serverdə hazır HTML kimi verilir ki, Google oxuya bilsin.
const { SITE, GAMES, LANGS, SHOT_KEYS } = require('./landing-content');

const BASE = `https://${process.env.PG_DOMAIN || 'mafiya.innotex.az'}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const prefix = (lang) => (lang === 'az' ? '' : `/${lang}`);
const LANG_NAME = { az: 'AZ', ru: 'RU', en: 'EN' };
const OG_LOCALE = { az: 'az_AZ', ru: 'ru_RU', en: 'en_US' };
const ogImage = (lang) => `${BASE}/og-${lang}.jpg`;
const shotUrl = (k, lang) => `/img/shot-${k}-${lang}.webp`;
// Axtarış konsollarının təsdiq kodları (.env: PG_GOOGLE_VERIFY, PG_YANDEX_VERIFY)
const verifyMetas = () => [
  process.env.PG_GOOGLE_VERIFY ? `<meta name="google-site-verification" content="${esc(process.env.PG_GOOGLE_VERIFY)}">` : '',
  process.env.PG_YANDEX_VERIFY ? `<meta name="yandex-verification" content="${esc(process.env.PG_YANDEX_VERIFY)}">` : '',
].filter(Boolean).join('\n  ');

function gallery(lang) {
  const S = SITE[lang];
  return `<section class="shots-section">
      <h2>${esc(S.shotsTitle)}</h2>
      <div class="shots">${SHOT_KEYS.map((k, i) => `<figure><img src="${shotUrl(k, lang)}" alt="${esc(S.shots[k][1])}" width="640" height="1339" ${i < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>${esc(S.shots[k][0])}</figcaption></figure>`).join('')}</div>
    </section>`;
}
const langsSection = (lang) => `<section><h2>${esc(SITE[lang].langsTitle)}</h2><p>${esc(SITE[lang].langsText)}</p></section>`;
const rolesSection = (lang) => `<section><h2>${esc(SITE[lang].rolesTitle)}</h2><div class="roles">${GAMES.village[lang].roles.map(([n, t]) => `<div class="role"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div></section>`;
const tipsSection = (lang) => `<section><h2>${esc(SITE[lang].tipsTitle)}</h2><ul class="rules">${GAMES.village[lang].tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>`;
const screenshotLd = (lang) => SHOT_KEYS.map((k) => ({ '@type': 'ImageObject', contentUrl: BASE + shotUrl(k, lang), name: SITE[lang].shots[k][0], description: SITE[lang].shots[k][1], width: 640, height: 1339 }));

const homePath = (lang) => (lang === 'az' ? '/oyunlar' : `/${lang}`);
const gamePath = (id, lang) => `${prefix(lang)}/${GAMES[id].slug[lang]}`;

// Bütün səhifələr: { path, lang, render, alternates: {lang: path} }
function pages() {
  const list = [];
  for (const lang of LANGS) {
    list.push({ path: homePath(lang), lang, kind: 'home', alternates: Object.fromEntries(LANGS.map((l) => [l, homePath(l)])) });
    for (const id of Object.keys(GAMES)) {
      list.push({ path: gamePath(id, lang), lang, kind: 'game', id, alternates: Object.fromEntries(LANGS.map((l) => [l, gamePath(id, l)])) });
    }
  }
  return list;
}

function head({ lang, title, description, path, alternates, jsonld }) {
  const url = BASE + path;
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  ${Object.entries(alternates).map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${BASE + p}">`).join('\n  ')}
  <link rel="alternate" hreflang="x-default" href="${BASE + alternates.az}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(SITE[lang].name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage(lang)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(title)}">
  <meta property="og:locale" content="${OG_LOCALE[lang]}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${ogImage(lang)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
  ${verifyMetas()}
  <meta name="theme-color" content="#4338ca">
  <link rel="icon" href="/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap">
  <link rel="stylesheet" href="/css/landing.css">
  ${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n  ')}
</head>`;
}

function header(lang, alternates) {
  const S = SITE[lang];
  return `<header class="top">
    <a class="brand" href="${homePath(lang)}"><img class="logo" src="/icons/icon-192.png" alt="" width="36" height="36">${esc(S.name)}</a>
    <nav class="langs">${LANGS.map((l) => `<a href="${alternates[l]}" hreflang="${l}"${l === lang ? ' aria-current="true"' : ''}>${LANG_NAME[l]}</a>`).join('')}</nav>
  </header>`;
}

const playUrl = (lang) => `/?lang=${lang}`;

function footer(lang) {
  const S = SITE[lang];
  return `<footer>
    <nav>${Object.keys(GAMES).map((id) => `<a href="${gamePath(id, lang)}">${esc(GAMES[id][lang].name)}</a>`).join(' · ')}</nav>
    <p>${esc(S.footer)}</p>
  </footer>`;
}

function renderHome(lang, alternates) {
  const S = SITE[lang];
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'WebApplication', name: S.name, url: `${BASE}/`, applicationCategory: 'GameApplication',
    operatingSystem: 'Any (web browser)', inLanguage: LANGS, description: S.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AZN' }, image: ogImage(lang), screenshot: screenshotLd(lang),
  }, {
    '@context': 'https://schema.org', '@type': 'WebSite', name: S.name, url: BASE + '/', inLanguage: lang,
    publisher: { '@type': 'Organization', name: 'INNOTEX', url: 'https://innotex.az' },
  }];
  return `${head({ lang, title: S.title, description: S.description, path: homePath(lang), alternates, jsonld })}
<body>
  ${header(lang, alternates)}
  <main>
    <section class="hero">
      <h1>${esc(S.homeH1)}</h1>
      <p class="lead">${esc(S.homeIntro)}</p>
      <a class="cta" href="${playUrl(lang)}">${esc(S.playFree)} →</a>
      <ul class="features">${S.features.map((f) => `<li>✓ ${esc(f)}</li>`).join('')}</ul>
    </section>
    ${gallery(lang)}
    ${langsSection(lang)}
    <section>
      <h2>${esc(S.games)}</h2>
      <div class="cards">${Object.keys(GAMES).map((id) => {
        const g = GAMES[id];
        return `<a class="card" href="${gamePath(id, lang)}"><span class="emoji">${g.emoji}</span><b>${esc(g[lang].name)}</b><span>${esc(g[lang].description)}</span><small>👥 ${g.players} ${esc(S.players)} · ⏱ ${g.time} ${esc(S.minutes)}</small></a>`;
      }).join('')}</div>
    </section>
    ${rolesSection(lang)}
  </main>
  ${footer(lang)}
</body>
</html>`;
}

function renderGame(id, lang, alternates) {
  const S = SITE[lang];
  const g = GAMES[id];
  const G = g[lang];
  const path = gamePath(id, lang);
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'VideoGame', name: G.name, url: BASE + path, description: G.description,
      inLanguage: lang, genre: 'Party game', playMode: 'MultiPlayer', numberOfPlayers: { '@type': 'QuantitativeValue', minValue: Number(g.players.split('–')[0]), maxValue: Number(g.players.split('–')[1]) },
      gamePlatform: 'Web browser', offers: { '@type': 'Offer', price: '0', priceCurrency: 'AZN' }, inLanguage: LANGS,
      image: ogImage(lang), screenshot: screenshotLd(lang), publisher: { '@type': 'Organization', name: 'INNOTEX', url: 'https://innotex.az' },
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: G.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: S.name, item: BASE + homePath(lang) },
        { '@type': 'ListItem', position: 2, name: G.name, item: BASE + path },
      ],
    },
  ];
  return `${head({ lang, title: G.title, description: G.description, path, alternates, jsonld })}
<body>
  ${header(lang, alternates)}
  <main>
    <nav class="crumbs"><a href="${homePath(lang)}">${esc(S.name)}</a> › ${esc(G.name)}</nav>
    <section class="hero">
      <img class="big-logo" src="/icons/icon-192.png" alt="" width="64" height="64">
      <h1>${esc(G.h1)}</h1>
      <p class="lead">${esc(G.intro)}</p>
      <p class="meta">👥 ${g.players} ${esc(S.players)} · ⏱ ${g.time} ${esc(S.minutes)}</p>
      <a class="cta" href="${playUrl(lang)}">${esc(S.play)} →</a>
    </section>
    ${gallery(lang)}
    <section>
      <h2>${esc(S.howTo)}</h2>
      <ol class="steps">${G.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    </section>
    <section>
      <h2>${esc(S.rules)}</h2>
      <ul class="rules">${G.rules.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </section>
    ${rolesSection(lang)}
    ${tipsSection(lang)}
    ${langsSection(lang)}
    <section>
      <h2>${esc(S.faq)}</h2>
      ${G.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
    </section>
    <section class="final">
      <a class="cta" href="${playUrl(lang)}">${esc(S.playFree)} →</a>
    </section>
  </main>
  ${footer(lang)}
</body>
</html>`;
}

function sitemap() {
  const urls = [{ path: '/', alternates: null }, ...pages()];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `  <url>
    <loc>${BASE}${u.path}</loc>
    ${u.alternates ? Object.entries(u.alternates).map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${BASE}${p}"/>`).join('\n    ') : ''}
    ${(u.lang || 'az') && SHOT_KEYS.slice(0, 4).map((k) => `<image:image><image:loc>${BASE}${shotUrl(k, u.lang || 'az')}</image:loc><image:title>${esc(SITE[u.lang || 'az'].shots[k][0])}</image:title></image:image>`).join('\n    ')}
    <changefreq>weekly</changefreq>
    <priority>${u.path === '/' ? '1.0' : u.kind === 'home' ? '0.9' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
}

const ROBOTS = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /socket.io/

Sitemap: ${BASE}/sitemap.xml
`;

// Express-ə marşrutları qoş (static fayllardan əvvəl)
function mount(app) {
  const cache = new Map();
  for (const p of pages()) {
    const html = p.kind === 'home' ? renderHome(p.lang, p.alternates) : renderGame(p.id, p.lang, p.alternates);
    cache.set(p.path, html);
    app.get(p.path, (_req, res) => {
      res.set('Cache-Control', 'public, max-age=3600');
      res.type('html').send(html);
    });
  }
  // Köhnə oyun səhifələri yeni Mafiya səhifəsinə yönləndirilir
  const OLD = { '/kend': '/mafiya', '/mafia': '/mafiya', '/imposter': '/mafiya', '/sessiz-kino': '/mafiya', '/ru/derevnya': '/ru/mafiya', '/ru/mafia': '/ru/mafiya', '/ru/imposter': '/ru/mafiya', '/ru/krokodil': '/ru/mafiya', '/en/village': '/en/mafia', '/en/imposter': '/en/mafia', '/en/charades': '/en/mafia' };
  for (const [from, to] of Object.entries(OLD)) app.get(from, (_req, res) => res.redirect(301, to));
  app.get('/sitemap.xml', (_req, res) => res.type('application/xml').send(sitemap()));
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(ROBOTS));
  return [...cache.keys()];
}

module.exports = { mount, pages, BASE };
