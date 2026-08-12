const db = require('../config/db');

const DEFAULT_SETTINGS = {
  theme: 'light',
  notification_preferences: {
    complaint_submitted: true,
    status_changes: true,
    assignment_updates: true,
    resolution: true,
    reopened: true,
    sla_alerts: true
  },
  privacy_preferences: {
    show_name_public: false,
    show_location_public: true
  }
};

async function getSettings(userId) {
  const q = 'SELECT user_id, theme, notification_preferences, privacy_preferences, updated_at FROM user_settings WHERE user_id=$1';
  const r = await db.query(q, [userId]);
  if (r.rows[0]) return r.rows[0];
  // Return defaults if not yet saved
  return { user_id: userId, ...DEFAULT_SETTINGS, updated_at: null };
}

async function upsertSettings(userId, { theme, notification_preferences, privacy_preferences }) {
  const q = `
    INSERT INTO user_settings(user_id, theme, notification_preferences, privacy_preferences, updated_at)
    VALUES($1,$2,$3,$4,now())
    ON CONFLICT (user_id) DO UPDATE SET
      theme=EXCLUDED.theme,
      notification_preferences=EXCLUDED.notification_preferences,
      privacy_preferences=EXCLUDED.privacy_preferences,
      updated_at=now()
    RETURNING user_id, theme, notification_preferences, privacy_preferences, updated_at
  `;
  const r = await db.query(q, [userId, theme, notification_preferences, privacy_preferences]);
  return r.rows[0];
}

module.exports = { getSettings, upsertSettings, DEFAULT_SETTINGS };
