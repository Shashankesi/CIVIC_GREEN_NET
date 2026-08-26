const { generateGroqCompletion } = require('./groqChatService');
const {
  getOfficerAssignments,
  getOfficerPriorityCases,
  getOfficerSLARisks,
  getOfficerPerformance,
  getOfficerReputation,
  getNearbyOperationalIssues,
  calculateComplaintPriority
} = require('./aiTools');
const { formatCopilotResponse, formatOfficerFallback } = require('./aiResponseFormatter');
const logger = require('../../utils/logger');

// ==========================================
// OFFICER COPILOT INTENT ROUTER
// ==========================================

function detectOfficerIntent(message) {
  const q = (message || '').toLowerCase();

  // Priority & what to handle first
  if (q.includes('handle first') || q.includes('prioritize') || q.includes('highest priority') || q.includes('top priority') || q.includes('what should i do') || q.includes('where to start')) {
    return { intent: 'MY_PRIORITY_CASES' };
  }

  // SLA breaches & risks
  if (q.includes('sla') || q.includes('breach') || q.includes('overdue') || q.includes('due soon') || q.includes('deadline') || q.includes('at risk')) {
    return { intent: 'MY_SLA_RISK' };
  }

  // Performance, resolution rate, monthly stats
  if (q.includes('performance') || q.includes('resolution rate') || q.includes('resolved this month') || q.includes('how am i doing') || q.includes('compliance')) {
    return { intent: 'MY_PERFORMANCE' };
  }

  // Points & leaderboard rank
  if (q.includes('point') || q.includes('rank') || q.includes('score') || q.includes('leaderboard') || q.includes('badge') || q.includes('reputation')) {
    return { intent: 'MY_POINTS' };
  }

  // Nearby issues / field operations
  if (q.includes('near') || q.includes('around') || q.includes('area') || q.includes('field') || q.includes('neighbourhood') || q.includes('neighborhood')) {
    return { intent: 'NEARBY_ISSUES' };
  }

  // Default: current workload / assignments
  return { intent: 'MY_WORKLOAD' };
}

const OFFICER_COPILOT_PROMPT = `You are the Civic GreenNet Officer Operations Copilot.
Your job is to advise the municipal field officer on prioritizing their workload and meeting SLA commitments based strictly on the verified PostgreSQL data provided below.

CRITICAL INSTRUCTIONS:
1. When answering "What should I handle first?" or priority queries:
   - Rank the cases strictly in the order of the deterministic priority score calculated by the database layer.
   - For each case, state its CGN ID, category, severity, and hours remaining until SLA breach or hours overdue.
   - Explain clearly WHY the top case is ranked highest (e.g. highest severity + nearest SLA deadline).
2. Report exact numbers from the data. NEVER hallucinate numbers or cases.
3. Suggest a concrete operational next step for the officer.
4. Format key numbers and case IDs in bold.
5. Return a valid JSON object:
   {
     "explanation": "Your structured natural language briefing",
     "summary": "1-2 sentence executive summary",
     "recommendations": ["Action item 1", "Action item 2"]
   }`;

/**
 * Process an Officer Copilot query with Level-1 Groq & Level-2 Deterministic Fallback
 */
async function processOfficerChat({ officerId, message, context = {} }) {
  const startTime = Date.now();
  const { intent } = detectOfficerIntent(message);

  let dbData = null;
  let cards = [];
  let updatedContext = { ...context };

  // 1. Execute Role-Scoped Database Tool
  try {
    switch (intent) {
      case 'MY_PRIORITY_CASES': {
        const priorityCases = await getOfficerPriorityCases(officerId);
        dbData = priorityCases;
        cards = priorityCases.slice(0, 4);
        if (cards.length > 0) {
          updatedContext.lastComplaintId = cards[0].rawId;
          updatedContext.priorityCaseIds = cards.map(c => c.rawId);
        }
        break;
      }

      case 'MY_SLA_RISK': {
        const slaRisks = await getOfficerSLARisks(officerId);
        dbData = slaRisks;
        cards = slaRisks.slice(0, 4);
        break;
      }

      case 'MY_PERFORMANCE': {
        dbData = await getOfficerPerformance(officerId);
        break;
      }

      case 'MY_POINTS': {
        dbData = await getOfficerReputation(officerId);
        break;
      }

      case 'NEARBY_ISSUES': {
        const nearby = await getNearbyOperationalIssues(officerId);
        dbData = nearby;
        cards = nearby.slice(0, 4);
        break;
      }

      case 'MY_WORKLOAD':
      default: {
        const assignments = await getOfficerAssignments(officerId);
        dbData = assignments;
        cards = assignments.slice(0, 5);
        break;
      }
    }
  } catch (dbErr) {
    logger.error('[Officer Copilot DB Error]', { error: dbErr.message, officerId, intent });
    dbData = null;
  }

  // 2. Generate Level 1 (Groq LLM) Response
  let copilotResponse = null;
  let aiSuccess = false;

  if (dbData) {
    try {
      const aiInput = `OFFICER QUERY: "${message}"
INTENT: ${intent}
VERIFIED ASSIGNED WORKLOAD DATA:
${JSON.stringify(dbData, null, 2)}`;

      const aiParsed = await generateGroqCompletion({
        systemPrompt: OFFICER_COPILOT_PROMPT,
        userMessage: aiInput,
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 700
      });

      if (aiParsed && (aiParsed.explanation || aiParsed.answer)) {
        copilotResponse = formatCopilotResponse({
          answer: aiParsed.explanation || aiParsed.answer,
          summary: aiParsed.summary || null,
          data: dbData,
          recommendations: aiParsed.recommendations || [],
          intent,
          confidence: 0.98,
          cards
        });
        aiSuccess = true;
      }
    } catch (groqErr) {
      logger.warn('[Officer Copilot AI Issue] Utilizing Level 2 deterministic fallback', {
        error: groqErr.message,
        intent
      });
    }
  }

  // 3. Level 2 Deterministic Fallback if Groq was unavailable
  if (!copilotResponse) {
    copilotResponse = formatOfficerFallback(intent, dbData, message);
    if (cards.length > 0) {
      copilotResponse.cards = cards;
    }
  }

  const durationMs = Date.now() - startTime;
  logger.info(`[copilot] role=officer intent=${intent} officerId=${officerId} duration=${durationMs}ms ai=${aiSuccess ? 'groq' : 'level2_deterministic'} status=success`);

  return {
    ...copilotResponse,
    context: updatedContext,
    durationMs
  };
}

module.exports = {
  processOfficerChat,
  detectOfficerIntent
};
