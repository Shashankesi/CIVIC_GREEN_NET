const db = require('../../config/db');
const complaintRepo = require('../../repositories/complaintRepository');
const assignmentRepo = require('../../repositories/assignmentRepository');
const adminAnalyticsRepo = require('../../repositories/adminAnalyticsRepository');
const adminDeptRepo = require('../../repositories/adminDepartmentRepository');

/**
 * Definitions and handlers for all role-scoped AI tools.
 * Sanitizes outputs to protect security and prevent internal leakage.
 */

function sanitizeComplaint(c) {
  if (!c) return null;
  const numId = typeof c.id === 'number' ? c.id : parseInt(String(c.id).replace(/[^0-9]/g, ''), 10);
  return {
    id: `CGN-${String(numId).padStart(5, '0')}`,
    rawId: numId,
    title: c.title || 'Untitled Issue',
    summary: c.summary || c.description || null,
    status: c.status || 'open',
    category: c.category || 'general',
    priority: c.priority || 'medium',
    severity: c.severity || null,
    address: c.address || null,
    location: c.lat && c.lng ? { lat: c.lat, lng: c.lng } : null,
    created_at: c.created_at || null,
    sla_due_at: c.sla_due_at || null,
    isOverdue: c.sla_due_at ? new Date(c.sla_due_at) < new Date() : false
  };
}

const toolDefinitions = [
  // ==========================================
  // CITIZEN TOOLS
  // ==========================================
  {
    name: 'getMyComplaints',
    description: 'Retrieve complaints submitted by the currently logged-in citizen.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed', 'reopened'] },
        limit: { type: 'integer', default: 10 }
      }
    },
    roles: ['citizen'],
    handler: async ({ status, limit = 10 }, ctx) => {
      const result = await complaintRepo.listComplaints({
        limit: Math.min(limit, 20),
        offset: 0,
        filters: { userId: ctx.userId, ...(status ? { status } : {}) }
      });
      return result.map(sanitizeComplaint);
    }
  },
  {
    name: 'getComplaintById',
    description: 'Get full details of a specific complaint by ID (e.g. CGN-00042 or 42).',
    parameters: {
      type: 'object',
      properties: {
        complaintId: { type: 'string', description: 'The complaint ID (numeric or formatted as CGN-XXXXX)' }
      },
      required: ['complaintId']
    },
    roles: ['citizen', 'officer', 'admin'],
    handler: async ({ complaintId }, ctx) => {
      const rawId = parseInt(String(complaintId).replace(/[^0-9]/g, ''), 10);
      if (isNaN(rawId)) return { error: 'Invalid complaint ID format' };

      const c = await complaintRepo.getById(rawId);
      if (!c) return { error: 'Complaint not found' };

      if (ctx.role === 'citizen' && c.user_id !== ctx.userId) {
        return { error: 'Access denied: You can only view your own complaints.' };
      }

      return sanitizeComplaint(c);
    }
  },
  {
    name: 'getComplaintTimeline',
    description: 'Get status change history and timeline for a complaint.',
    parameters: {
      type: 'object',
      properties: {
        complaintId: { type: 'string' }
      },
      required: ['complaintId']
    },
    roles: ['citizen', 'officer', 'admin'],
    handler: async ({ complaintId }, ctx) => {
      const rawId = parseInt(String(complaintId).replace(/[^0-9]/g, ''), 10);
      if (isNaN(rawId)) return { error: 'Invalid complaint ID format' };

      const c = await complaintRepo.getById(rawId);
      if (!c) return { error: 'Complaint not found' };
      if (ctx.role === 'citizen' && c.user_id !== ctx.userId) {
        return { error: 'Access denied.' };
      }

      const timeline = await complaintRepo.getTimeline(rawId);
      return {
        complaintId: `CGN-${String(rawId).padStart(5, '0')}`,
        history: timeline.history.map(h => ({
          from: h.status_from,
          to: h.status_to,
          changedBy: h.changed_by_name || 'System',
          note: h.note,
          date: h.created_at
        }))
      };
    }
  },
  {
    name: 'getNearbyComplaints',
    description: 'Find active public complaints near a specific location or latitude/longitude.',
    parameters: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        radiusMeters: { type: 'number', default: 2000 }
      },
      required: ['lat', 'lng']
    },
    roles: ['citizen', 'officer', 'admin'],
    handler: async ({ lat, lng, radiusMeters = 2000 }) => {
      const complaints = await complaintRepo.nearbyComplaints(lat, lng, radiusMeters);
      return complaints.slice(0, 10).map(c => ({
        ...sanitizeComplaint(c),
        distanceMeters: Math.round(c.distance || 0)
      }));
    }
  },
  {
    name: 'searchMyComplaints',
    description: 'Search through citizen complaints by keyword.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    roles: ['citizen'],
    handler: async ({ query }, ctx) => {
      const results = await complaintRepo.searchComplaints({ query, userId: ctx.userId, limit: 10 });
      return results.map(sanitizeComplaint);
    }
  },
  {
    name: 'getCivicHelp',
    description: 'Get official guidelines and resolution timelines for municipal issues.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'e.g. sanitation, roads, lighting, utilities' }
      }
    },
    roles: ['citizen', 'officer', 'admin'],
    handler: async ({ category }) => {
      const catHelp = {
        sanitation: 'Sanitation issues (garbage accumulation, missed collection) are typically reviewed within 24 hours and addressed within 48 hours.',
        roads: 'Potholes and road damage are inspected within 2 days. Minor repairs are scheduled within 5-7 business days.',
        lighting: 'Streetlight outages and electrical faults are prioritized for emergency repair within 24-48 hours.',
        utilities: 'Water main leaks and sewage backups receive top-priority SLA response within 4-12 hours.',
        parks: 'Park maintenance and tree trimming requests are evaluated within 3 business days.'
      };
      return {
        category: category || 'general',
        guideline: catHelp[category?.toLowerCase()] || 'Civic GreenNet processes complaints based on severity and SLA priorities. High-priority items are routed directly to department officers.'
      };
    }
  },

  // ==========================================
  // OFFICER TOOLS
  // ==========================================
  {
    name: 'getMyAssignedComplaints',
    description: 'Retrieve complaints assigned to the logged-in officer.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'overdue'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent', 'critical'] }
      }
    },
    roles: ['officer'],
    handler: async ({ status, priority }, ctx) => {
      const assignments = await assignmentRepo.complaintsAssignedToOfficer(ctx.userId, { limit: 50 });
      const detailed = [];
      for (const a of assignments) {
        const c = await complaintRepo.getById(a.id);
        if (!c) continue;
        if (status && c.status !== status) continue;
        if (priority && c.priority !== priority) continue;
        detailed.push(sanitizeComplaint(c));
      }
      return detailed;
    }
  },
  {
    name: 'getSlaSummary',
    description: 'Get SLA breakdown for officer active tasks (overdue, due soon, on track).',
    parameters: { type: 'object', properties: {} },
    roles: ['officer', 'admin'],
    handler: async (_, ctx) => {
      if (ctx.role === 'officer') {
        const stats = await complaintRepo.getOfficerDashboardStats(ctx.userId);
        return {
          totalAssigned: stats.assigned_to_me || 0,
          open: stats.open || 0,
          inProgress: stats.in_progress || 0,
          highPriority: stats.high_priority || 0,
          dueSoon: stats.due_soon || 0,
          overdue: stats.overdue || 0
        };
      }
      return await adminAnalyticsRepo.analyticsOverview();
    }
  },
  {
    name: 'getDepartmentWorkload',
    description: 'Get current active complaint workload and statistics for the officer department.',
    parameters: { type: 'object', properties: {} },
    roles: ['officer', 'admin'],
    handler: async (_, ctx) => {
      const userRes = await db.query('SELECT department_id FROM users WHERE id=$1', [ctx.userId]);
      const deptId = userRes.rows[0]?.department_id;
      if (!deptId) return { message: 'Officer has no assigned department.' };

      const statsRes = await db.query(
        `SELECT 
           COUNT(*)::int AS total_complaints,
           COUNT(CASE WHEN status='open' THEN 1 END)::int AS open,
           COUNT(CASE WHEN status='in_progress' THEN 1 END)::int AS in_progress,
           COUNT(CASE WHEN status='resolved' THEN 1 END)::int AS resolved
         FROM complaints WHERE department_id=$1`,
        [deptId]
      );
      return statsRes.rows[0];
    }
  },
  {
    name: 'draftCitizenUpdate',
    description: 'Draft a polite, informative resolution or progress note for a citizen.',
    parameters: {
      type: 'object',
      properties: {
        complaintId: { type: 'string' },
        actionTaken: { type: 'string', description: 'Brief summary of physical or admin work completed' }
      },
      required: ['complaintId', 'actionTaken']
    },
    roles: ['officer', 'admin'],
    handler: async ({ complaintId, actionTaken }) => {
      return {
        draftNote: `Dear Citizen, regarding complaint ${complaintId}: Our municipal team has inspected the site and completed the following actions: ${actionTaken}. Thank you for helping keep our community clean and functioning.`,
        suggestedStatus: 'in_progress'
      };
    }
  },
  {
    name: 'summarizeComplaint',
    description: 'Generate an executive summary of a complaint file.',
    parameters: {
      type: 'object',
      properties: {
        complaintId: { type: 'string' }
      },
      required: ['complaintId']
    },
    roles: ['officer', 'admin'],
    handler: async ({ complaintId }) => {
      const rawId = parseInt(String(complaintId).replace(/[^0-9]/g, ''), 10);
      const c = await complaintRepo.getById(rawId);
      if (!c) return { error: 'Complaint not found' };
      const timeline = await complaintRepo.getTimeline(rawId);

      return {
        ...sanitizeComplaint(c),
        totalStatusChanges: timeline.history.length,
        latestUpdate: timeline.history[timeline.history.length - 1]?.note || 'No notes yet'
      };
    }
  },

  // ==========================================
  // ADMIN TOOLS
  // ==========================================
  {
    name: 'getComplaintAnalytics',
    description: 'Retrieve overall system-wide complaint analytics, resolution rates, and trends.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      return await adminAnalyticsRepo.analyticsOverview();
    }
  },
  {
    name: 'getDepartmentPerformance',
    description: 'Retrieve efficiency and SLA metrics broken down by department.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      return await adminAnalyticsRepo.departmentPerformance();
    }
  },
  {
    name: 'getOfficerPerformance',
    description: 'Retrieve officer workload distribution and completion stats.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      return await adminAnalyticsRepo.officerPerformance();
    }
  },
  {
    name: 'getComplaintHotspots',
    description: 'Get top geographic clusters/hotspots of complaints.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      const res = await db.query(
        `SELECT address, category, COUNT(*)::int AS complaint_count
         FROM complaints
         WHERE address IS NOT NULL AND address != ''
         GROUP BY address, category
         HAVING COUNT(*) > 1
         ORDER BY complaint_count DESC
         LIMIT 10`
      );
      return res.rows;
    }
  },
  {
    name: 'getSlaBreach',
    description: 'Get list of complaints currently breaching or near breaching SLA deadlines.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      const res = await db.query(
        `SELECT id, title, category, priority, status, address, sla_due_at
         FROM complaints
         WHERE status NOT IN ('resolved', 'closed')
           AND sla_due_at IS NOT NULL
           AND sla_due_at < now()
         ORDER BY sla_due_at ASC
         LIMIT 15`
      );
      return res.rows.map(sanitizeComplaint);
    }
  },
  {
    name: 'getUnassignedComplaints',
    description: 'Get list of active complaints not yet assigned to an officer.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      const res = await db.query(
        `SELECT id, title, category, priority, created_at, address
         FROM complaints
         WHERE officer_id IS NULL AND status IN ('open', 'reopened')
         ORDER BY priority DESC, created_at ASC
         LIMIT 15`
      );
      return res.rows.map(sanitizeComplaint);
    }
  },
  {
    name: 'getCriticalComplaints',
    description: 'Get urgent and critical severity complaints.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      const res = await db.query(
        `SELECT id, title, category, priority, severity, status, created_at
         FROM complaints
         WHERE priority IN ('high', 'urgent', 'critical') OR severity IN ('major', 'critical')
         ORDER BY created_at DESC
         LIMIT 15`
      );
      return res.rows.map(sanitizeComplaint);
    }
  },
  {
    name: 'searchComplaints',
    description: 'Search complaints across all parameters.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string' }
      }
    },
    roles: ['officer', 'admin'],
    handler: async ({ query, category, status }) => {
      const results = await complaintRepo.searchComplaints({ query, category, status, limit: 15 });
      return results.map(sanitizeComplaint);
    }
  },
  {
    name: 'getWardAnalytics',
    description: 'Retrieve ward-level complaint breakdown, identifying which wards have the most unresolved complaints, SLA compliance, and top categories.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      try {
        const wardAnalytics = require('../analytics/wardAnalytics');
        const scorecards = await wardAnalytics.getWardScorecards({ timeframe: '30d' });
        return scorecards.map(w => ({
          wardId: w.id,
          wardName: w.name,
          wardNumber: w.wardNumber,
          totalComplaints: w.totalComplaints,
          open: w.open,
          inProgress: w.inProgress,
          unresolved: (w.open || 0) + (w.inProgress || 0),
          resolved: w.resolved,
          overdue: w.overdue,
          critical: w.critical,
          topCategory: w.topCategory,
          resolutionRate: `${w.resolutionRate}%`,
          slaCompliance: `${w.slaCompliance}%`
        }));
      } catch (err) {
        return [];
      }
    }
  },
  {
    name: 'generateBriefing',
    description: 'Synthesize an executive briefing report for municipal leadership.',
    parameters: { type: 'object', properties: {} },
    roles: ['admin'],
    handler: async () => {
      const stats = await adminAnalyticsRepo.analyticsOverview();
      return {
        reportDate: new Date().toISOString(),
        totalComplaints: stats.total || 0,
        openCount: stats.open || 0,
        overdueCount: stats.overdue || 0,
        criticalCount: stats.critical || 0,
        resolutionRate: stats.resolutionRate || 0,
        keyInsight: 'Focus on resolving overdue items in high-priority categories.'
      };
    }
  }
];

function getToolsForRole(role) {
  const allowedRoles = ['citizen', 'officer', 'admin'];
  const userRole = allowedRoles.includes(role) ? role : 'citizen';
  return toolDefinitions.filter(t => t.roles.includes(userRole));
}

function formatToolsForGroq(tools) {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}

async function executeTool(name, args, ctx) {
  const tool = toolDefinitions.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }
  if (!tool.roles.includes(ctx.role)) {
    throw new Error(`Unauthorized tool call: ${name} is not permitted for role ${ctx.role}`);
  }
  return await tool.handler(args || {}, ctx);
}

module.exports = {
  toolDefinitions,
  getToolsForRole,
  formatToolsForGroq,
  executeTool,
  sanitizeComplaint
};
