const { generateGroqCompletion } = require('./groqChatService');
const {
  getOfficerWorkload,
  getOfficerPriorityCases,
  getOfficerSlaAlerts,
  getOfficerDepartmentWorkload,
  getOfficerPerformance,
  getOfficerPoints,
  getOfficerReputation,
  getOfficerAssignments,
  getOfficerComplaintDetails,
  getNearbyIssuesForOfficer,
  getOfficerTodaySummary
} = require('./aiTools');
const { formatCopilotResponse, formatOfficerFallback } = require('./aiResponseFormatter');
const logger = require('../../utils/logger');

// ==========================================
// DETERMINISTIC INTENT MATCHER (FAST-PATH)
// ==========================================

function fastMatchOfficerIntent(message) {
  const q = (message || '').toLowerCase().trim();

  // 1. Complaint ID details pattern (e.g. CGN-00123, #123, complaint 55)
  const cgnMatch = q.match(/cgn-?\d+/i) || q.match(/complaint\s+#?(\d+)/i) || q.match(/#(\d+)/);
  if (cgnMatch && (q.includes('tell me about') || q.includes('show') || q.includes('details') || q.includes('status') || q.includes('view') || q.includes('what is'))) {
    return {
      intent: 'COMPLAINT_DETAILS',
      parameters: { complaintId: cgnMatch[0].toUpperCase() }
    };
  }

  // 2. Greetings
  if (
    q === 'hi' || q === 'hii' || q === 'hello' || q === 'hey' ||
    q === 'good morning' || q === 'good afternoon' || q === 'good evening' ||
    q.startsWith('hi ') || q.startsWith('hello ') || q.startsWith('hey ')
  ) {
    return { intent: 'GREETING', parameters: {} };
  }

  // 3. Help
  if (q === 'help' || q.includes('what can you do') || q.includes('how to use') || q.includes('copilot commands')) {
    return { intent: 'HELP', parameters: {} };
  }

  // 4. Priority & what to handle first
  if (
    q.includes('priority') || q.includes('handle first') || q.includes('prioritize') ||
    q.includes('what should i do') || q.includes('where to start') || q.includes('urgent complaint') ||
    q.includes('what needs attention first') || q.includes('highest-priority')
  ) {
    return { intent: 'PRIORITY_CASES', parameters: {} };
  }

  // 5. SLA Alerts & Overdue
  if (
    q.includes('sla') || q.includes('breach') || q.includes('overdue') ||
    q.includes('due soon') || q.includes('deadline') || q.includes('at risk') ||
    q.includes('close to breach')
  ) {
    return { intent: 'SLA_ALERTS', parameters: {} };
  }

  // 6. Department Workload
  if (
    q.includes('department workload') || q.includes('workload of my department') ||
    q.includes('across my department') || q.includes('department summary') ||
    (q.includes('department') && (q.includes('workload') || q.includes('queue') || q.includes('status')))
  ) {
    return { intent: 'DEPARTMENT_WORKLOAD', parameters: {} };
  }

  // 7. Today focus
  if (q.includes('focus on today') || q.includes('today focus') || q.includes("today's focus") || q.includes('today summary') || q.includes('for today')) {
    return { intent: 'TODAY_SUMMARY', parameters: {} };
  }

  // 8. Performance & resolution rate
  if (
    q.includes('performance') || q.includes('resolution rate') || q.includes('compliance rate') ||
    q.includes('how am i doing') || q.includes('my stats') || q.includes('resolved this month')
  ) {
    return { intent: 'MY_PERFORMANCE', parameters: {} };
  }

  // 9. Points & reputation
  if (
    q.includes('point') || q.includes('badge') || q.includes('civic points') ||
    q.includes('how many points')
  ) {
    return { intent: 'MY_POINTS', parameters: {} };
  }

  // 10. Leaderboard & Rank
  if (
    q.includes('rank') || q.includes('leaderboard') || q.includes('reputation') ||
    q.includes('officer rank')
  ) {
    return { intent: 'MY_REPUTATION', parameters: {} };
  }

  // 11. Workload / Assignments
  if (
    q.includes('my workload') || q.includes('assigned to me') || q.includes('my work') ||
    q.includes('active workload') || q.includes('how many complaints are assigned') ||
    q.includes('my assignments') || q.includes('assigned complaints')
  ) {
    return { intent: 'MY_WORKLOAD', parameters: {} };
  }

  // 12. Nearby / Field issues
  if (
    q.includes('near') || q.includes('around') || q.includes('field issues') ||
    q.includes('neighbourhood') || q.includes('neighborhood')
  ) {
    return { intent: 'NEARBY_ISSUES', parameters: {} };
  }

  // 13. Ambiguous problem question (e.g. "is there any problem")
  if (q.includes('problem') || q.includes('any issue') || q.includes('anything wrong')) {
    return { intent: 'UNKNOWN', parameters: {} };
  }

  return null;
}

const INTENT_ROUTER_PROMPT = `You are the Officer Copilot intent router for Civic GreenNet.
Determine the single best intent for the authenticated officer's question.

Allowed Intents:
- GREETING: Conversational hello/greetings (e.g. "hi", "hello", "hey")
- HELP: Usage guide (e.g. "help", "what can you do")
- MY_WORKLOAD: Summary of active assignments (e.g. "show my workload", "my active cases")
- PRIORITY_CASES: Highest priority complaints or what to handle first (e.g. "what should I handle first?", "priority issues")
- SLA_ALERTS: Complaints close to deadline or overdue (e.g. "which cases are close to SLA breach?")
- DEPARTMENT_WORKLOAD: Department-wide queue and overdue workload
- MY_PERFORMANCE: Resolution rate, SLA compliance %, cases resolved
- MY_POINTS: Civic points earned and rules
- MY_REPUTATION: Officer leaderboard rank and designation
- MY_ASSIGNMENTS: List of complaints assigned to officer
- COMPLAINT_DETAILS: Specific complaint query by ID (e.g. "tell me about CGN-1042")
- NEARBY_ISSUES: Open complaints in area
- TODAY_SUMMARY: Overall priority briefing for today
- UNKNOWN: Ambiguous query requiring clarification

Return strictly valid JSON:
{
  "intent": "<ONE_OF_ALLOWED_INTENTS>",
  "complaintId": "<Extracted ID or null>"
}`;

/**
 * Robust Intent Detection (Groq NLU with fast deterministic fallback)
 */
async function detectOfficerIntent(message) {
  const fast = fastMatchOfficerIntent(message);
  if (fast) {
    return fast;
  }

  // If not matched deterministically, use Groq NLU
  try {
    const aiParsed = await generateGroqCompletion({
      systemPrompt: INTENT_ROUTER_PROMPT,
      userMessage: message,
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 100
    });

    if (aiParsed && aiParsed.intent) {
      return {
        intent: aiParsed.intent,
        parameters: { complaintId: aiParsed.complaintId || null }
      };
    }
  } catch (err) {
    logger.warn('[Officer Copilot] NLU intent classification failed, falling back to UNKNOWN:', err.message);
  }

  return { intent: 'UNKNOWN', parameters: {} };
}

const OFFICER_COPILOT_PROMPT = `You are the Civic GreenNet Officer Operations Copilot.
Your job is to advise the municipal field officer on prioritizing their workload, meeting SLA commitments, and managing civic operations based strictly on the verified PostgreSQL data provided below.

CRITICAL INSTRUCTIONS:
1. When answering "What should I handle first?" or priority queries:
   - Rank the cases strictly in the order of the deterministic priority score calculated by the database layer.
   - For each case, state its CGN ID, category, severity, and hours remaining until SLA breach or hours overdue.
   - Explain clearly WHY the top case is ranked highest (e.g. highest severity + nearest SLA deadline).
2. Report exact numbers from the data. NEVER hallucinate numbers or cases.
3. Suggest a concrete operational next step for the officer.
4. Format key numbers and case IDs in bold (**text**).
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
  const { intent, parameters = {} } = await detectOfficerIntent(message);

  let dbData = null;
  let cards = [];
  let toolName = 'none';
  let dbStartTime = Date.now();

  // 1. Execute Role-Scoped Database Tool
  try {
    switch (intent) {
      case 'PRIORITY_CASES':
      case 'MY_PRIORITY_CASES': {
        toolName = 'getOfficerPriorityCases';
        const priorityRes = await getOfficerPriorityCases(officerId);
        dbData = priorityRes;
        cards = (priorityRes.assignedPriorityCases || []).slice(0, 4);
        break;
      }

      case 'SLA_ALERTS':
      case 'MY_SLA_RISK': {
        toolName = 'getOfficerSlaAlerts';
        const slaRes = await getOfficerSlaAlerts(officerId);
        dbData = slaRes;
        cards = [...(slaRes.overdue || []), ...(slaRes.dueWithin2Hours || []), ...(slaRes.dueWithin6Hours || [])].slice(0, 4);
        break;
      }

      case 'DEPARTMENT_WORKLOAD': {
        toolName = 'getOfficerDepartmentWorkload';
        dbData = await getOfficerDepartmentWorkload(officerId);
        break;
      }

      case 'MY_PERFORMANCE': {
        toolName = 'getOfficerPerformance';
        dbData = await getOfficerPerformance(officerId);
        break;
      }

      case 'MY_POINTS': {
        toolName = 'getOfficerPoints';
        dbData = await getOfficerPoints(officerId);
        break;
      }

      case 'MY_REPUTATION': {
        toolName = 'getOfficerReputation';
        dbData = await getOfficerReputation(officerId);
        break;
      }

      case 'MY_ASSIGNMENTS': {
        toolName = 'getOfficerAssignments';
        const assignments = await getOfficerAssignments(officerId);
        dbData = assignments;
        cards = assignments.slice(0, 5);
        break;
      }

      case 'COMPLAINT_DETAILS':
      case 'COMPLAINT_STATUS': {
        toolName = 'getOfficerComplaintDetails';
        const complaintId = parameters.complaintId || context.lastComplaintId;
        if (complaintId) {
          const detailRes = await getOfficerComplaintDetails(officerId, complaintId);
          dbData = detailRes;
          if (!detailRes.error) {
            cards = [detailRes];
          }
        } else {
          dbData = { error: 'Please specify the complaint ID (e.g. CGN-00123).' };
        }
        break;
      }

      case 'NEARBY_ISSUES': {
        toolName = 'getNearbyIssuesForOfficer';
        const nearby = await getNearbyIssuesForOfficer(officerId);
        dbData = nearby;
        cards = nearby.slice(0, 4);
        break;
      }

      case 'TODAY_SUMMARY': {
        toolName = 'getOfficerTodaySummary';
        const today = await getOfficerTodaySummary(officerId);
        dbData = today;
        cards = (today.topPriorityCases || []).slice(0, 3);
        break;
      }

      case 'MY_WORKLOAD': {
        toolName = 'getOfficerWorkload';
        const workload = await getOfficerWorkload(officerId);
        dbData = workload;
        cards = (workload.cases || []).slice(0, 5);
        break;
      }

      case 'GREETING':
      case 'HELP':
      case 'UNKNOWN':
      default: {
        toolName = 'none';
        dbData = null;
        break;
      }
    }
  } catch (dbErr) {
    logger.error('[Officer Copilot DB Error]', { error: dbErr.message, officerId, intent });
    dbData = null;
  }

  const dbDurationMs = Date.now() - dbStartTime;

  // 2. Generate Level 1 (Groq LLM) Response
  let copilotResponse = null;
  let aiSuccess = false;
  let aiStartTime = Date.now();

  // For GREETING, HELP, or queries with DB data, attempt Groq response
  if (intent === 'GREETING' || intent === 'HELP' || intent === 'UNKNOWN' || dbData !== null) {
    try {
      const aiInput = `OFFICER INQUIRY: "${message}"
INTENT: ${intent}
DATABASE CONTEXT:
${dbData ? JSON.stringify(dbData, null, 2) : 'No direct database record needed for conversational or clarification response.'}`;

      const aiParsed = await generateGroqCompletion({
        systemPrompt: OFFICER_COPILOT_PROMPT,
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

  const aiDurationMs = Date.now() - aiStartTime;

  // 3. Level 2 Deterministic Fallback if Groq was unavailable
  if (!copilotResponse) {
    copilotResponse = formatOfficerFallback(intent, dbData, message);
    if (cards.length > 0) {
      copilotResponse.cards = cards;
    }
  }

  const totalDurationMs = Date.now() - startTime;

  // Diagnostic logging
  logger.info(`[OFFICER_COPILOT] userId=${officerId} question="${message}" intent="${intent}" tool="${toolName}" dbDurationMs=${dbDurationMs} aiDurationMs=${aiDurationMs} totalDurationMs=${totalDurationMs} status=success`);

  return {
    ...copilotResponse,
    context: {
      ...context,
      lastIntent: intent,
      lastComplaintId: cards[0]?.rawId || context.lastComplaintId
    },
    durationMs: totalDurationMs
  };
}

module.exports = {
  processOfficerChat,
  detectOfficerIntent,
  fastMatchOfficerIntent
};
