const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const settingsCtl = require('../controllers/settingsController');

router.use(authenticate);

router.get('/', settingsCtl.get);
router.put('/', settingsCtl.update);

module.exports = router;
