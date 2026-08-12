const express = require('express');
const router = express.Router();
const { list, create, mark, markAll, remove } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, list);
router.post('/', authenticate, create);
router.post('/:id/read', authenticate, mark);
router.post('/read-all', authenticate, markAll);
router.delete('/:id', authenticate, remove);

module.exports = router;
