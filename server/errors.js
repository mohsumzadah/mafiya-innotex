// İstifadəçiyə göstərilə bilən xəta (mesajı olduğu kimi ekrana çıxır).
class UserError extends Error {
  constructor(message) {
    super(message);
    this.expose = true;
  }
}

module.exports = { UserError };
