import api from './api';

export const mapsApi = {
  // 1. Complaints in bounding box
  getComplaintsInBbox: async (params = {}) => {
    const res = await api.get('/maps/complaints', { params });
    return res.data?.data || res.data || [];
  },

  // 2. Spatial clusters for low/mid zoom
  getClusters: async (params = {}) => {
    const res = await api.get('/maps/clusters', { params });
    return res.data?.data || res.data || [];
  },

  // 3. Weighted heatmap data
  getHeatmap: async (params = {}) => {
    const res = await api.get('/maps/heatmap', { params });
    return res.data?.data || res.data || [];
  },

  // 4. AI Hotspot layers
  getHotspots: async (params = {}) => {
    const res = await api.get('/maps/hotspots', { params });
    return res.data?.data || res.data || [];
  },

  // 5. SLA Risk geographic layer
  getSlaRisk: async (params = {}) => {
    const res = await api.get('/maps/sla-risk', { params });
    return res.data?.data || res.data || { overdue: [], dueSoon: [], onTime: [], summary: {} };
  },

  // 6. Duplicate clusters
  getDuplicateClusters: async () => {
    const res = await api.get('/maps/duplicate-clusters');
    return res.data?.data || res.data || [];
  },

  // 7. Recurring issue zones
  getRecurringZones: async (params = {}) => {
    const res = await api.get('/maps/recurring-zones', { params });
    return res.data?.data || res.data || [];
  },

  // 8. Ward intelligence & polygons
  getWards: async () => {
    const res = await api.get('/maps/wards');
    return res.data?.data || res.data || [];
  },

  // 9. Zone intelligence
  getZones: async () => {
    const res = await api.get('/maps/zones');
    return res.data?.data || res.data || [];
  },

  // 10. Department jurisdictions
  getDepartments: async () => {
    const res = await api.get('/maps/departments');
    return res.data?.data || res.data || [];
  },

  // 11. Officer operational coverage (Admin only)
  getOfficerCoverage: async () => {
    const res = await api.get('/maps/officers');
    return res.data?.data || res.data || [];
  },

  // 12. Nearby issues (Citizen radius query)
  getNearby: async (params = {}) => {
    const res = await api.get('/maps/nearby', { params });
    return res.data?.data || res.data || [];
  },

  // 13. Geographic trends
  getTrends: async (params = {}) => {
    const res = await api.get('/maps/trends', { params });
    return res.data?.data || res.data || [];
  },

  // 14. AI Geographic insights summary
  getInsightsSummary: async () => {
    const res = await api.get('/maps/insights');
    return res.data?.data || res.data || null;
  }
};

export default mapsApi;
