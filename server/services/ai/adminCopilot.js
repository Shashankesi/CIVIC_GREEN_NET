const { generateGroqCompletion } = require('./groqChatService');
const {
  getUnresolvedByCategory,
  getCriticalToday,
  getDepartmentAnalytics,
  getSLABreaches,
  getWardAnalytics,
  getHighestPriorityComplaints,
  getOfficerPerformanceAnalytics,
  getComplaintTrends,
  getGISHotspots,
  getReopenedComplaints,
  getCivicHealth
} = require('./aiTools');
const { formatCopilotResponse, formatAdminFallback } = require('./aiResponseFormatter');
const logger = require('../../utils/logger');

// ==========================================
// ADMIN COPILOT INTENT ROUTER
// ==========================================

function detectAdminIntent(question) {
  const q = (question || '').toLowerCase();

  if (q.includes('highest overdue') || q.includes('overdue workload')) {
    return { intent: 'HIGHEST_OVERDUE_DEPARTMENT', params: {} };
  }

  if (q.includes('hotspot') || q.includes('biggest complaint area') || q.includes('cluster') || q.includes('geographic')) {
    return { intent: 'BIGGEST_HOTSPOT', params: {} };
  }

  if (q.includes('unresolved') || q.includes('open complaint') || q.includes('how many sanitation') || q.includes('how many road')) {
    let category = null;
    if (q.includes('sanitation') || q.includes('garbage')) category = 'sanitation';
    else if (q.includes('road') || q.includes('pothole')) category = 'roads';
    else if (q.includes('water') || q.includes('drain')) category = 'drainage';
    else if (q.includes('light') || q.includes('electric')) category = 'lighting';
    return { intent: 'UNRESOLVED_BY_CATEGORY', params: { category } };
  }

  if (q.includes('department') && (q.includes('overdue') || q.includes('workload') || q.includes('highest') || q.includes('performance') || q.includes('summary'))) {
    return { intent: 'DEPARTMENT_SUMMARY', params: {} };
  }

  if (q.includes('ward') || (q.includes('area') && q.includes('unresolved')) || q.includes('zone')) {
    return { intent: 'WARD_UNRESOLVED', params: {} };
  }

  if (q.includes('sla breach') || q.includes('breached sla') || q.includes('overdue complaint') || q.includes('delayed')) {
    return { intent: 'SLA_BREACHES', params: {} };
  }

  if (q.includes('officer') && (q.includes('compliance') || q.includes('performance') || q.includes('workload') || q.includes('attention') || q.includes('best'))) {
    return { intent: 'OFFICER_PERFORMANCE', params: {} };
  }

  if (q.includes('trend') || q.includes('increasing') || q.includes('rising') || q.includes('surge')) {
    return { intent: 'COMPLAINT_TRENDS', params: {} };
  }

  if (q.includes('reopen') || q.includes('recurring') || q.includes('repeated')) {
    return { intent: 'REOPENED_CASES', params: {} };
  }

  if (q.includes('highest priority') || q.includes('top priority') || q.includes('urgent complaint') || q.includes('critical complaint')) {
    return { intent: 'HIGHEST_PRIORITY', params: {} };
  }

  if (q.includes('critical') || q.includes('emergency') || q.includes('attention today') || q.includes('today')) {
    return { intent: 'CRITICAL_TODAY', params: {} };
  }

  if (q.includes('resolution rate') || q.includes('civic health') || q.includes('city summary') || q.includes('overview') || q.includes('snapshot')) {
    return { intent: 'CIVIC_HEALTH', params: {} };
  }

  return { intent: 'CIVIC_HEALTH', params: {} };
}

const ADMIN_COPILOT_PROMPT = `You are the Civic GreenNet Admin Governance Copilot.
Analyze the verified PostgreSQL/PostGIS municipal data provided below and produce an authoritative executive briefing.

CRITICAL INSTRUCTIONS:
1. Report ONLY the exact numbers, department names, ward statistics, and counts from the provided data.
2. NEVER invent, extrapolate, or hallucinate metrics.
3. Structure your answer with clear bullet points, highlighting key numbers and IDs in bold (**text**).
4. Provide 1-2 actionable operational recommendations for city leadership.
5. Return a valid JSON object:
   {
     "explanation": "Your structured natural language briefing",
     "summary": "1-2 sentence executive briefing",
     "recommendations": ["Action item 1", "Action item 2"]
   }`;

/**
 * Process Admin Governance Copilot query with Level-1 Groq & Level-2 Deterministic Fallback
 */
async function processAdminChat({ adminId, message, context = {} }) {
  const startTime = Date.now();
  const { intent, params = {} } = detectAdminIntent(message);

  let dbData = null;
  let cards = [];
  let updatedContext = { ...context };

  // 1. Execute Role-Scoped Admin Analytical Tool
  try {
    switch (intent) {
      case 'UNRESOLVED_BY_CATEGORY': {
        dbData = await getUnresolvedByCategory(params.category);
        break;
      }

      case 'CRITICAL_TODAY': {
        const crit = await getCriticalToday();
        dbData = crit;
        cards = (crit.complaints || []).slice(0, 5);
        break;
      }

      case 'HIGHEST_OVERDUE_DEPARTMENT':
      case 'DEPARTMENT_SUMMARY': {
        dbData = await getDepartmentAnalytics();
        break;
      }

      case 'SLA_BREACHES': {
        const breaches = await getSLABreaches();
        dbData = breaches;
        cards = (breaches.breaches || []).slice(0, 5);
        break;
      }

      case 'WARD_UNRESOLVED': {
        dbData = await getWardAnalytics();
        break;
      }

      case 'HIGHEST_PRIORITY': {
        const hp = await getHighestPriorityComplaints();
        dbData = hp;
        cards = (hp.complaints || []).slice(0, 5);
        break;
      }

      case 'OFFICER_PERFORMANCE': {
        dbData = await getOfficerPerformanceAnalytics();
        break;
      }

      case 'COMPLAINT_TRENDS': {
        dbData = await getComplaintTrends();
        break;
      }

      case 'BIGGEST_HOTSPOT':
      case 'GIS_HOTSPOTS': {
        dbData = await getGISHotspots();
        break;
      }

      case 'REOPENED_CASES': {
        const reop = await getReopenedComplaints();
        dbData = reop;
        cards = (reop.complaints || []).slice(0, 5);
        break;
      }

      case 'CIVIC_HEALTH':
      default: {
        dbData = await getCivicHealth();
        break;
      }
    }
  } catch (dbErr) {
    logger.error('[Admin Copilot DB Error]', { error: dbErr.message, adminId, intent });
    dbData = null;
  }

  // 2. Generate Level 1 (Groq LLM) Response
  let copilotResponse = null;
  let aiSuccess = false;

  if (dbData) {
    try {
      const aiInput = `ADMIN LEADERSHIP QUESTION: "${message}"
INTENT: ${intent}
VERIFIED MUNICIPAL DATABASE DATA:
${JSON.stringify(dbData, null, 2)}`;

      const aiParsed = await generateGroqCompletion({
        systemPrompt: ADMIN_COPILOT_PROMPT,
        userMessage: aiInput,
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 800
      });

      if (aiParsed && (aiParsed.explanation || aiParsed.answer)) {
        copilotResponse = formatCopilotResponse({
          answer: aiParsed.explanation || aiParsed.answer,
          summary: aiParsed.summary || null,
          data: dbData,
          recommendations: aiParsed.recommendations || [],
          intent,
          confidence: 0.99,
          cards
        });
        aiSuccess = true;
      }
    } catch (groqErr) {
      logger.warn('[Admin Copilot AI Issue] Utilizing Level 2 deterministic fallback', {
        error: groqErr.message,
        intent
      });
    }
  }

  // 3. Level 2 Deterministic Fallback if Groq was unavailable
  if (!copilotResponse) {
    copilotResponse = formatAdminFallback(intent, dbData, message);
    if (cards.length > 0) {
      copilotResponse.cards = cards;
    }
  }

  const durationMs = Date.now() - startTime;
  logger.info(`[copilot] role=admin intent=${intent} adminId=${adminId} duration=${durationMs}ms ai=${aiSuccess ? 'groq' : 'level2_deterministic'} status=success`);

  return {
    ...copilotResponse,
    context: updatedContext,
    durationMs
  };
}

/**
 * Backward compatibility helper for existing callers
 */
async function processAdminCopilotQuery(question) {
  const res = await processAdminChat({ adminId: 1, message: question });
  return {
    question,
    intent: res.intent,
    verifiedData: res.data,
    explanation: res.answer,
    summary: res.summary,
    recommendations: res.recommendations,
    isAuthoritative: true,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  processAdminChat,
  processAdminCopilotQuery,
  detectAdminIntent,
  detectIntent: detectAdminIntent
};
