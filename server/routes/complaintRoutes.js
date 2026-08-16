const express = require('express');
const router = express.Router();
const {
  create,
  list,
  get,
  update,
  remove,
  changeStatus,
  timeline,
  stats,
  publicStats,
  search,
  similar,
  heatmap,
  bbox,
  nearby,
  verifyResolution,
  toggleVote,
  toggleFollow,
  getComments,
  addComment,
  reportComment,
  addEvidence
} = require('../controllers/complaintController');
const upload = require('../middleware/upload');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');

router.post('/', authenticate, upload.array('images', 6), create);
router.get('/', optionalAuthenticate, list);
router.get('/stats/summary', authenticate, stats);
router.get('/public-stats', publicStats);
router.get('/search', optionalAuthenticate, search);
router.get('/:id/similar', similar);
router.get('/heatmap', heatmap);
router.get('/bbox', bbox);
router.get('/nearby', nearby);
router.get('/:id', optionalAuthenticate, get);
router.get('/:id/timeline', timeline);
router.post('/:id/status', authenticate, upload.single('image'), changeStatus);
router.post('/:id/verify-resolution', authenticate, verifyResolution);
router.post('/:id/vote', authenticate, toggleVote);
router.post('/:id/follow', authenticate, toggleFollow);
router.get('/:id/comments', optionalAuthenticate, getComments);
router.post('/:id/comments', authenticate, addComment);
router.post('/comments/:commentId/report', authenticate, reportComment);
router.post('/:id/evidence', authenticate, upload.array('images', 6), addEvidence);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);

module.exports = router;
