const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const officerCtl = require('../controllers/officerController');

// Officers (and admins) can access officer endpoints
router.use(authenticate, authorize(['officer', 'admin']));

const multer = require('multer');
const path = require('path');
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed.'));
    }
  }
}).single('file');

router.get('/dashboard', officerCtl.dashboard);
router.get('/workload', officerCtl.workload);
router.get('/assigned', officerCtl.assignedComplaints);
router.get('/department-stats', officerCtl.departmentStats);
router.get('/complaints/nearby', officerCtl.nearby);
router.get('/profile', officerCtl.profile);
router.patch('/profile', officerCtl.updateProfile);
router.patch('/availability', officerCtl.updateAvailability);
router.get('/activity', officerCtl.getActivity);
router.get('/performance', officerCtl.getPerformance);
router.post('/onboarding', officerCtl.submitOnboarding);
router.get('/onboarding/documents', officerCtl.getOnboardingDocuments);
router.post('/onboarding/documents', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    next();
  });
}, officerCtl.uploadOnboardingDocument);

router.post('/complaints/:id/accept', officerCtl.acceptComplaint);
router.post('/complaints/:id/decline', officerCtl.declineComplaint);
router.post('/complaints/:id/start-work', officerCtl.startWork);
router.post('/complaints/:id/status', officerCtl.updateStatus);
router.post('/complaints/:id/resolve', officerCtl.resolveComplaint);
router.post('/complaints/:id/notes', officerCtl.addNote);
router.get('/complaints/:id/notes', officerCtl.getNotes);
router.post('/ai/chat', officerCtl.aiChat);

module.exports = router;
