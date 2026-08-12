const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const officerCtl = require('../controllers/officerController');

// Officers (and admins) can access officer endpoints
router.use(authenticate, authorize(['officer', 'admin']));

router.get('/workload', officerCtl.workload);
router.get('/assigned', officerCtl.assignedComplaints);
router.get('/department-stats', officerCtl.departmentStats);

module.exports = router;
