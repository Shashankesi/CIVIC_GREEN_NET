const { success, error } = require('../utils/response');
const settingsService = require('../services/settingsService');

async function get(req, res) {
  try {
    const data = await settingsService.get(req.user.userId);
    return success(res, data);
  } catch (err) {
    return error(res, err.message || 'Failed to load settings', err.status || 500);
  }
}

async function update(req, res) {
  try {
    const data = await settingsService.upsert(req.user.userId, req.body);
    return success(res, data, 'Settings updated');
  } catch (err) {
    return error(res, err.message || 'Failed to update settings', err.status || 500);
  }
}

module.exports = { get, update };
