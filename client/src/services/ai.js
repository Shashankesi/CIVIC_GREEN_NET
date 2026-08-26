import api, { unwrapResponse } from './api';

// Dedicated Citizen Assistant endpoint
export const sendCitizenMessage = async ({ conversationId, message, complaintId }) => {
  const res = await api.post('/ai/citizen/chat', { conversationId, message, complaintId });
  return unwrapResponse(res);
};

// Dedicated Officer Copilot endpoint
export const sendOfficerMessage = async ({ conversationId, message, complaintId }) => {
  const res = await api.post('/ai/officer/chat', { conversationId, message, complaintId });
  return unwrapResponse(res);
};

// Dedicated Admin Governance Copilot endpoint
export const sendAdminMessage = async ({ conversationId, message, complaintId }) => {
  const res = await api.post('/ai/admin/chat', { conversationId, message, complaintId });
  return unwrapResponse(res);
};

// Generic chat endpoint (fallback)
export const sendMessage = async ({ conversationId, message, complaintId }) => {
  const res = await api.post('/ai/chat', { conversationId, message, complaintId });
  return unwrapResponse(res);
};

// List all conversations for the active user role
export const getConversations = async () => {
  const res = await api.get('/ai/conversations');
  return unwrapResponse(res);
};

// Get full details and message history of a conversation
export const getConversation = async (id) => {
  const res = await api.get(`/ai/conversations/${id}`);
  return unwrapResponse(res);
};

// Create a new conversation session
export const createConversation = async ({ title, context }) => {
  const res = await api.post('/ai/conversations', { title, context });
  return unwrapResponse(res);
};

// Delete a conversation session
export const deleteConversation = async (id) => {
  const res = await api.delete(`/ai/conversations/${id}`);
  return unwrapResponse(res);
};

// Rename conversation title
export const renameConversation = async (id, title) => {
  const res = await api.put(`/ai/conversations/${id}/title`, { title });
  return unwrapResponse(res);
};

// Submit feedback on message (helpful / not_helpful)
export const sendFeedback = async ({ messageId, rating }) => {
  const res = await api.post('/ai/feedback', { messageId, rating });
  return unwrapResponse(res);
};

// Check AI service health
export const getHealth = async () => {
  const res = await api.get('/ai/health');
  return unwrapResponse(res);
};

// Phase 4 Intelligence API Calls
export const getComplaintAnalysis = async (id) => {
  const res = await api.get(`/ai/complaints/${id}/analysis`);
  return unwrapResponse(res);
};

export const classifyComplaint = async (id) => {
  const res = await api.post(`/ai/complaints/${id}/classify`);
  return unwrapResponse(res);
};

export const overrideAiRecommendation = async (id, { category, priority, departmentId, overrideReason }) => {
  const res = await api.post(`/ai/complaints/${id}/override`, { category, priority, departmentId, overrideReason });
  return unwrapResponse(res);
};

export const getComplaintDuplicates = async (id) => {
  const res = await api.get(`/ai/complaints/${id}/duplicates`);
  return unwrapResponse(res);
};

export const getDuplicateClusters = async () => {
  const res = await api.get('/ai/duplicate-clusters');
  return unwrapResponse(res);
};

export const getRecurringIssues = async (days = 60) => {
  const res = await api.get(`/ai/recurring-issues?days=${days}`);
  return unwrapResponse(res);
};

export const getHotspots = async (days = 30, category = null) => {
  let url = `/ai/hotspots?days=${days}`;
  if (category && category !== 'all') url += `&category=${category}`;
  const res = await api.get(url);
  return unwrapResponse(res);
};

export const getTrends = async (timeframe = '30d') => {
  const res = await api.get(`/ai/trends?timeframe=${timeframe}`);
  return unwrapResponse(res);
};

export const getDepartmentInsights = async () => {
  const res = await api.get('/ai/department-insights');
  return unwrapResponse(res);
};

export const getOfficerInsights = async () => {
  const res = await api.get('/ai/officer-insights');
  return unwrapResponse(res);
};

export const getResolutionInsights = async () => {
  const res = await api.get('/ai/resolution-insights');
  return unwrapResponse(res);
};

export const getComplaintSummary = async (id) => {
  const res = await api.get(`/ai/complaints/${id}/summary`);
  return unwrapResponse(res);
};

export const getOfficerChecklist = async (id) => {
  const res = await api.get(`/ai/complaints/${id}/officer-checklist`);
  return unwrapResponse(res);
};

export const assistCitizen = async ({ title, description, category }) => {
  const res = await api.post('/ai/citizen/assist', { title, description, category });
  return unwrapResponse(res);
};

export const askAdminCopilot = async (question) => {
  const res = await api.post('/ai/copilot', { question });
  return unwrapResponse(res);
};

export const aiApi = {
  sendMessage,
  sendCitizenMessage,
  sendOfficerMessage,
  sendAdminMessage,
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  renameConversation,
  sendFeedback,
  getHealth,
  getComplaintAnalysis,
  classifyComplaint,
  overrideAiRecommendation,
  getComplaintDuplicates,
  getDuplicateClusters,
  getRecurringIssues,
  getHotspots,
  getTrends,
  getDepartmentInsights,
  getOfficerInsights,
  getResolutionInsights,
  getComplaintSummary,
  getOfficerChecklist,
  assistCitizen,
  askAdminCopilot
};

export default aiApi;
