import api, { unwrapResponse } from './api';

export const aiApi = {
  // Generic chat endpoint (fallback)
  sendMessage: async ({ conversationId, message, complaintId }) => {
    const res = await api.post('/ai/chat', { conversationId, message, complaintId });
    return unwrapResponse(res);
  },

  // Dedicated Citizen Assistant endpoint
  sendCitizenMessage: async ({ conversationId, message, complaintId }) => {
    const res = await api.post('/ai/citizen/chat', { conversationId, message, complaintId });
    return unwrapResponse(res);
  },

  // Dedicated Officer Copilot endpoint
  sendOfficerMessage: async ({ conversationId, message, complaintId }) => {
    const res = await api.post('/ai/officer/chat', { conversationId, message, complaintId });
    return unwrapResponse(res);
  },

  // Dedicated Admin Governance Copilot endpoint
  sendAdminMessage: async ({ conversationId, message, complaintId }) => {
    const res = await api.post('/ai/admin/chat', { conversationId, message, complaintId });
    return unwrapResponse(res);
  },

  // List all conversations for the active user role
  getConversations: async () => {
    const res = await api.get('/ai/conversations');
    return unwrapResponse(res);
  },

  // Get full details and message history of a conversation
  getConversation: async (id) => {
    const res = await api.get(`/ai/conversations/${id}`);
    return unwrapResponse(res);
  },

  // Create a new conversation session
  createConversation: async ({ title, context }) => {
    const res = await api.post('/ai/conversations', { title, context });
    return unwrapResponse(res);
  },

  // Delete a conversation session
  deleteConversation: async (id) => {
    const res = await api.delete(`/ai/conversations/${id}`);
    return unwrapResponse(res);
  },

  // Rename conversation title
  renameConversation: async (id, title) => {
    const res = await api.put(`/ai/conversations/${id}/title`, { title });
    return unwrapResponse(res);
  },

  // Submit feedback on message (helpful / not_helpful)
  sendFeedback: async ({ messageId, rating }) => {
    const res = await api.post('/ai/feedback', { messageId, rating });
    return unwrapResponse(res);
  },

  // Check AI service health
  getHealth: async () => {
    const res = await api.get('/ai/health');
    return unwrapResponse(res);
  },

  // ==========================================
  // Phase 4 Intelligence API Calls
  // ==========================================
  getComplaintAnalysis: async (id) => {
    const res = await api.get(`/ai/complaints/${id}/analysis`);
    return unwrapResponse(res);
  },

  classifyComplaint: async (id) => {
    const res = await api.post(`/ai/complaints/${id}/classify`);
    return unwrapResponse(res);
  },

  overrideAiRecommendation: async (id, { category, priority, departmentId, overrideReason }) => {
    const res = await api.post(`/ai/complaints/${id}/override`, { category, priority, departmentId, overrideReason });
    return unwrapResponse(res);
  },

  getComplaintDuplicates: async (id) => {
    const res = await api.get(`/ai/complaints/${id}/duplicates`);
    return unwrapResponse(res);
  },

  getDuplicateClusters: async () => {
    const res = await api.get('/ai/duplicate-clusters');
    return unwrapResponse(res);
  },

  getRecurringIssues: async (days = 60) => {
    const res = await api.get(`/ai/recurring-issues?days=${days}`);
    return unwrapResponse(res);
  },

  getHotspots: async (days = 30, category = null) => {
    let url = `/ai/hotspots?days=${days}`;
    if (category && category !== 'all') url += `&category=${category}`;
    const res = await api.get(url);
    return unwrapResponse(res);
  },

  getTrends: async (timeframe = '30d') => {
    const res = await api.get(`/ai/trends?timeframe=${timeframe}`);
    return unwrapResponse(res);
  },

  getDepartmentInsights: async () => {
    const res = await api.get('/ai/department-insights');
    return unwrapResponse(res);
  },

  getOfficerInsights: async () => {
    const res = await api.get('/ai/officer-insights');
    return unwrapResponse(res);
  },

  getResolutionInsights: async () => {
    const res = await api.get('/ai/resolution-insights');
    return unwrapResponse(res);
  },

  getComplaintSummary: async (id) => {
    const res = await api.get(`/ai/complaints/${id}/summary`);
    return unwrapResponse(res);
  },

  getOfficerChecklist: async (id) => {
    const res = await api.get(`/ai/complaints/${id}/officer-checklist`);
    return unwrapResponse(res);
  },

  assistCitizen: async ({ title, description, category }) => {
    const res = await api.post('/ai/citizen/assist', { title, description, category });
    return unwrapResponse(res);
  },

  askAdminCopilot: async (question) => {
    const res = await api.post('/ai/copilot', { question });
    return unwrapResponse(res);
  }
};

export default aiApi;
