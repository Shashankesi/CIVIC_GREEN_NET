import api, { unwrapResponse } from './api';

/**
 * Get authenticated user's reputation, points, rank, and achievements.
 */
export async function getMyReputation() {
  const res = await api.get('/reputation/me');
  return unwrapResponse(res);
}

/**
 * Get user's paginated point transaction history ledger.
 */
export async function getMyHistory(params = {}) {
  const res = await api.get('/reputation/me/history', { params });
  return unwrapResponse(res);
}

/**
 * Get citizen citywide leaderboard.
 */
export async function getCitizenLeaderboard(params = {}) {
  const res = await api.get('/reputation/citizens/leaderboard', { params });
  return unwrapResponse(res);
}

/**
 * Get officer performance leaderboard.
 */
export async function getOfficerLeaderboard(params = {}) {
  const res = await api.get('/reputation/officers/leaderboard', { params });
  return unwrapResponse(res);
}

/**
 * Get public/auth point rules.
 */
export async function getPointRules() {
  const res = await api.get('/reputation/rules');
  return unwrapResponse(res);
}

/**
 * Admin: Overview statistics.
 */
export async function getAdminOverview() {
  const res = await api.get('/reputation/admin/overview');
  return unwrapResponse(res);
}

/**
 * Admin: Detailed Citizen Leaderboard.
 */
export async function getAdminCitizens(params = {}) {
  const res = await api.get('/reputation/admin/citizens', { params });
  return unwrapResponse(res);
}

/**
 * Admin: Detailed Officer Performance Leaderboard.
 */
export async function getAdminOfficers(params = {}) {
  const res = await api.get('/reputation/admin/officers', { params });
  return unwrapResponse(res);
}

/**
 * Admin: Get point rules for editing.
 */
export async function getAdminRules() {
  const res = await api.get('/reputation/admin/rules');
  return unwrapResponse(res);
}

/**
 * Admin: Save updated point rules.
 */
export async function updateAdminRules(rules) {
  const res = await api.put('/reputation/admin/rules', { rules });
  return unwrapResponse(res);
}

export default {
  getMyReputation,
  getMyHistory,
  getCitizenLeaderboard,
  getOfficerLeaderboard,
  getPointRules,
  getAdminOverview,
  getAdminCitizens,
  getAdminOfficers,
  getAdminRules,
  updateAdminRules
};
