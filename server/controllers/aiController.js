const db = require('../config/db');
const { success, error } = require('../utils/response');
const aiService = require('../services/ai/aiService');
const conversationService = require('../services/ai/aiConversationService');
const groqChatService = require('../services/ai/groqChatService');
const { classifyComplaint } = require('../services/ai/complaintClassifier');
const { detectDuplicates } = require('../services/ai/duplicateDetector');
const { getDuplicateClusters } = require('../services/ai/duplicateClustering');
const { detectRecurringIssues } = require('../services/ai/recurringIssueDetector');
const { analyzeHotspots } = require('../services/ai/hotspotAnalyzer');
const { recommendRouting } = require('../services/ai/routingEngine');
const { generateCaseSummary, generateOfficerChecklist } = require('../services/ai/summarizer');
const { 
  getDepartmentIntelligence, 
  getOfficerWorkloadIntelligence, 
  getResolutionInsights, 
  getPredictiveTrends 
} = require('../services/ai/insightGenerator');
const { processAdminCopilotQuery } = require('../services/ai/adminCopilot');
const { assistCitizenDraft } = require('../services/ai/citizenCopilot');
const complaintRepo = require('../repositories/complaintRepository');
const logger = require('../utils/logger');

/**
 * Handle AI chat interaction (Routes securely based on authenticated req.user.role)
 */
async function chat(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role || 'citizen';
    const { conversationId, message, complaintId } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return error(res, 'Message text is required', 400);
    }

    const result = await aiService.processUserMessage({
      userId,
      role,
      conversationId: conversationId ? parseInt(conversationId, 10) : null,
      message: message.trim(),
      complaintContextId: complaintId || null
    });

    return success(res, result, 'AI message processed successfully');
  } catch (err) {
    logger.error('[AI Controller Chat Error]', err);
    return error(res, err.message || 'Failed to process AI chat request', 500);
  }
}

/**
 * Dedicated Citizen Copilot Chat Handler
 */
async function citizenChat(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    const { conversationId, message, complaintId } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return error(res, 'Message text is required', 400);
    }

    const result = await aiService.processUserMessage({
      userId,
      role: 'citizen',
      conversationId: conversationId ? parseInt(conversationId, 10) : null,
      message: message.trim(),
      complaintContextId: complaintId || null
    });

    return success(res, result, 'Citizen assistant response processed');
  } catch (err) {
    logger.error('[Citizen Chat Controller Error]', err);
    return error(res, err.message || 'Failed to process citizen request', 500);
  }
}

/**
 * Dedicated Officer Copilot Chat Handler
 */
async function officerChat(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    const { conversationId, message, complaintId } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return error(res, 'Message text is required', 400);
    }

    const result = await aiService.processUserMessage({
      userId,
      role: 'officer',
      conversationId: conversationId ? parseInt(conversationId, 10) : null,
      message: message.trim(),
      complaintContextId: complaintId || null
    });

    return success(res, result, 'Officer copilot response processed');
  } catch (err) {
    logger.error('[Officer Chat Controller Error]', err);
    return error(res, err.message || 'Failed to process officer request', 500);
  }
}

/**
 * Dedicated Admin Governance Copilot Chat Handler
 */
async function adminChat(req, res) {
  try {
    const userId = req.user.userId || req.user.id;
    const { conversationId, message, complaintId } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return error(res, 'Message text is required', 400);
    }

    const result = await aiService.processUserMessage({
      userId,
      role: 'admin',
      conversationId: conversationId ? parseInt(conversationId, 10) : null,
      message: message.trim(),
      complaintContextId: complaintId || null
    });

    return success(res, result, 'Governance copilot response processed');
  } catch (err) {
    logger.error('[Admin Chat Controller Error]', err);
    return error(res, err.message || 'Failed to process admin request', 500);
  }
}

/**
 * Get AI analysis for a specific complaint
 */
async function getComplaintAnalysis(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) return error(res, 'Invalid complaint ID', 400);

    const complaint = await complaintRepo.getById(complaintId);
    if (!complaint) return error(res, 'Complaint not found', 404);

    // Access check: citizen can only view their own complaint analysis
    if (req.user.role === 'citizen' && complaint.user_id !== req.user.userId) {
      return error(res, 'Access denied: You can only view analysis of your own complaint', 403);
    }

    const aiRes = await db.query(
      `SELECT * FROM ai_analysis WHERE complaint_id = $1 ORDER BY id DESC LIMIT 1`,
      [complaintId]
    );

    let analysisRecord = aiRes.rows[0];
    if (!analysisRecord) {
      // Generate on-demand if not present
      const classified = await classifyComplaint({
        title: complaint.title,
        description: complaint.description,
        citizenCategory: complaint.category,
        address: complaint.address
      });
      return success(res, {
        complaintId,
        isGeneratedOnDemand: true,
        ...classified
      });
    }

    return success(res, analysisRecord);
  } catch (err) {
    logger.error('[Get Complaint Analysis Error]', err);
    return error(res, err.message, 500);
  }
}

/**
 * Trigger explicit re-classification of a complaint
 */
async function classifyComplaintEndpoint(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) return error(res, 'Invalid complaint ID', 400);

    const complaint = await complaintRepo.getById(complaintId);
    if (!complaint) return error(res, 'Complaint not found', 404);

    const classification = await classifyComplaint({
      title: complaint.title,
      description: complaint.description,
      citizenCategory: complaint.category,
      address: complaint.address
    });

    return success(res, classification, 'Complaint classified successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Human Override of AI Recommendation (Admin Only)
 */
async function overrideAiRecommendation(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) return error(res, 'Invalid complaint ID', 400);

    const { category, priority, departmentId, overrideReason } = req.body;
    if (!overrideReason || !overrideReason.trim()) {
      return error(res, 'overrideReason is required for accountability audit', 400);
    }

    const complaint = await complaintRepo.getById(complaintId);
    if (!complaint) return error(res, 'Complaint not found', 404);

    // Update complaint record in PostgreSQL
    const updates = {};
    if (category) updates.category = category;
    if (priority) updates.priority = priority;
    if (departmentId) updates.department_id = departmentId;
    if (Object.keys(updates).length > 0) {
      await complaintRepo.updateComplaint(complaintId, updates);
    }

    // Mark AI analysis as overridden
    await db.query(
      `UPDATE ai_analysis 
       SET is_overridden = true, overridden_by = $1, override_reason = $2, overridden_at = now()
       WHERE complaint_id = $3`,
      [req.user.userId, overrideReason.trim(), complaintId]
    );

    // Record in AI audit log
    await db.query(
      `INSERT INTO ai_audit_logs (complaint_id, event_type, model_used, recommendation, confidence, user_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [
        complaintId,
        'AI_OVERRIDE',
        'human:admin_override',
        { overriddenFields: updates, previousCategory: complaint.category, previousPriority: complaint.priority },
        1.00,
        req.user.userId,
        { overrideReason: overrideReason.trim() }
      ]
    );

    return success(res, { complaintId, overriddenFields: updates }, 'AI recommendation successfully overridden and audited');
  } catch (err) {
    logger.error('[AI Override Error]', err);
    return error(res, err.message, 500);
  }
}

/**
 * Get potential duplicates for a complaint
 */
async function getComplaintDuplicates(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) return error(res, 'Invalid complaint ID', 400);

    const complaint = await complaintRepo.getById(complaintId);
    if (!complaint) return error(res, 'Complaint not found', 404);

    const duplicates = await detectDuplicates({
      complaintId,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      lat: complaint.lat || (complaint.location && complaint.location.y),
      lng: complaint.lng || (complaint.location && complaint.location.x),
      address: complaint.address
    });

    return success(res, duplicates);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get duplicate clusters across the municipal database (Admin)
 */
async function getDuplicateClustersEndpoint(req, res) {
  try {
    const clusters = await getDuplicateClusters();
    return success(res, clusters);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get recurring civic issues (Admin)
 */
async function getRecurringIssuesEndpoint(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 60;
    const issues = await detectRecurringIssues(days);
    return success(res, issues);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get Civic Hotspots (Admin & Officer Map)
 */
async function getHotspotsEndpoint(req, res) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const category = req.query.category || null;
    const hotspots = await analyzeHotspots({ days, category });
    return success(res, hotspots);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get Time-based Predictive Trends (Admin)
 */
async function getTrendsEndpoint(req, res) {
  try {
    const timeframe = req.query.timeframe || '30d';
    const trends = await getPredictiveTrends(timeframe);
    return success(res, trends);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get Department Intelligence (Admin)
 */
async function getDepartmentInsightsEndpoint(req, res) {
  try {
    const insights = await getDepartmentIntelligence();
    return success(res, insights);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get Officer Workload Intelligence & Recommendations (Admin)
 */
async function getOfficerInsightsEndpoint(req, res) {
  try {
    const insights = await getOfficerWorkloadIntelligence();
    return success(res, insights);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get Resolution Insights & Quality Metrics (Admin)
 */
async function getResolutionInsightsEndpoint(req, res) {
  try {
    const insights = await getResolutionInsights();
    return success(res, insights);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get AI Case Summary for a complaint (Admin & Officer)
 */
async function getComplaintSummary(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) return error(res, 'Invalid complaint ID', 400);

    const summary = await generateCaseSummary(complaintId);
    if (!summary) return error(res, 'Complaint not found', 404);

    return success(res, summary);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Get Officer Field Action Checklist & Safety Guidelines (Officer & Admin)
 */
async function getOfficerChecklistEndpoint(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    if (isNaN(complaintId)) return error(res, 'Invalid complaint ID', 400);

    const checklist = await generateOfficerChecklist(complaintId);
    if (!checklist) return error(res, 'Complaint not found', 404);

    return success(res, checklist);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Citizen Drafting & Category Assistant
 */
async function assistCitizen(req, res) {
  try {
    const { title, description, category } = req.body;
    const assistance = await assistCitizenDraft({ title, description, citizenCategory: category });
    return success(res, assistance);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

/**
 * Admin Operations Copilot (Q&A with verified database counts)
 */
async function adminCopilotEndpoint(req, res) {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return error(res, 'Question text is required', 400);
    }

    const copilotResult = await processAdminCopilotQuery(question.trim());

    // Audit copilot query
    if (db._pool) {
      await db.query(
        `INSERT INTO ai_audit_logs (complaint_id, event_type, model_used, recommendation, confidence, user_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          null,
          'COPILOT_QUERY',
          'admin_copilot',
          { question, intent: copilotResult.intent },
          1.00,
          req.user.userId,
          { resultSummary: copilotResult.explanation }
        ]
      );
    }

    return success(res, copilotResult);
  } catch (err) {
    logger.error('[Admin Copilot Error]', err);
    return error(res, err.message, 500);
  }
}

// Conversation helpers
async function listConversations(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role || 'citizen';
    const conversations = await conversationService.getConversations(userId, role);
    return success(res, conversations);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

async function createConversation(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role || 'citizen';
    const { title = 'New Conversation', context = {} } = req.body;
    const conversation = await conversationService.createConversation(userId, role, title, context);
    return success(res, conversation, 'Conversation created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

async function getConversation(req, res) {
  try {
    const userId = req.user.userId;
    const conversationId = parseInt(req.params.id, 10);
    const conversation = await conversationService.getConversationById(conversationId, userId);
    if (!conversation) return error(res, 'Conversation not found', 404);
    const messages = await conversationService.getRecentMessages(conversationId, 50);
    return success(res, { ...conversation, messages });
  } catch (err) {
    return error(res, err.message, 500);
  }
}

async function updateTitle(req, res) {
  try {
    const userId = req.user.userId;
    const conversationId = parseInt(req.params.id, 10);
    const { title } = req.body;
    if (!title) return error(res, 'Title is required', 400);
    const updated = await conversationService.updateTitle(conversationId, userId, title);
    if (!updated) return error(res, 'Conversation not found', 404);
    return success(res, updated);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

async function deleteConversation(req, res) {
  try {
    const userId = req.user.userId;
    const conversationId = parseInt(req.params.id, 10);
    await conversationService.deleteConversation(conversationId, userId);
    return success(res, { id: conversationId }, 'Conversation deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
}

async function submitFeedback(req, res) {
  try {
    const userId = req.user.userId;
    const { messageId, rating } = req.body;
    if (!messageId || !['helpful', 'not_helpful'].includes(rating)) {
      return error(res, 'Valid messageId and rating (helpful/not_helpful) are required', 400);
    }
    const feedback = await conversationService.addFeedback(parseInt(messageId, 10), userId, rating);
    return success(res, feedback, 'Feedback recorded');
  } catch (err) {
    return error(res, err.message, 500);
  }
}

async function healthCheck(req, res) {
  try {
    const configured = groqChatService.isConfigured();
    return success(res, {
      status: configured ? 'Operational' : 'Not Configured',
      provider: 'Groq + Gemini Multi-Provider Engine',
      primaryModel: groqChatService.PRIMARY_MODEL,
      fallbackModel: groqChatService.FALLBACK_MODEL,
      configured
    });
  } catch (err) {
    return error(res, err.message, 500);
  }
}

module.exports = {
  chat,
  citizenChat,
  officerChat,
  adminChat,
  getComplaintAnalysis,
  classifyComplaintEndpoint,
  overrideAiRecommendation,
  getComplaintDuplicates,
  getDuplicateClustersEndpoint,
  getRecurringIssuesEndpoint,
  getHotspotsEndpoint,
  getTrendsEndpoint,
  getDepartmentInsightsEndpoint,
  getOfficerInsightsEndpoint,
  getResolutionInsightsEndpoint,
  getComplaintSummary,
  getOfficerChecklistEndpoint,
  assistCitizen,
  adminCopilotEndpoint,
  listConversations,
  createConversation,
  getConversation,
  updateTitle,
  deleteConversation,
  submitFeedback,
  healthCheck
};
