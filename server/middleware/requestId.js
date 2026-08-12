const crypto = require('crypto');

function requestId(req, res, next) {
  const id = (crypto.randomUUID && crypto.randomUUID()) || crypto.randomBytes(16).toString('hex');
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestId;
