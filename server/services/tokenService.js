const jwt = require('jsonwebtoken');
const { JWT } = require('../config');
const refreshTokenRepo = require('../repositories/refreshTokenRepository');

function generateAccessToken(payload) {
  return jwt.sign(payload, JWT.ACCESS_SECRET, { expiresIn: JWT.ACCESS_EXP });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT.REFRESH_SECRET, { expiresIn: JWT.REFRESH_EXP });
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT.REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

function verifyEmailToken(token) {
  try {
    return jwt.verify(token, JWT.ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}

function generateEmailToken(payload) {
  // email token short lived
  return jwt.sign(payload, JWT.ACCESS_SECRET, { expiresIn: '1d' });
}

function generatePasswordResetToken(payload) {
  return jwt.sign(payload, JWT.REFRESH_SECRET, { expiresIn: '1h' });
}

function verifyPasswordResetToken(token) {
  try {
    return jwt.verify(token, JWT.REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

async function saveRefreshToken(userId, token) {
  return refreshTokenRepo.save(userId, token);
}

async function isRefreshTokenValid(userId, token) {
  return refreshTokenRepo.exists(userId, token);
}

async function deleteRefreshToken(token) {
  return refreshTokenRepo.remove(token);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateEmailToken,
  verifyEmailToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  saveRefreshToken,
  isRefreshTokenValid,
  deleteRefreshToken
};
