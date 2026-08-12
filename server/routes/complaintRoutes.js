const express = require('express');
const router = express.Router();
const { create, list, get, update, remove, changeStatus, timeline, stats, publicStats, search, similar, heatmap, bbox, nearby, verifyResolution } = require('../controllers/complaintController');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/', authenticate, upload.array('images', 6), create);
router.get('/', list);
router.get('/stats/summary', authenticate, stats);
router.get('/public-stats', publicStats);
router.get('/search', search);
router.get('/:id/similar', similar);
router.get('/heatmap', heatmap);
router.get('/bbox', bbox);
router.get('/nearby', nearby);
router.get('/:id', get);
router.get('/:id/timeline', timeline);
router.post('/:id/status', authenticate, upload.single('image'), changeStatus);
router.post('/:id/verify-resolution', authenticate, verifyResolution);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);

module.exports = router;
