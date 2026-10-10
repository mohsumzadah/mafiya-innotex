# 🎲 Mafiya Kəndi / Mafiya Kəndi

Telefonda qrup oyunları platforması: bir masa ətrafında, hər kəs öz telefonundan oynayır. Yükləmə yoxdur, host otaq yaradır, digərləri kod və ya QR ilə qoşulur.

**Canlı:** https://mafiya.innotex.az

## Oyunlar
- **Mafia**: mafia, həkim, komissar, vətəndaş; gecə/gündüz, səsli aparıcı
- **İmposter**: hamı sözü bilir, biri bilmir; söz turları, pass, çıxarılma
- **Səssiz kino**: komandalı və ya fərdi, host komandaları paylaya bilər

## Xüsusiyyətlər
- 3 dil (az / ru / en), hər oyunçu öz dilində; 6 neyron səsli aparıcı (hazır MP3)
- Hesablar (tez giriş / qeydiyyat), xal, aylıq reytinq və ayın sonu mükafatı
- **inno** valyutası: mağaza (ad rəngi, hərəkətli fonlar, nişan, avatar çərçivəsi, qələbə effekti), elan (reklam) satışı, WhatsApp ilə inno alışı
- Gündəlik bonus, həftənin təklifi, rəylər (ulduz), təklif/şikayət
- Admin paneli: istifadəçilər, xal/inno, elanlar, mükafatlar, müraciətlər, rəylər
- SEO: statik oyun səhifələri (`/mafia`, `/ru/krokodil`, `/en/charades`...), sitemap, OG şəkli

## Texnologiya
Node.js + Express + Socket.IO, SQLite (better-sqlite3), heç bir frontend framework yoxdur (vanilla JS). Docker + Traefik ilə deploy olunur.

```
server/
  index.js          HTTP API + Socket.IO
  rooms.js          otaq meneceri (oyunları idarə edir, taymerlər, nəticə)
  db.js             SQLite sxemi və miqrasiyalar (PRAGMA user_version)
  shop.js           mağaza, mükafatlar, paketlər
  profanity.js      söyüş filtri (az/ru/en)
  landing*.js       axtarış sistemləri üçün statik səhifələr
  games/            oyun modulları (mafia, imposter, charades) — interfeys: games/index.js
public/
  js/app.js         tətbiq (ekranlar, admin paneli)
  js/i18n.js        tərcümə lüğəti (açar = azərbaycanca mətn)
  js/games/         oyunların müştəri tərəfi
  audio/<səs>/      aparıcı səsləri
scripts/            köməkçi skriptlər
```

## İşə salmaq
```bash
cp .env.example .env        # domen və adminləri yaz
npm install
PORT=3000 node server/index.js
```
Docker ilə: `docker compose up -d --build` (Traefik şəbəkəsi `traefik-public` lazımdır). Baza `./data` qovluğunda saxlanılır.

## Yeni oyun əlavə etmək
`server/games/` altında modul yaz (`setup`, `action`, `timeout`, `view`, `result`), onu `server/games/index.js`-ə əlavə et, müştəri tərəfini `public/js/games/`-də `GameClients.<id>` kimi qeydiyyatdan keçir və `index.html`-ə qoş.
