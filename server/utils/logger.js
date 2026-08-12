const LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function formatMessage(level, msg, meta) {
  const time = new Date().toISOString();
  const id = meta && meta.requestId ? ` req=${meta.requestId}` : '';
  return `${time} ${level.toUpperCase()}:${id} ${msg}`;
}

function debug(msg, meta) {
  if (LEVEL === 'debug') console.debug(formatMessage('debug', msg, meta));
}

function info(msg, meta) {
  console.info(formatMessage('info', msg, meta));
}

function warn(msg, meta) {
  console.warn(formatMessage('warn', msg, meta));
}

function error(msg, meta) {
  console.error(formatMessage('error', msg, meta));
}

module.exports = { debug, info, warn, error };
