const db = require('../../config/db');
const { executeStructuredAI } = require('./aiProvider');
const { analyzeHotspots } = require('./hotspotAnalyzer');
const { getDepartmentIntelligence, getOfficerWorkloadIntelligence, getPredictiveTrends } = require('./insightGenerator');
const logger = require('../../utils/logger');

/**
 * Pre-approved, parameterized analytical query routines for Admin Copilot.
 * Strictly prevents dynamic destructive SQL and ensures numerical consistency.
 */
const INTENT_ROUTINES = {
  UNRESOLVED_BY_CATEGORY: async (params) => {
    const cat = params.category ? params.category.toLowerCase() : null;
    const query = cat 
      ? `SELECT category, COUNT(*)::int AS count FROM complaints WHERE status NOT IN ('resolved', 'closed') AND LOWER(category) = $1 GROUP BY category`
      : `SELECT category, COUNT(*)::int AS count FROM complaints WHERE status NOT IN ('resolved', 'closed') GROUP BY category ORDER BY count DESC`;
    const res = await db.query(query, cat ? [cat] : []);
    const total = res.rows.reduce((sum, r) => sum + r.count, 0);
    return { data: res.rows, totalCount: total, filterCategory: cat };
  },

  HIGHEST_OVERDUE_DEPARTMENT: async () => {
    const depts = await getDepartmentIntelligence();
    const sorted = [...depts].sort((a, b) => b.overdue - a.overdue);
    return {
      topDepartment: sorted[0] || null,
      allDepartments: sorted
    };
  },

  BIGGEST_HOTSPOT: async () => {
    const hotspots = await analyzeHotspots({ days: 30 });
    return {
      topHotspot: hotspots[0] || null,
      hotspots: hotspots.slice(0, 5)
    };
  },

  CATEGORY_INCREASE: async () => {
    const trends = await getPredictiveTrends('30d');
    const rising = (trends.trends || []).sort((a, b) => b.changePercentage - a.changePercentage);
    return {
      topRising: rising[0] || null,
      trends: rising
    };
  },

  OFFICER_WORKLOAD: async () => {
    const officers = await getOfficerWorkloadIntelligence();
    const sorted = [...officers].sort((a, b) => b.activeAssignments - a.activeAssignments);
    return {
      highestWorkloadOfficers: sorted.slice(0, 5),
      lowestWorkloadOfficers: [...sorted].reverse().slice(0, 3)
    };
  },

  SLA_BREACHES: async () => {
    const query = `
      SELECT id, title, category, priority, status, address, sla_due_at,
             ROUND(EXTRACT(EPOCH FROM (now() - sla_due_at)) / 3600) AS hours_overdue
      FROM complaints
      WHERE status NOT IN ('resolved', 'closed')
        AND sla_due_at IS NOT NULL
        AND sla_due_at < now()
      ORDER BY sla_due_at ASC
      LIMIT 15;
    `;
    const res = await db.query(query);
    return {
      totalBreaches: res.rows.length,
      breaches: res.rows.map(r => ({
        id: `CGN-${String(r.id).padStart(5, '0')}`,
        title: r.title,
        category: r.category,
        priority: r.priority,
        address: r.address,
        hoursOverdue: Math.max(Number(r.hours_overdue), 0)
      }))
    };
  },

  CRITICAL_TODAY: async () => {
    const query = `
      SELECT id, title, category, priority, severity, status, address, created_at
      FROM complaints
      WHERE (priority IN ('high', 'urgent', 'critical') OR severity = 'critical')
        AND created_at >= now() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 10;
    `;
    const res = await db.query(query);
    return {
      totalCriticalToday: res.rows.length,
      complaints: res.rows.map(r => ({
        id: `CGN-${String(r.id).padStart(5, '0')}`,
        title: r.title,
        category: r.category,
        priority: r.priority,
        severity: r.severity,
        status: r.status,
        address: r.address
      }))
    };
  },

  WARD_UNRESOLVED: async () => {
    const wardAnalytics = require('../analytics/wardAnalytics');
    const scorecards = await wardAnalytics.getWardScorecards({ timeframe: '30d' });
    const sorted = [...scorecards].sort((a, b) => ((b.open || 0) + (b.inProgress || 0)) - ((a.open || 0) + (a.inProgress || 0)));
    return {
      topUnresolvedWard: sorted[0] || null,
      wardBreakdown: sorted.slice(0, 5).map(w => ({
        wardName: w.name,
        wardNumber: w.wardNumber,
        unresolved: (w.open || 0) + (w.inProgress || 0),
        total: w.totalComplaints,
        overdue: w.overdue,
        slaCompliance: w.slaCompliance
      }))
    };
  },

  DEPARTMENT_SUMMARY: async () => {
    const depts = await getDepartmentIntelligence();
    const sorted = [...depts].sort((a, b) => b.totalAssigned - a.totalAssigned);
    return {
      departments: sorted,
      topWorkloadDepartment: sorted[0] || null
    };
  },

  HIGHEST_PRIORITY: async () => {
    const query = `
      SELECT id, title, category, priority, severity, status, address, created_at, sla_due_at
      FROM complaints
      WHERE status NOT IN ('resolved', 'closed', 'rejected')
        AND (priority IN ('high', 'urgent', 'critical') OR severity IN ('major', 'critical'))
      ORDER BY
        CASE priority WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 WHEN 'high' THEN 3 ELSE 4 END,
        created_at ASC
      LIMIT 10;
    `;
    const res = await db.query(query);
    return {
      totalHighPriority: res.rows.length,
      complaints: res.rows.map(r => ({
        id: `CGN-${String(r.id).padStart(5, '0')}`,
        title: r.title,
        category: r.category,
        priority: r.priority,
        severity: r.severity,
        status: r.status,
        address: r.address,
        isOverdue: r.sla_due_at ? new Date(r.sla_due_at) < new Date() : false
      }))
    };
  },

  GENERAL_OVERVIEW: async () => {
    const countsRes = await db.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'open' THEN 1 END)::int AS open,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN sla_due_at < now() AND status NOT IN ('resolved', 'closed') THEN 1 END)::int AS overdue
      FROM complaints;
    `);
    return { overview: countsRes.rows[0] || {} };
  }
};

/**
 * Detect user question intent deterministically or via LLM
 */
function detectIntent(question) {
  const q = (question || '').toLowerCase();

  if (q.includes('highest overdue') || q.includes('overdue workload') || (q.includes('department') && q.includes('overdue'))) {
    return { intent: 'HIGHEST_OVERDUE_DEPARTMENT', params: {} };
  }

  if (q.includes('ward') && (q.includes('unresolved') || q.includes('most') || q.includes('complaint') || q.includes('area') || q.includes('highest'))) {
    return { intent: 'WARD_UNRESOLVED', params: {} };
  }

  if (q.includes('department') && (q.includes('summary') || q.includes('performance') || q.includes('workload') || q.includes('active workload') || q.includes('highest'))) {
    return { intent: 'DEPARTMENT_SUMMARY', params: {} };
  }

  if (q.includes('highest priority') || q.includes('top priority') || q.includes('urgent complaint') || q.includes('critical complaint')) {
    return { intent: 'HIGHEST_PRIORITY', params: {} };
  }

  if (q.includes('unresolved') || q.includes('open complaint') || q.includes('how many sanitation') || q.includes('how many road')) {
    let category = null;
    if (q.includes('sanitation') || q.includes('garbage')) category = 'sanitation';
    else if (q.includes('road') || q.includes('pothole')) category = 'roads';
    else if (q.includes('water') || q.includes('drain')) category = 'drainage';
    else if (q.includes('light') || q.includes('electric')) category = 'lighting';
    return { intent: 'UNRESOLVED_BY_CATEGORY', params: { category } };
  }

  if (q.includes('hotspot') || q.includes('biggest complaint area') || q.includes('cluster')) {
    return { intent: 'BIGGEST_HOTSPOT', params: {} };
  }

  if (q.includes('increased the most') || q.includes('rising category') || q.includes('increase this month') || q.includes('trends')) {
    return { intent: 'CATEGORY_INCREASE', params: {} };
  }

  if (q.includes('officer') && (q.includes('workload') || q.includes('busy') || q.includes('highest workload') || q.includes('assigned'))) {
    return { intent: 'OFFICER_WORKLOAD', params: {} };
  }

  if (q.includes('breached sla') || q.includes('overdue') || q.includes('sla breach') || q.includes('delayed')) {
    return { intent: 'SLA_BREACHES', params: {} };
  }

  if (q.includes('critical') || q.includes('urgent today') || q.includes('attention today') || q.includes('today') || q.includes('emergency')) {
    return { intent: 'CRITICAL_TODAY', params: {} };
  }

  return { intent: 'GENERAL_OVERVIEW', params: {} };
}

const COPILOT_EXPLAIN_PROMPT = `You are the Civic GreenNet Admin Operations Copilot powered by Groq.
Analyze the verified database query result and return a JSON object with a single key "explanation".

CRITICAL INSTRUCTIONS:
- Return ONLY a valid JSON object in this exact format: { "explanation": "your briefing text here" }
- Do NOT wrap in markdown code fences. Return raw JSON only.
- Report ONLY the exact counts and statistics present in VERIFIED_DATABASE_DATA.
- NEVER invent, inflate, or contradict the numbers in the database result.
- Use markdown bold (**text**) for key numbers in the explanation value.
- The explanation should be a crisp 2-4 sentence executive briefing.`;

/**
 * Process Admin Copilot Question with Guaranteed Numerical Consistency (using Groq)
 */
async function processAdminCopilotQuery(question) {
  const { intent, params } = detectIntent(question);
  const routine = INTENT_ROUTINES[intent] || INTENT_ROUTINES.GENERAL_OVERVIEW;

  let dbResult = null;
  try {
    dbResult = await routine(params);
  } catch (err) {
    logger.error('[Admin Copilot Query Error]', { err: err.message });
    dbResult = { error: 'Database routine failed', count: 0 };
  }

  let explanation = '';
  try {
    const axios = require('axios');
    const { GROQ } = require('../../config');
    if (!GROQ || !GROQ.API_KEY) {
      throw new Error('Groq API key not configured');
    }

    const aiInput = `USER QUESTION: "${question}"\nINTENT: ${intent}\nVERIFIED_DATABASE_DATA:\n${JSON.stringify(dbResult, null, 2)}`;

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: COPILOT_EXPLAIN_PROMPT },
          { role: 'user', content: aiInput }
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ.API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const raw = res.data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(raw);
    explanation = parsed.explanation || parsed.summary || raw;
  } catch (err) {
    logger.warn('[Admin Copilot AI Error] Groq AI call failed, falling back to deterministic explanation', {
      error: err.message,
      intent,
      question
    });
    // Deterministic fallback response with 100% database accuracy
    if (intent === 'WARD_UNRESOLVED') {
      const top = dbResult.topUnresolvedWard;
      explanation = top
        ? `**${top.name}** currently has the most unresolved complaints with **${(top.open || 0) + (top.inProgress || 0)}** active cases out of ${top.totalComplaints} total (${top.slaCompliance}% SLA compliance).`
        : 'All municipal wards currently have zero unresolved complaints.';
    } else if (intent === 'DEPARTMENT_SUMMARY') {
      const top = dbResult.topWorkloadDepartment;
      explanation = top
        ? `**${top.name}** has the highest active workload with **${top.totalAssigned}** assigned complaints and ${top.overdue} overdue (${top.slaCompliance}% SLA compliance).`
        : 'All municipal departments are currently balanced with no pending assignments.';
    } else if (intent === 'HIGHEST_PRIORITY') {
      explanation = `There are currently **${dbResult.totalHighPriority || 0}** high/critical priority complaint(s) requiring urgent municipal intervention.`;
    } else if (intent === 'UNRESOLVED_BY_CATEGORY') {
      const cat = params.category ? `${params.category} ` : '';
      explanation = `There are currently **${dbResult.totalCount || 0}** unresolved ${cat}complaint(s) recorded in the database.`;
    } else if (intent === 'HIGHEST_OVERDUE_DEPARTMENT') {
      const top = dbResult.topDepartment;
      explanation = top 
        ? `**${top.name}** has the highest overdue workload with **${top.overdue}** overdue cases out of ${top.totalAssigned} total assigned (${top.slaCompliance}% SLA compliance).`
        : 'All municipal departments are currently operating within SLA deadlines.';
    } else if (intent === 'BIGGEST_HOTSPOT') {
      const hs = dbResult.topHotspot;
      explanation = hs
        ? `The top complaint hotspot is in **${hs.zone}** (${hs.category}) with **${hs.totalReports}** total reports and **${hs.unresolvedCount}** unresolved cases (${hs.status}).`
        : 'No acute complaint hotspots are currently active.';
    } else if (intent === 'CRITICAL_TODAY') {
      const count = dbResult.totalCriticalToday || 0;
      explanation = count > 0
        ? `There are currently **${count}** urgent/critical complaint(s) reported in the last 24 hours requiring immediate attention.`
        : 'There are currently no urgent or critical emergency complaints reported in the last 24 hours. Municipal operations are stable.';
    } else if (intent === 'SLA_BREACHES') {
      explanation = `There are currently **${dbResult.totalBreaches || 0}** complaint(s) that have breached their SLA resolution window.`;
    } else {
      explanation = `Operations Snapshot: Total active complaints: ${dbResult.overview?.total || 0} (Open: ${dbResult.overview?.open || 0}, In Progress: ${dbResult.overview?.in_progress || 0}, Overdue: ${dbResult.overview?.overdue || 0}).`;
    }
  }

  return {
    question,
    intent,
    verifiedData: dbResult,
    explanation,
    isAuthoritative: true,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  processAdminCopilotQuery,
  detectIntent,
  INTENT_ROUTINES
};
