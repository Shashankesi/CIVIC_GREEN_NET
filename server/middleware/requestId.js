const crypto = require('crypto');

function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'] || req.headers['x-request-id'];
  const id = incoming || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

module.exports = requestId;
