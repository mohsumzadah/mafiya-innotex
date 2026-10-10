#!/usr/bin/env bash
# Oyunu yeni domenə keçirir: DNS hazırdırsa .env-i yeniləyir və yenidən qurur.
# İstifadə:  ./scripts/switch-domain.sh mafiya.innotex.az
# Köhnə domen avtomatik yeni domenə 301 ilə yönləndirilir.
set -euo pipefail
NEW="${1:?Yeni domeni yaz, məsələn: ./scripts/switch-domain.sh mafiya.innotex.az}"
cd "$(dirname "$0")/.."
SERVER_IP="${SERVER_IP:-116.203.189.61}"
OLD="$(grep -E '^PG_DOMAIN=' .env | cut -d= -f2-)"

if [ "$NEW" = "$OLD" ]; then echo "Artıq $NEW istifadə olunur."; exit 0; fi

RES="$(dig +short A "$NEW" 2>/dev/null | head -1 || true)"
if [ "$RES" != "$SERVER_IP" ]; then
  echo "DNS hələ hazır deyil: $NEW -> ${RES:-heç nə} (gözlənilən: $SERVER_IP)."
  echo "Cloudflare-də A qeydi əlavə et (Name: ${NEW%%.*}, IPv4: $SERVER_IP, Proxy: DNS only), 1-2 dəqiqə sonra yenidən yoxla."
  exit 1
fi

cp .env ".env.bak-$(date +%Y%m%d-%H%M)"
sed -i "s|^PG_DOMAIN=.*|PG_DOMAIN=$NEW|" .env
if grep -q '^PG_OLD_DOMAIN=' .env; then sed -i "s|^PG_OLD_DOMAIN=.*|PG_OLD_DOMAIN=$OLD|" .env; else echo "PG_OLD_DOMAIN=$OLD" >> .env; fi
echo "PG_DOMAIN=$NEW, PG_OLD_DOMAIN=$OLD. Yenidən qurulur..."
docker compose up -d --build
echo "Hazırdır: https://$NEW (SSL sertifikatı ilk sorğuda bir neçə saniyəyə alınır). Köhnə ünvan yeniyə yönləndirilir."
