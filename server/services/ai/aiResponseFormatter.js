/**
 * Standardized AI Response Formatter & Level-2 Deterministic Fallbacks
 */

function formatCopilotResponse({
  answer,
  summary = null,
  data = [],
  recommendations = [],
  sources = ['Civic GreenNet PostgreSQL Database'],
  intent = 'GENERAL_QUERY',
  confidence = 1.0,
  cards = []
}) {
  return {
    answer: answer || 'Here is the current municipal data.',
    summary: summary || (typeof answer === 'string' ? answer.slice(0, 120) : null),
    data: Array.isArray(data) ? data : [data],
    recommendations: Array.isArray(recommendations) ? recommendations : [],
    sources,
    intent,
    confidence,
    cards: Array.isArray(cards) ? cards : []
  };
}

// ==========================================
// LEVEL 2 CITIZEN DETERMINISTIC FORMATTER
// ==========================================

function formatCitizenFallback(intent, dbData, userInput = '') {
  switch (intent) {
    case 'MY_COMPLAINTS': {
      const list = Array.isArray(dbData) ? dbData : [];
      const active = list.filter(c => !['resolved', 'closed'].includes(c.status));
      if (list.length === 0) {
        return formatCopilotResponse({
          answer: 'You have not submitted any complaints yet. If you notice a civic issue like road damage or sanitation problems, you can file a new report easily.',
          summary: '0 active complaints found.',
          intent,
          recommendations: ['Submit a new complaint with clear photos and location']
        });
      }

      const oldest = active.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
      let lines = [`You currently have **${active.length}** active complaint(s):`];
      active.slice(0, 5).forEach(c => {
        lines.push(`• **${c.id}** — ${c.title} (${c.category}) — *${c.status.toUpperCase()}*`);
      });

      if (oldest) {
        lines.push(`\nYour oldest unresolved case is **${oldest.id}** (${oldest.title}).`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${active.length} active complaints.`,
        data: active,
        cards: active.slice(0, 5),
        intent,
        recommendations: oldest ? [`Track status of ${oldest.id} in your portal`] : []
      });
    }

    case 'COMPLAINT_STATUS': {
      const c = dbData;
      if (!c) {
        return formatCopilotResponse({
          answer: 'I could not find a complaint matching that ID in your submitted records. Please verify the CGN ID number.',
          summary: 'Complaint not found in your account.',
          intent
        });
      }

      const overdueText = c.isOverdue ? '⚠️ SLA Breached (Overdue)' : (c.hoursRemaining ? `SLA Due in ${c.hoursRemaining} hours` : 'Within SLA window');
      const lines = [
        `**Complaint ${c.id} Details:**`,
        `• **Title:** ${c.title}`,
        `• **Category:** ${c.category}`,
        `• **Current Status:** ${c.status.toUpperCase()}`,
        `• **Severity:** ${c.severity || 'Moderate'}`,
        `• **SLA Target:** ${overdueText}`,
        `• **Assigned Department:** ${c.department_name || 'Central Municipal Operations'}`
      ];

      if (c.timeline && c.timeline.length > 0) {
        const lastStep = c.timeline[c.timeline.length - 1];
        lines.push(`\n**Latest Timeline Update:** Status changed to *${lastStep.to}* on ${new Date(lastStep.date).toLocaleDateString()}`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Status of ${c.id}: ${c.status}`,
        data: c,
        cards: [c],
        intent,
        recommendations: c.isOverdue ? ['Follow up with the municipal desk via contact support'] : []
      });
    }

    case 'MY_POINTS':
    case 'MY_RANK': {
      const p = dbData || {};
      const lines = [
        `You currently have **${p.points || 0} civic points** (${p.badgeIcon || '🌱'} *${p.civicLevel || 'New Contributor'}*).`,
        `\n**Civic Ranking & Impact:**`,
        `• Active Badges Earned: ${p.badges ? p.badges.length : 0}`,
        `\n**How to earn more points:**`,
        `• Submit verified complaints: **+20 points**`,
        `• Successful complaint resolution: **+30 points**`,
        `• Helpful photos & GPS evidence: **+5 points**`,
        `\n*Note: Submitting confirmed false complaints incurs a penalty of -30 points.*`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${p.points || 0} points, Level: ${p.civicLevel}`,
        data: p,
        intent,
        recommendations: ['Upload clear photos when reporting to earn helpful evidence bonuses']
      });
    }

    case 'CIVIC_GUIDANCE': {
      const g = dbData || {};
      const lines = [
        `**Civic Reporting Guide: ${g.category}**`,
        `• **Resolution SLA:** Typically addressed within **${g.slaHours} hours**`,
        `• **Best Practice:** ${g.advice}`,
        `• **Responsible Unit:** ${g.contact}`
      ];
      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Reporting guidelines for ${g.category}`,
        data: g,
        intent
      });
    }

    case 'PUBLIC_STATISTICS': {
      const s = dbData || {};
      const lines = [
        `**City-wide Civic Operations Snapshot:**`,
        `• Total Complaints Registered: **${s.total_complaints || 0}**`,
        `• Successfully Resolved: **${s.resolved_complaints || 0}**`,
        `• Current Active Issues: **${s.active_complaints || 0}**`,
        `• Municipal Resolution Rate: **${s.resolution_rate || 0}%**`
      ];
      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Resolution rate: ${s.resolution_rate}%`,
        data: s,
        intent
      });
    }

    default: {
      return formatCopilotResponse({
        answer: 'I can assist you with your active complaints, checking case statuses, viewing your civic points, or learning municipal resolution timelines.',
        summary: 'Civic Assistant ready.',
        intent: 'GENERAL_GUIDANCE'
      });
    }
  }
}

// ==========================================
// LEVEL 2 OFFICER DETERMINISTIC FORMATTER
// ==========================================

function formatOfficerFallback(intent, dbData, userInput = '') {
  switch (intent) {
    case 'MY_PRIORITY_CASES':
    case 'WHAT_TO_HANDLE_FIRST': {
      const cases = Array.isArray(dbData) ? dbData : [];
      if (cases.length === 0) {
        return formatCopilotResponse({
          answer: 'You have zero active assigned complaints requiring prioritization right now. Great job keeping your queue clear!',
          summary: 'No active assignments pending.',
          intent
        });
      }

      const top = cases[0];
      const lines = [`Based on deterministic severity, SLA deadline, and case age, here is your prioritization ranking:`];

      cases.slice(0, 3).forEach((c, idx) => {
        const riskText = c.isOverdue 
          ? `⚠️ Overdue by ${c.hoursOverdue || 1}h` 
          : (c.hoursRemaining ? `Due in ${c.hoursRemaining}h` : 'On track');
        lines.push(`\n**${idx + 1}. ${c.id} — ${c.title}**`);
        lines.push(`• **Severity:** ${c.severity || c.priority}`);
        lines.push(`• **SLA Status:** ${riskText}`);
        lines.push(`• **Priority Score:** ${c.score} pts`);
        if (c.reasons && c.reasons.length > 0) {
          lines.push(`• **Reason:** ${c.reasons.join(', ')}`);
        }
      });

      lines.push(`\n**Recommendation:** Prioritize **${top.id}** first because of its higher urgency score.`);

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Top priority case: ${top.id} (${top.title})`,
        data: cases,
        cards: cases.slice(0, 3),
        intent,
        recommendations: [`Inspect site for ${top.id} and update status to in_progress`]
      });
    }

    case 'MY_SLA_RISK': {
      const risks = Array.isArray(dbData) ? dbData : [];
      const overdue = risks.filter(r => r.isOverdue);
      const dueSoon = risks.filter(r => !r.isOverdue);

      if (risks.length === 0) {
        return formatCopilotResponse({
          answer: 'All of your assigned complaints are well within their SLA deadlines. No immediate SLA breach risk.',
          summary: '0 SLA breach risks.',
          intent
        });
      }

      const lines = [
        `**SLA Risk Alert:** You have **${risks.length}** complaint(s) requiring urgent attention:`,
        `• Overdue / Breached: **${overdue.length}**`,
        `• Due in next 24 hours: **${dueSoon.length}**`
      ];

      risks.slice(0, 4).forEach(c => {
        const timeText = c.isOverdue ? `Overdue by ${c.hoursOverdue}h` : `Due in ${c.hoursRemaining}h`;
        lines.push(`• **${c.id}** (${c.title}) — *${timeText}*`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${overdue.length} overdue, ${dueSoon.length} due soon.`,
        data: risks,
        cards: risks.slice(0, 4),
        intent,
        recommendations: overdue.length > 0 ? [`Resolve overdue case ${overdue[0].id} immediately`] : []
      });
    }

    case 'MY_WORKLOAD':
    case 'MY_ASSIGNMENTS': {
      const assignments = Array.isArray(dbData) ? dbData : [];
      const open = assignments.filter(a => a.status === 'open' || a.status === 'assigned');
      const inProg = assignments.filter(a => a.status === 'in_progress');

      const lines = [
        `You currently have **${assignments.length} total assigned active complaint(s)**:`,
        `• Assigned / Pending Start: **${open.length}**`,
        `• In Progress: **${inProg.length}**`
      ];

      assignments.slice(0, 5).forEach(c => {
        lines.push(`• **${c.id}** — ${c.title} [${c.priority.toUpperCase()}]`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${assignments.length} active assignments.`,
        data: assignments,
        cards: assignments.slice(0, 5),
        intent
      });
    }

    case 'MY_PERFORMANCE': {
      const p = dbData || {};
      const lines = [
        `**Officer Performance Snapshot:**`,
        `• Active Workload: **${p.assignedToMe || 0} cases** (${p.overdue || 0} overdue, ${p.dueSoon || 0} due soon)`,
        `• Resolved This Month: **${p.resolvedThisMonth || 0} cases**`,
        `• Total Resolved All Time: **${p.totalResolved || 0} cases**`,
        `• SLA Compliance Rate: **${p.slaComplianceRate || 100}%**`,
        `• Reputation Points: **${p.points || 0} pts** (${p.civicLevel || 'Field Officer'})`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `SLA Compliance: ${p.slaComplianceRate}%, Resolved: ${p.totalResolved}`,
        data: p,
        intent
      });
    }

    case 'MY_POINTS':
    case 'MY_RANK': {
      const r = dbData || {};
      const rankText = r.rank ? `Rank **#${r.rank}** out of ${r.totalOfficersRanked} officers` : 'Unranked';
      const lines = [
        `**Officer Reputation & Leaderboard:**`,
        `• Total Points: **${r.points || 0} pts**`,
        `• Designation: ${r.badgeIcon || '🛡️'} *${r.level || 'Field Officer'}*`,
        `• Leaderboard Position: ${rankText}`,
        `\n**Officer Points Rules:**`,
        `• Start Investigation: **+5 pts**`,
        `• Submit Evidence: **+10 pts**`,
        `• Successful Resolution: **+25 pts**`,
        `• Resolution within SLA Bonus: **+15 pts**`,
        `• SLA Violation Penalty: **-15 pts**`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${r.points || 0} pts, Rank: ${rankText}`,
        data: r,
        intent
      });
    }

    default: {
      return formatCopilotResponse({
        answer: 'Officer Copilot ready. You can ask for your highest priority complaints, SLA breach risks, active assignments, or performance summary.',
        summary: 'Officer Copilot operational.',
        intent: 'GENERAL_OFFICER_QUERY'
      });
    }
  }
}

// ==========================================
// LEVEL 2 ADMIN DETERMINISTIC FORMATTER
// ==========================================

function formatAdminFallback(intent, dbData, userInput = '') {
  switch (intent) {
    case 'UNRESOLVED_BY_CATEGORY': {
      const u = dbData || {};
      const cat = u.filterCategory ? `${u.filterCategory} ` : '';
      const total = u.totalCount !== undefined ? u.totalCount : (Array.isArray(u.data) ? u.data.reduce((s, r) => s + (r.count || 0), 0) : 0);
      const lines = [`There are currently **${total}** unresolved ${cat}complaint(s) recorded in the municipal database.`];
      if (Array.isArray(u.data) && u.data.length > 0) {
        lines.push(`\n**Category Breakdown:**`);
        u.data.slice(0, 5).forEach(r => {
          lines.push(`• **${r.category}**: ${r.count} open/in-progress`);
        });
      }
      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${total} unresolved ${cat}complaints.`,
        data: u,
        intent
      });
    }

    case 'HIGHEST_OVERDUE_DEPARTMENT': {
      const d = dbData || {};
      const depts = d.departments || [];
      const sortedByOverdue = [...depts].sort((a, b) => (b.overdue || 0) - (a.overdue || 0));
      const top = sortedByOverdue[0] || d.topWorkloadDepartment;
      const lines = top 
        ? [`**${top.name}** has the highest overdue workload with **${top.overdue}** overdue cases out of ${top.totalAssigned} total assigned (${top.slaCompliance}% SLA compliance).`]
        : ['All municipal departments are currently operating within SLA deadlines.'];
      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: top ? `${top.name}: ${top.overdue} overdue` : '0 overdue departments',
        data: sortedByOverdue,
        intent
      });
    }

    case 'BIGGEST_HOTSPOT': {
      const h = dbData || {};
      const spots = h.hotspots || [];
      const top = h.topHotspot || spots[0];
      const lines = top
        ? [`The top complaint hotspot is in **${top.zone}** (${top.category}) with **${top.totalReports}** total reports and **${top.unresolvedCount}** unresolved cases (${top.status}).`]
        : ['No acute complaint hotspots are currently active.'];
      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: top ? `Top hotspot: ${top.zone}` : '0 hotspots',
        data: spots,
        intent
      });
    }

    case 'CRITICAL_TODAY': {
      const c = dbData || {};
      const list = c.complaints || [];
      const count = c.totalCriticalToday || list.length;
      if (count === 0) {
        return formatCopilotResponse({
          answer: 'There are **0 urgent or critical emergency complaints** registered in the last 24 hours. Municipal operations are running smoothly.',
          summary: '0 critical cases today.',
          intent
        });
      }

      let lines = [`There are **${count}** urgent/critical complaint(s) reported in the last 24 hours:`];
      list.slice(0, 5).forEach(item => {
        lines.push(`• **${item.id}** — ${item.title} (${item.category}) — *${item.priority.toUpperCase()}* at ${item.address || 'Field Location'}`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${count} critical complaints today.`,
        data: list,
        cards: list.slice(0, 5),
        intent,
        recommendations: ['Ensure rapid response dispatch to highest scoring emergency items']
      });
    }

    case 'DEPARTMENT_SUMMARY': {
      const d = dbData || {};
      const depts = d.departments || [];
      const top = d.topWorkloadDepartment;
      if (depts.length === 0) {
        return formatCopilotResponse({
          answer: 'All municipal departments are currently balanced with no active workload recorded.',
          summary: '0 department workloads.',
          intent
        });
      }

      let lines = [`**Municipal Department Workload Summary:**`];
      if (top) {
        lines.push(`• Top Workload: **${top.name}** with **${top.totalAssigned}** active cases (${top.overdue} overdue, ${top.slaCompliance}% SLA compliance)`);
      }
      lines.push(`\n**All Departments:**`);
      depts.slice(0, 5).forEach(dept => {
        lines.push(`• **${dept.name}**: ${dept.totalAssigned} active | ${dept.overdue} overdue | ${dept.slaCompliance}% SLA`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Highest workload: ${top?.name || 'N/A'}`,
        data: depts,
        intent
      });
    }

    case 'SLA_BREACHES': {
      const s = dbData || {};
      const breaches = s.breaches || [];
      const total = s.totalBreaches || breaches.length;

      if (total === 0) {
        return formatCopilotResponse({
          answer: 'All active complaints across the city are currently operating within SLA deadlines. Zero SLA breaches.',
          summary: '0 SLA breaches.',
          intent
        });
      }

      let lines = [`There are currently **${total}** complaint(s) that have breached their SLA resolution window:`];
      breaches.slice(0, 5).forEach(b => {
        lines.push(`• **${b.id}** — ${b.title} (${b.category}) — Overdue by **${b.hoursOverdue || 1} hour(s)** [Dept: ${b.department_name || 'General'}]`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${total} SLA breaches found.`,
        data: breaches,
        cards: breaches.slice(0, 5),
        intent,
        recommendations: ['Issue escalation alerts to responsible department supervisors']
      });
    }

    case 'WARD_UNRESOLVED': {
      const w = dbData || {};
      const breakdown = w.wardBreakdown || [];
      const top = w.topUnresolvedWard;

      if (breakdown.length === 0) {
        return formatCopilotResponse({
          answer: 'All municipal wards currently have zero unresolved complaints.',
          summary: '0 ward backlogs.',
          intent
        });
      }

      let lines = [`**Ward Unresolved Complaint Analysis:**`];
      if (top) {
        lines.push(`• Highest Backlog: **${top.name}** (Ward #${top.wardNumber}) with **${(top.open || 0) + (top.inProgress || 0)}** unresolved cases (${top.slaCompliance}% SLA compliance).`);
      }
      lines.push(`\n**Top Wards by Unresolved Issues:**`);
      breakdown.slice(0, 5).forEach(item => {
        lines.push(`• **${item.wardName}** (#${item.wardNumber}): ${item.unresolved} unresolved / ${item.total} total (${item.slaCompliance} compliance)`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Top unresolved ward: ${top?.name || 'N/A'}`,
        data: breakdown,
        intent
      });
    }

    case 'OFFICER_PERFORMANCE': {
      const o = dbData || {};
      const busy = o.highestWorkloadOfficers || [];
      const compliant = o.bestComplianceOfficers || [];
      const attention = o.needsAttentionOfficers || [];

      let lines = [`**Officer Operational Analytics:**`];
      if (compliant.length > 0) {
        lines.push(`• **Top SLA Compliant Officers:** ${compliant.map(x => `${x.name} (${x.slaCompliance}%)`).join(', ')}`);
      }
      if (busy.length > 0) {
        lines.push(`• **Highest Workload Officers:** ${busy.map(x => `${x.name} (${x.activeAssignments} cases)`).join(', ')}`);
      }
      if (attention.length > 0) {
        lines.push(`• **Officers Needing Attention (Overdue Cases):** ${attention.map(x => `${x.name} (${x.overdueAssignments} overdue)`).join(', ')}`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Officer analytics evaluated.`,
        data: o,
        intent
      });
    }

    case 'CIVIC_HEALTH': {
      const h = dbData || {};
      const lines = [
        `**Municipal Civic Health Snapshot:**`,
        `• Total Registered Complaints: **${h.totalComplaints || 0}**`,
        `• Active Cases: **${(h.openComplaints || 0) + (h.inProgressComplaints || 0)}** (Open: ${h.openComplaints || 0}, In Progress: ${h.inProgressComplaints || 0})`,
        `• Resolved Complaints: **${h.resolvedComplaints || 0}** (${h.resolutionRate || 0}% resolution rate)`,
        `• Overdue SLA Cases: **${h.overdueComplaints || 0}**`,
        `• Critical Complaints (Last 24h): **${h.criticalToday || 0}**`,
        `• City-wide SLA Compliance: **${h.slaCompliance || 0}%**`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Civic Health: ${h.resolutionRate}% resolution, ${h.slaCompliance}% SLA.`,
        data: h,
        intent
      });
    }

    case 'GIS_HOTSPOTS': {
      const h = dbData || {};
      const spots = h.hotspots || [];
      const top = h.topHotspot;

      if (spots.length === 0) {
        return formatCopilotResponse({
          answer: 'No acute complaint hotspots or dense clusters are currently detected across the city.',
          summary: '0 hotspots detected.',
          intent
        });
      }

      let lines = [`**Geospatial Complaint Hotspots (Last 30 Days):**`];
      if (top) {
        lines.push(`• **Primary Hotspot:** ${top.zone} (${top.category}) with **${top.totalReports}** reports (${top.unresolvedCount} unresolved).`);
      }
      spots.slice(0, 4).forEach(s => {
        lines.push(`• **${s.zone}** — ${s.category}: ${s.totalReports} reports (${s.unresolvedCount} unresolved, Status: ${s.status})`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Top hotspot: ${top?.zone || 'N/A'}`,
        data: spots,
        intent
      });
    }

    case 'COMPLAINT_TRENDS': {
      const t = dbData || {};
      const trends = t.trends || [];
      const top = t.topRising;

      if (trends.length === 0) {
        return formatCopilotResponse({
          answer: 'Complaint volume across all categories is currently stable.',
          summary: 'Stable complaint trends.',
          intent
        });
      }

      let lines = [`**Predictive Category Trends (30-Day Window):**`];
      if (top) {
        lines.push(`• **Fastest Increasing Category:** ${top.category} (+${top.changePercentage}% change)`);
      }
      trends.slice(0, 5).forEach(tr => {
        lines.push(`• **${tr.category}**: ${tr.currentCount} cases (${tr.changePercentage > 0 ? '+' : ''}${tr.changePercentage}% vs previous period)`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Top rising: ${top?.category || 'N/A'}`,
        data: trends,
        intent
      });
    }

    default: {
      return formatCopilotResponse({
        answer: 'Governance Copilot operational. You can query critical emergencies, department workloads, ward scorecards, SLA breaches, or officer performance.',
        summary: 'Governance Copilot ready.',
        intent: 'GENERAL_ADMIN_QUERY'
      });
    }
  }
}

module.exports = {
  formatCopilotResponse,
  formatCitizenFallback,
  formatOfficerFallback,
  formatAdminFallback
};
