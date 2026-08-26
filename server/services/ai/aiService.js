const db = require('../../config/db');
const conversationService = require('./aiConversationService');
const { getSystemPrompt } = require('./aiPrompts');
const { getToolsForRole, formatToolsForGroq } = require('./aiTools');
const { executeChatLoop } = require('./groqChatService');

/**
 * Clean up accidental technical artifacts or raw function-calling leakages from LLM text output.
 */
function cleanAssistantContent(text) {
  if (!text) return 'I have processed your request.';
  let cleaned = String(text);

  // Strip technical debug phrases if LLM leaked them
  cleaned = cleaned.replace(/I can only provide the results based on the function calls made\.*/gi, '');
  cleaned = cleaned.replace(/based on the function calls made\.*/gi, '');
  cleaned = cleaned.replace(/the function returned\.*/gi, '');
  cleaned = cleaned.replace(/I will wait for the results\.*/gi, '');
  cleaned = cleaned.replace(/Complaint ID: Not available/gi, '');
  cleaned = cleaned.replace(/ID: Not available/gi, '');

  return cleaned.trim() || 'I have processed your request based on your municipal data.';
}

/**
 * Extract complaint objects from tool execution history in updatedMessages
 */
function extractComplaintCards(updatedMessages) {
  const cards = [];
  const seenIds = new Set();

  for (const m of updatedMessages) {
    if (m.role === 'tool' && m.content) {
      try {
        const parsed = JSON.parse(m.content);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          if (item && item.id && item.title && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            cards.push({
              id: item.id,
              rawId: item.rawId || parseInt(String(item.id).replace(/[^0-9]/g, ''), 10),
              title: item.title,
              category: item.category || 'General',
              priority: item.priority || 'medium',
              status: item.status || 'open',
              address: item.address || null,
              location: item.location || null,
              sla_due_at: item.sla_due_at || null,
              isOverdue: !!item.isOverdue
            });
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }
  }

  return cards;
}

/**
 * Main AI Orchestrator service.
 */
async function processUserMessage({ userId, role, conversationId, message, complaintContextId = null }) {
  if (!message || !message.trim()) {
    throw new Error('Message content is required');
  }

  // 1. Fetch user details for prompt customization
  const userRes = await db.query(
    `SELECT u.name, u.role, d.name AS department_name 
     FROM users u 
     LEFT JOIN departments d ON d.id = u.department_id 
     WHERE u.id = $1`,
    [userId]
  );
  const user = userRes.rows[0] || { name: 'User', role };

  // 2. Load or create conversation session
  let conv = null;
  if (conversationId) {
    conv = await conversationService.getConversationById(conversationId, userId);
  }

  if (!conv) {
    const defaultTitle = message.trim().slice(0, 40) + (message.length > 40 ? '...' : '');
    conv = await conversationService.createConversation(
      userId,
      role,
      defaultTitle,
      complaintContextId ? { complaintId: complaintContextId } : {}
    );
  } else if (complaintContextId && (!conv.context || conv.context.complaintId !== complaintContextId)) {
    await conversationService.updateContext(conv.id, userId, { complaintId: complaintContextId });
    conv.context = { ...conv.context, complaintId: complaintContextId };
  }

  // 3. Save user's incoming message to DB
  const userMsgRecord = await conversationService.addMessage({
    conversationId: conv.id,
    role: 'user',
    content: message.trim()
  });

  // 4. Retrieve message history (last 15 messages) to build LLM context
  const history = await conversationService.getRecentMessages(conv.id, 15);

  // 5. Build system prompt with current session entity memory
  const systemPromptContent = getSystemPrompt(role, {
    userName: user.name,
    departmentName: user.department_name,
    context: conv.context || {}
  });

  const formattedMessages = [
    { role: 'system', content: systemPromptContent },
    ...history.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: m.tool_args?.toolCallId || 'call_0',
          name: m.tool_name,
          content: m.content
        };
      }
      return { role: m.role, content: m.content || '' };
    })
  ];

  // 6. Get tools permitted for this role
  const rawTools = getToolsForRole(role);
  const formattedTools = formatToolsForGroq(rawTools);

  // Context passed into tool handlers
  const ctx = {
    userId,
    role,
    conversationId: conv.id,
    context: conv.context || {}
  };

  // 7. Execute Chat Loop with Groq (with graceful fallback on service interruption)
  let aiResponse = null;
  let updatedMessages = [];
  let cards = [];

  try {
    const loopResult = await executeChatLoop({
      messages: formattedMessages,
      tools: formattedTools,
      ctx
    });
    aiResponse = loopResult.message;
    updatedMessages = loopResult.updatedMessages || [];
    cards = extractComplaintCards(updatedMessages);
  } catch (groqErr) {
    const logger = require('../../utils/logger');
    logger.warn('[AI Service] Groq chat loop encountered an issue, utilizing role fallback', {
      error: groqErr.message,
      role
    });

    if (role === 'admin') {
      const { processAdminCopilotQuery } = require('./adminCopilot');
      const copilotRes = await processAdminCopilotQuery(message.trim());
      aiResponse = { content: copilotRes.explanation };
    } else {
      aiResponse = {
        content: `I am currently analyzing live municipal records. ${groqErr.message.includes('API key') ? 'AI service is operating in local mode.' : 'Please try asking your question again.'}`
      };
    }
  }

  // 8. Extract cards & update context entity memory
  if (cards.length > 0) {
    const updatedContext = {
      ...(conv.context || {}),
      lastComplaintId: cards[0].rawId,
      lastComplaintFormattedId: cards[0].id,
      complaintIds: cards.map(c => c.rawId)
    };
    await conversationService.updateContext(conv.id, userId, updatedContext);
    conv.context = updatedContext;
  }

  // 9. Persist cleaned assistant response to DB
  const assistantContent = cleanAssistantContent(aiResponse?.content);
  const aiMsgRecord = await conversationService.addMessage({
    conversationId: conv.id,
    role: 'assistant',
    content: assistantContent,
    toolResult: cards.length > 0 ? cards : null
  });

  // 10. Return response object with cards metadata
  return {
    conversationId: conv.id,
    title: conv.title,
    userMessage: userMsgRecord,
    assistantMessage: {
      id: aiMsgRecord.id,
      role: 'assistant',
      content: assistantContent,
      cards: cards.length > 0 ? cards : null,
      created_at: aiMsgRecord.created_at
    }
  };
}

module.exports = {
  processUserMessage
};
