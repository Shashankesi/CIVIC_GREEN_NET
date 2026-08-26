const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');

// All AI endpoints require authentication
router.use(authenticate);

// ==========================================
// 1. Dedicated Role Copilot Routes (Strict RBAC)
// ==========================================

// Citizen Copilot
router.post('/citizen/chat', authorize(['citizen']), aiController.citizenChat);
router.post('/citizen/assist', aiController.assistCitizen);

// Officer Copilot
router.post('/officer/chat', authorize(['officer']), aiController.officerChat);

// Admin Governance Copilot
router.post('/admin/chat', authorize(['admin']), aiController.adminChat);

// Shared/Legacy Copilot Chat Endpoint (routes securely based on authenticated req.user.role)
router.post('/chat', aiController.chat);

// Conversation management
router.get('/conversations', aiController.listConversations);
router.post('/conversations', aiController.createConversation);
router.get('/conversations/:id', aiController.getConversation);
router.put('/conversations/:id/title', aiController.updateTitle);
router.delete('/conversations/:id', aiController.deleteConversation);
router.post('/feedback', aiController.submitFeedback);

// ==========================================
// 2. Complaint Intelligence Routes
// ==========================================
// Complaint Analysis (Citizen can view own; Officer/Admin can view any)
router.get('/complaints/:id/analysis', aiController.getComplaintAnalysis);

// Re-classify complaint (Admin & Officer)
router.post('/complaints/:id/classify', authorize(['admin', 'officer']), aiController.classifyComplaintEndpoint);

// Human Override AI Recommendation (Admin only)
router.post('/complaints/:id/override', authorize(['admin']), aiController.overrideAiRecommendation);

// Duplicate Detection for complaint (Admin & Officer)
router.get('/complaints/:id/duplicates', authorize(['admin', 'officer']), aiController.getComplaintDuplicates);

// AI Case Summary (Admin & Officer)
router.get('/complaints/:id/summary', authorize(['admin', 'officer']), aiController.getComplaintSummary);

// Officer Resolution Checklist & Safety Guidelines (Officer & Admin)
router.get('/complaints/:id/officer-checklist', authorize(['officer', 'admin']), aiController.getOfficerChecklistEndpoint);

// ==========================================
// 3. Municipal Intelligence & Analytics Routes (Admin & Officer)
// ==========================================
// Geographic Hotspots (Admin & Officer)
router.get('/hotspots', authorize(['admin', 'officer']), aiController.getHotspotsEndpoint);

// Duplicate Clusters across system (Admin only)
router.get('/duplicate-clusters', authorize(['admin']), aiController.getDuplicateClustersEndpoint);

// Recurring Civic Issues (Admin only)
router.get('/recurring-issues', authorize(['admin']), aiController.getRecurringIssuesEndpoint);

// Predictive Trends (Admin only)
router.get('/trends', authorize(['admin']), aiController.getTrendsEndpoint);

// Department Intelligence (Admin only)
router.get('/department-insights', authorize(['admin']), aiController.getDepartmentInsightsEndpoint);

// Officer Workload Intelligence & AI Recommendations (Admin only)
router.get('/officer-insights', authorize(['admin']), aiController.getOfficerInsightsEndpoint);

// Resolution Insights & Quality Metrics (Admin only)
router.get('/resolution-insights', authorize(['admin']), aiController.getResolutionInsightsEndpoint);

// Admin Operations Copilot (Admin only)
router.post('/copilot', authorize(['admin']), aiController.adminCopilotEndpoint);

// System health check (Admin only)
router.get('/health', authorize(['admin']), aiController.healthCheck);

module.exports = router;
