const bcrypt = require('bcrypt');
const SALT = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT);
}

async function compare(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, compare };
