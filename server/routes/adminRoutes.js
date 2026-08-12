const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const adminCtl = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authenticate, authorize(['admin']));

// Dashboard
router.get('/dashboard', adminCtl.dashboard);

// User management
router.get('/users', adminCtl.listUsers);
router.get('/users/:id', adminCtl.getUser);
router.put('/users/:id', adminCtl.updateUser);
router.put('/users/:id/role', adminCtl.updateRole);
router.put('/users/:id/status', adminCtl.updateStatus);
router.post('/users/:id/approve', adminCtl.approveOfficer);

// Departments
router.get('/departments', adminCtl.listDepartments);
router.get('/departments/officers', adminCtl.listOfficers);
router.get('/departments/:id', adminCtl.getDepartment);
router.post('/departments', adminCtl.createDepartment);
router.put('/departments/:id', adminCtl.updateDepartment);
router.delete('/departments/:id', adminCtl.deleteDepartment);

// Assignments
router.post('/assignments', adminCtl.assignComplaint);
router.post('/assignments/:complaintId/unassign', adminCtl.unassignComplaint);

// Complaints
router.get('/complaints', adminCtl.listComplaints);
router.get('/complaints/:id', adminCtl.getComplaint);
router.patch('/complaints/:id', adminCtl.updateComplaint);

// Audit Logs
router.get('/audit-logs', adminCtl.listAuditLogs);

// System Health
router.get('/system-health', adminCtl.listSystemHealth);

// Email Center
router.get('/email-logs', adminCtl.listEmailLogs);
router.get('/email-stats', adminCtl.getEmailStats);
router.post('/email-logs/:id/retry', adminCtl.retryEmail);

// Reports
router.get('/reports/summary', adminCtl.reportSummary);
router.get('/reports/complaints', adminCtl.reportComplaints);
router.get('/reports/export', adminCtl.exportReport);

module.exports = router;
