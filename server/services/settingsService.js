const settingsRepo = require('../repositories/settingsRepository');

class SettingsError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function get(userId) {
  const settings = await settingsRepo.getSettings(userId);
  return settings;
}

async function upsert(userId, body) {
  const theme = body.theme;
  if (theme !== undefined && !['light', 'dark', 'system'].includes(theme)) {
    throw new SettingsError('Invalid theme. Must be light, dark, or system.', 400);
  }

  const notification_preferences = body.notification_preferences && typeof body.notification_preferences === 'object'
    ? body.notification_preferences : undefined;
  const privacy_preferences = body.privacy_preferences && typeof body.privacy_preferences === 'object'
    ? body.privacy_preferences : undefined;

  const update = {};
  if (theme !== undefined) update.theme = theme;
  if (notification_preferences) update.notification_preferences = notification_preferences;
  if (privacy_preferences) update.privacy_preferences = privacy_preferences;

  const updated = await settingsRepo.upsertSettings(userId, update);
  return updated;
}

module.exports = { get, upsert, SettingsError };
