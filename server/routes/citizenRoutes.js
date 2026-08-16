const express = require('express');
const router = express.Router();
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const citizenCtl = require('../controllers/citizenController');

// Public / Semi-public citizen routes
router.get('/community-pulse', optionalAuthenticate, citizenCtl.getCommunityPulse);
router.get('/leaderboard', optionalAuthenticate, citizenCtl.getLeaderboard);

// Authenticated citizen routes
router.use(authenticate);

router.get('/dashboard', citizenCtl.getDashboard);
router.get('/contribution', citizenCtl.getContribution);
router.get('/activity', citizenCtl.getActivity);
router.get('/followed', citizenCtl.getFollowed);
router.get('/profile', citizenCtl.getProfile);
router.patch('/profile', citizenCtl.updateProfile);
router.get('/preferences', citizenCtl.getPreferences);
router.patch('/preferences', citizenCtl.updatePreferences);

module.exports = router;
