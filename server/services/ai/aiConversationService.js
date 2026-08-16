const db = require('../../config/db');

/**
 * Manage persistence for AI Conversations, Messages, and Feedback
 */

async function createConversation(userId, role, title = 'New Conversation', context = {}) {
  const q = `INSERT INTO ai_conversations (user_id, role, title, context, created_at, updated_at)
             VALUES ($1, $2, $3, $4, now(), now()) RETURNING *`;
  const r = await db.query(q, [userId, role, title, JSON.stringify(context)]);
  return r.rows[0];
}

async function getConversations(userId, role, limit = 30) {
  const q = `SELECT c.*, 
                    (SELECT content FROM ai_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
             FROM ai_conversations c
             WHERE c.user_id = $1 AND c.role = $2
             ORDER BY c.updated_at DESC
             LIMIT $3`;
  const r = await db.query(q, [userId, role, limit]);
  return r.rows;
}

async function getConversationById(conversationId, userId) {
  const q = `SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2`;
  const r = await db.query(q, [conversationId, userId]);
  return r.rows[0] || null;
}

async function getRecentMessages(conversationId, limit = 20) {
  const q = `SELECT * FROM ai_messages 
             WHERE conversation_id = $1 
             ORDER BY created_at ASC 
             LIMIT $2`;
  const r = await db.query(q, [conversationId, limit]);
  return r.rows;
}

async function addMessage({ conversationId, role, content, toolName = null, toolArgs = null, toolResult = null }) {
  const q = `INSERT INTO ai_messages (conversation_id, role, content, tool_name, tool_args, tool_result, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING *`;
  const r = await db.query(q, [
    conversationId,
    role,
    content || '',
    toolName,
    toolArgs ? JSON.stringify(toolArgs) : null,
    toolResult ? JSON.stringify(toolResult) : null
  ]);

  // Touch updated_at on parent conversation
  await db.query(`UPDATE ai_conversations SET updated_at = now() WHERE id = $1`, [conversationId]);
  return r.rows[0];
}

async function updateTitle(conversationId, userId, title) {
  const q = `UPDATE ai_conversations SET title = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING *`;
  const r = await db.query(q, [title, conversationId, userId]);
  return r.rows[0];
}

async function updateContext(conversationId, userId, context) {
  const q = `UPDATE ai_conversations SET context = context || $1::jsonb, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING *`;
  const r = await db.query(q, [JSON.stringify(context), conversationId, userId]);
  return r.rows[0];
}

async function deleteConversation(conversationId, userId) {
  const q = `DELETE FROM ai_conversations WHERE id = $1 AND user_id = $2`;
  await db.query(q, [conversationId, userId]);
}

async function addFeedback(messageId, userId, rating) {
  const q = `INSERT INTO ai_feedback (message_id, user_id, rating, created_at)
             VALUES ($1, $2, $3, now()) RETURNING *`;
  const r = await db.query(q, [messageId, userId, rating]);
  return r.rows[0];
}

module.exports = {
  createConversation,
  getConversations,
  getConversationById,
  getRecentMessages,
  addMessage,
  updateTitle,
  updateContext,
  deleteConversation,
  addFeedback
};
