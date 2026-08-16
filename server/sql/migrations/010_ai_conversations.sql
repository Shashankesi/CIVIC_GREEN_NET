-- 010_ai_conversations.sql
-- AI Conversation memory tables for the Multi-Role AI Intelligence System

-- Conversations table: one row per chat session
CREATE TABLE IF NOT EXISTS ai_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  title VARCHAR(255) DEFAULT 'New Conversation',
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table: every user, assistant, and tool message
CREATE TABLE IF NOT EXISTS ai_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,          -- 'user', 'assistant', 'system', 'tool'
  content TEXT,
  tool_name VARCHAR(100),
  tool_args JSONB,
  tool_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback table: thumbs up/down per message
CREATE TABLE IF NOT EXISTS ai_feedback (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rating VARCHAR(10),                 -- 'helpful', 'not_helpful'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_updated ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_created ON ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_msg ON ai_feedback(message_id);
