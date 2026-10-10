// Oyun reyestri. Yeni oyun əlavə etmək üçün bu qovluqda modul yazıb aşağıdakı siyahıya əlavə et.
//
// Hər oyun modulu bu interfeysi təqdim edir:
//   id, name, icon, description, minPlayers, maxPlayers
//   settings: [{ key, label, default, options: [{ value, label }] }]
//   setup(players, settings, ctx)        -> başlanğıc vəziyyət (state)
//   action(state, userId, payload, ctx)  -> oyunçunun hərəkəti (state-i dəyişir)
//   timeout(state, ctx)                  -> state.deadline vaxtı çatanda çağırılır
//   view(state, userId)                  -> konkret oyunçunun görməli olduğu məlumat
//   playerLeft(state, userId, ctx)       -> (istəyə bağlı) oyunçu oyun zamanı çıxanda
//   result(state)                        -> (istəyə bağlı) { winner, roles, winners: [userId] } bitmiş oyun üçün; qaliblər əlavə xal alır
//
// ctx: { now, isHost, players, alert(userIds, kind) }
// state.deadline (ms timestamp) təyin olunubsa, otaq meneceri həmin vaxt timeout() çağırır.
// state.finished = true olduqda oyun bitmiş sayılır və nəticə bazaya yazılır.

const games = [require('./village')];

// Hazırlanan oyunlar ana ekranda "Tezliklə" kimi görünür
const comingSoon = [];

const byId = new Map(games.map((g) => [g.id, g]));

function get(id) {
  return byId.get(id) || null;
}

function list() {
  return [
    ...games.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      description: g.description,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
    })),
    ...comingSoon.map((g) => ({ ...g, comingSoon: true })),
  ];
}

function defaultSettings(game) {
  return Object.fromEntries((game.settings || []).map((s) => [s.key, s.default]));
}

module.exports = { get, list, defaultSettings };
