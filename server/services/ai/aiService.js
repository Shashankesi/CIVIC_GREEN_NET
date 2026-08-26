const db = require('../../config/db');
const conversationService = require('./aiConversationService');
const { processCitizenChat } = require('./citizenCopilot');
const { processOfficerChat } = require('./officerCopilot');
const { processAdminChat } = require('./adminCopilot');
const logger = require('../../utils/logger');

/**
 * Main AI Orchestrator service.
 * Routes user messages securely to the appropriate role copilot.
 */
async function processUserMessage({ userId, role, conversationId, message, complaintContextId = null }) {
  if (!message || !message.trim()) {
    throw new Error('Message content is required');
  }

  const normalizedRole = ['citizen', 'officer', 'admin'].includes(role) ? role : 'citizen';

  // 1. Fetch user details for context
  const userRes = await db.query(
    `SELECT u.name, u.role, d.name AS department_name 
     FROM users u 
     LEFT JOIN departments d ON d.id = u.department_id 
     WHERE u.id = $1`,
    [userId]
  );
  const user = userRes.rows[0] || { name: 'User', role: normalizedRole };

  // 2. Load or create conversation session
  let conv = null;
  if (conversationId) {
    conv = await conversationService.getConversationById(conversationId, userId);
  }

  if (!conv) {
    const defaultTitle = message.trim().slice(0, 40) + (message.length > 40 ? '...' : '');
    conv = await conversationService.createConversation(
      userId,
      normalizedRole,
      defaultTitle,
      complaintContextId ? { lastComplaintId: complaintContextId } : {}
    );
  } else if (complaintContextId && (!conv.context || conv.context.lastComplaintId !== complaintContextId)) {
    await conversationService.updateContext(conv.id, userId, { lastComplaintId: complaintContextId });
    conv.context = { ...conv.context, lastComplaintId: complaintContextId };
  }

  // 3. Save user's incoming message to DB
  const userMsgRecord = await conversationService.addMessage({
    conversationId: conv.id,
    role: 'user',
    content: message.trim()
  });

  const sessionContext = conv.context || {};

  // 4. Dispatch strictly to Role Copilot
  let copilotResult;
  if (normalizedRole === 'officer') {
    copilotResult = await processOfficerChat({
      officerId: userId,
      message: message.trim(),
      context: sessionContext
    });
  } else if (normalizedRole === 'admin') {
    copilotResult = await processAdminChat({
      adminId: userId,
      message: message.trim(),
      context: sessionContext
    });
  } else {
    // citizen
    copilotResult = await processCitizenChat({
      userId,
      message: message.trim(),
      context: sessionContext
    });
  }

  // 5. Update session context memory
  if (copilotResult.context && Object.keys(copilotResult.context).length > 0) {
    await conversationService.updateContext(conv.id, userId, copilotResult.context);
    conv.context = copilotResult.context;
  }

  // 6. Persist assistant response to DB
  const assistantContent = copilotResult.answer || 'I have analyzed your request.';
  const aiMsgRecord = await conversationService.addMessage({
    conversationId: conv.id,
    role: 'assistant',
    content: assistantContent,
    toolResult: copilotResult.cards && copilotResult.cards.length > 0 ? copilotResult.cards : null
  });

  // 7. Return complete structured response with metadata
  return {
    conversationId: conv.id,
    title: conv.title,
    userMessage: userMsgRecord,
    assistantMessage: {
      id: aiMsgRecord.id,
      role: 'assistant',
      content: assistantContent,
      summary: copilotResult.summary || null,
      cards: copilotResult.cards || [],
      recommendations: copilotResult.recommendations || [],
      intent: copilotResult.intent,
      sources: copilotResult.sources || ['Civic GreenNet Database'],
      created_at: aiMsgRecord.created_at
    }
  };
}

module.exports = {
  processUserMessage
};
