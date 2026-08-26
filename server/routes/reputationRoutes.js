const express = require('express');
const router = express.Router();
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/authMiddleware');
const repCtl = require('../controllers/reputationController');

// ── Public / Semi-public routes ──────────────────────────────────────────
router.get('/citizens/leaderboard', optionalAuthenticate, repCtl.getCitizenLeaderboard);
router.get('/rules', repCtl.getRules);

// ── Authenticated User routes ───────────────────────────────────────────
router.get('/me', authenticate, repCtl.getMyReputation);
router.get('/me/history', authenticate, repCtl.getMyHistory);
router.get('/officers/leaderboard', authenticate, authorize(['officer', 'admin']), repCtl.getOfficerLeaderboard);

// ── Admin-Only Management routes ─────────────────────────────────────────
router.get('/admin/overview', authenticate, authorize('admin'), repCtl.getAdminOverview);
router.get('/admin/citizens', authenticate, authorize('admin'), repCtl.getAdminCitizens);
router.get('/admin/officers', authenticate, authorize('admin'), repCtl.getAdminOfficers);
router.get('/admin/rules', authenticate, authorize('admin'), repCtl.getRules);
router.put('/admin/rules', authenticate, authorize('admin'), repCtl.updateAdminRules);

module.exports = router;
