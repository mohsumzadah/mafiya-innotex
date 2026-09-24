// Reytinqi canlandırmaq üçün yaradılmış saxta hesabları silir (score_events.game_id = 'seed').
// İşlətmək: docker exec partygames node scripts/remove-seed.js
const Database = require('better-sqlite3');
const d = new Database('/app/data/partygames.db', { timeout: 5000 });
d.pragma('foreign_keys = ON');
const ids = d.prepare("SELECT DISTINCT user_id AS id FROM score_events WHERE game_id = 'seed'").all().map((r) => r.id);
const del = d.prepare('DELETE FROM users WHERE id = ?');
d.transaction(() => ids.forEach((id) => del.run(id)))();
console.log(`${ids.length} saxta hesab silindi`);
