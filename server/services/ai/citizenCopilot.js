const { classifyComplaint } = require('./complaintClassifier');
const { executeStructuredAI } = require('./aiProvider');
const { generateGroqCompletion } = require('./groqChatService');
const {
  getMyComplaints,
  getMyComplaintById,
  getMyComplaintHistory,
  getMyReputation,
  getMyPointHistory,
  getPublicCivicStats,
  getCivicGuidelines,
  calculateComplaintPriority
} = require('./aiTools');
const { formatCopilotResponse, formatCitizenFallback } = require('./aiResponseFormatter');
const logger = require('../../utils/logger');

// ==========================================
// CITIZEN DRAFTING ASSISTANT (Form Helper)
// ==========================================

const CITIZEN_ASSIST_PROMPT = `You are the Civic GreenNet Citizen Drafting Assistant.
Help the citizen refine their complaint for fastest municipal response.

Return a valid JSON object:
{
  "suggestedCategory": "sanitation|roads|utilities|environment|public_safety|parks|lighting|drainage|noise|other",
  "suggestedTitle": "Crisp 5-8 word title",
  "refinedDescription": "Clear, objective description with helpful detail prompts",
  "recommendedEvidence": ["Photo of issue", "Nearest landmark or street sign", "Time of day"],
  "advice": "Friendly tip for faster resolution"
}`;

async function assistCitizenDraft({ title, description, citizenCategory = null }) {
  const text = `${title || ''}\n${description || ''}`.trim();
  if (!text) {
    return {
      suggestedCategory: 'sanitation',
      suggestedTitle: '',
      refinedDescription: '',
      recommendedEvidence: ['Take a clear photo showing the issue and surrounding landmark'],
      advice: 'Provide a clear description and specific address or landmark to help field officers locate the issue quickly.'
    };
  }

  const classification = await classifyComplaint({ title, description, citizenCategory });

  try {
    const aiRes = await executeStructuredAI({
      systemInstructions: CITIZEN_ASSIST_PROMPT,
      userInput: text,
      cachePrefix: 'cit_assist',
      timeoutMs: 4000
    });

    return {
      suggestedCategory: aiRes.data?.suggestedCategory || classification.category,
      suggestedTitle: aiRes.data?.suggestedTitle || title,
      refinedDescription: aiRes.data?.refinedDescription || description,
      recommendedEvidence: aiRes.data?.recommendedEvidence || ['Clear photograph of the defect', 'Nearby landmark'],
      advice: aiRes.data?.advice || 'Including specific landmarks helps our municipal crew resolve complaints 40% faster.',
      confidence: classification.confidence
    };
  } catch (err) {
    logger.warn('[Citizen Copilot] AI assist fallback:', { err: err.message });
    return {
      suggestedCategory: classification.category,
      suggestedTitle: title || `${classification.category.toUpperCase()} Issue Report`,
      refinedDescription: description,
      recommendedEvidence: ['Clear photograph', 'Nearest cross street / landmark'],
      advice: 'Please ensure location is marked accurately on the map.',
      confidence: classification.confidence
    };
  }
}

// ==========================================
// CITIZEN COPILOT INTENT ROUTER
// ==========================================

function detectCitizenIntent(message, context = {}) {
  const q = (message || '').toLowerCase();

  // Single complaint query (explicit ID like CGN-00123 or #123 or "status of")
  const idMatch = q.match(/cgn[-_]?(\d+)/i) || q.match(/#(\d+)/);
  if (idMatch || q.includes('status of complaint') || q.includes('why has my complaint not been resolved')) {
    const complaintId = idMatch ? idMatch[1] : (context.lastComplaintId || null);
    return { intent: 'COMPLAINT_STATUS', params: { complaintId } };
  }

  // Follow-up context queries (e.g. "which one is oldest", "which one should I follow up on first")
  if (q.includes('which one') || q.includes('follow up on first') || q.includes('oldest') || q.includes('most urgent')) {
    return { intent: 'MY_COMPLAINTS', params: { followUp: true } };
  }

  // Points, rank, rewards, false complaints
  if (q.includes('point') || q.includes('score') || q.includes('rank') || q.includes('badge') || q.includes('reputation') || q.includes('false complaint') || q.includes('earn more')) {
    return { intent: 'MY_POINTS', params: {} };
  }

  // History
  if (q.includes('history') || q.includes('past complaint') || q.includes('previous complaint') || q.includes('resolved complaint')) {
    return { intent: 'MY_HISTORY', params: {} };
  }

  // Civic guidance / how to report
  if (q.includes('how do i report') || q.includes('how to report') || q.includes('what information') || q.includes('who handles') || q.includes('process work') || q.includes('guideline')) {
    let category = 'general';
    if (q.includes('road') || q.includes('pothole')) category = 'roads';
    else if (q.includes('garbage') || q.includes('sanitation') || q.includes('waste')) category = 'sanitation';
    else if (q.includes('light') || q.includes('lamp')) category = 'lighting';
    else if (q.includes('water') || q.includes('drain') || q.includes('sewage')) category = 'drainage';
    return { intent: 'CIVIC_GUIDANCE', params: { category } };
  }

  // Public stats
  if (q.includes('city') || q.includes('public stat') || q.includes('overall') || q.includes('resolution rate')) {
    return { intent: 'PUBLIC_STATISTICS', params: {} };
  }

  // Default: my complaints / unresolved
  return { intent: 'MY_COMPLAINTS', params: {} };
}

const CITIZEN_COPILOT_PROMPT = `You are the Civic GreenNet Citizen Assistant.
Your job is to answer the citizen's question based strictly on the verified PostgreSQL municipal data provided below.

GUIDELINES:
1. Provide a direct, courteous, and structured answer.
2. Highlight exact complaint IDs (e.g. CGN-00042), categories, statuses, and dates.
3. If there are multiple active complaints, identify the oldest or most urgent if relevant.
4. Give a practical recommended next action.
5. Format key numbers and IDs in bold.
6. Return a JSON object with:
   - "explanation": "Your structured natural language response",
   - "summary": "One sentence summary",
   - "recommendations": ["Action item 1"]
7. NEVER invent or contradict database records. Output valid JSON only.`;

/**
 * Process a Citizen Copilot query with Level-1 Groq & Level-2 Deterministic Fallback
 */
async function processCitizenChat({ userId, message, context = {} }) {
  const startTime = Date.now();
  const { intent, params } = detectCitizenIntent(message, context);

  let dbData = null;
  let cards = [];
  let updatedContext = { ...context };

  // 1. Execute Role-Scoped Database Tool
  try {
    switch (intent) {
      case 'COMPLAINT_STATUS': {
        const idToQuery = params.complaintId || context.lastComplaintId;
        if (idToQuery) {
          dbData = await getMyComplaintById(userId, idToQuery);
          if (dbData) {
            cards = [dbData];
            updatedContext.lastComplaintId = dbData.rawId;
          }
        }
        if (!dbData) {
          // If ID not found or not provided, get the user's latest complaints
          const list = await getMyComplaints(userId, { limit: 5 });
          dbData = list[0] || null;
          if (dbData) cards = [dbData];
        }
        break;
      }

      case 'MY_POINTS':
      case 'MY_RANK': {
        dbData = await getMyReputation(userId);
        break;
      }

      case 'MY_HISTORY': {
        dbData = await getMyComplaintHistory(userId, 10);
        cards = dbData.slice(0, 4);
        break;
      }

      case 'CIVIC_GUIDANCE': {
        dbData = getCivicGuidelines(params.category);
        break;
      }

      case 'PUBLIC_STATISTICS': {
        dbData = await getPublicCivicStats();
        break;
      }

      case 'MY_COMPLAINTS':
      default: {
        const list = await getMyComplaints(userId, { limit: 15 });
        dbData = list;
        const active = list.filter(c => !['resolved', 'closed'].includes(c.status));
        cards = (active.length > 0 ? active : list).slice(0, 5);
        if (cards.length > 0) {
          updatedContext.lastComplaintId = cards[0].rawId;
          updatedContext.complaintIds = cards.map(c => c.rawId);
        }
        break;
      }
    }
  } catch (dbErr) {
    logger.error('[Citizen Copilot DB Error]', { error: dbErr.message, userId, intent });
    dbData = null;
  }

  // 2. Generate Level 1 (Groq LLM) Response
  let copilotResponse = null;
  let aiSuccess = false;

  if (dbData) {
    try {
      const aiInput = `USER QUESTION: "${message}"
INTENT: ${intent}
SESSION CONTEXT: ${JSON.stringify(context)}
VERIFIED POSTGRESQL DATA:
${JSON.stringify(dbData, null, 2)}`;

      const aiParsed = await generateGroqCompletion({
        systemPrompt: CITIZEN_COPILOT_PROMPT,
        userMessage: aiInput,
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 600
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
      logger.warn('[Citizen Copilot AI Issue] Utilizing Level 2 deterministic fallback', {
        error: groqErr.message,
        intent
      });
    }
  }

  // 3. Level 2 Deterministic Fallback if Groq was unavailable
  if (!copilotResponse) {
    copilotResponse = formatCitizenFallback(intent, dbData, message);
    if (cards.length > 0) {
      copilotResponse.cards = cards;
    }
  }

  const durationMs = Date.now() - startTime;
  logger.info(`[copilot] role=citizen intent=${intent} userId=${userId} duration=${durationMs}ms ai=${aiSuccess ? 'groq' : 'level2_deterministic'} status=success`);

  return {
    ...copilotResponse,
    context: updatedContext,
    durationMs
  };
}

module.exports = {
  assistCitizenDraft,
  processCitizenChat,
  detectCitizenIntent
};
