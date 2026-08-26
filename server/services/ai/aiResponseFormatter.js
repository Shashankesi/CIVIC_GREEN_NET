/**
 * Standardized AI Copilot Response Schema:
 * {
 *   answer: string (Markdown/HTML-safe text)
 *   summary: string (Short 1-2 sentence executive briefing)
 *   data: object | array (Raw verified database records)
 *   recommendations: string[] (Actionable next steps)
 *   sources: string[] (Attribution)
 *   intent: string
 *   confidence: number
 *   cards: object[] (Optional complaint cards)
 * }
 */

function formatCopilotResponse({
  answer = '',
  summary = null,
  data = null,
  recommendations = [],
  sources = ['PostgreSQL Live Database'],
  intent = 'GENERAL',
  confidence = 1.0,
  cards = []
}) {
  return {
    answer: answer ? answer.trim() : '',
    summary: summary || (answer ? answer.slice(0, 160).replace(/\n/g, ' ') + '...' : null),
    data,
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
    case 'MY_COMPLAINTS':
    case 'COMPLAINT_STATUS': {
      const list = Array.isArray(dbData) ? dbData : (dbData?.complaints || []);
      if (list.length === 0) {
        return formatCopilotResponse({
          answer: 'You currently have **0 active civic complaints** filed in the system. If you notice an issue like a pothole, broken streetlight, or garbage overflow, you can file a new complaint easily from the citizen portal.',
          summary: '0 active complaints found.',
          data: [],
          intent
        });
      }

      const lines = [
        `You have **${list.length} complaint(s)** registered with the municipal administration:`,
        ''
      ];

      list.forEach((c, idx) => {
        const slaText = c.isOverdue
          ? '🔴 **Overdue**'
          : (c.hoursRemaining ? `⏳ Due in **${c.hoursRemaining}h**` : '⏳ In SLA timeframe');
        lines.push(`${idx + 1}. **${c.id}** — *${c.title}*`);
        lines.push(`   • Category: **${c.category}** | Status: **${c.status.toUpperCase()}**`);
        lines.push(`   • Priority: **${c.priority.toUpperCase()}** | Timeline: ${slaText}`);
        if (c.assigned_officer_name) {
          lines.push(`   • Assigned Officer: **${c.assigned_officer_name}**`);
        }
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${list.length} active complaints found.`,
        data: list,
        cards: list.slice(0, 5),
        intent,
        recommendations: [
          'Click any complaint ID to view real-time field progress.',
          'You can add additional photos or evidence if required.'
        ]
      });
    }

    case 'MY_REPUTATION':
    case 'MY_POINTS': {
      const rep = dbData || {};
      const lines = [
        `**Your Civic Reputation Profile:**`,
        `• Current Balance: **${rep.points || 0} Civic Points**`,
        `• Contributor Level: ${rep.badgeIcon || '🌱'} **${rep.civicLevel || 'New Contributor'}**`,
        `• Active Badges: **${(rep.badges || []).length} earned**`,
        '',
        `**How to earn more points:**`,
        `• Submit verified civic complaints: **+10 pts**`,
        `• Confirm resolved issues: **+15 pts**`,
        `• Provide accurate GPS location: **+5 pts**`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Total Points: ${rep.points || 0} (${rep.civicLevel})`,
        data: rep,
        intent
      });
    }

    case 'SLA_TIMELINES': {
      const g = dbData || {};
      const lines = [
        `**Municipal SLA Response Guidelines:**`,
        `• Category: **${g.category || 'General Municipal'}**`,
        `• Resolution SLA: **${g.slaHours || 48} hours**`,
        `• Responsible Department: **${g.contact || 'Central Operations'}**`,
        '',
        `💡 *Recommendation:* ${g.advice || 'Include clear location and landmark details.'}`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Standard SLA: ${g.slaHours || 48} hours`,
        data: g,
        intent
      });
    }

    case 'CITY_STATS': {
      const s = dbData || {};
      const lines = [
        `**City-Wide Civic Operations Snapshot:**`,
        `• Total Reported Issues: **${s.total_complaints || 0}**`,
        `• Successfully Resolved: **${s.resolved_complaints || 0}**`,
        `• Active Cases in Field: **${s.active_complaints || 0}**`,
        `• Municipal Resolution Rate: **${s.resolution_rate || 0}%**`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `City Resolution Rate: ${s.resolution_rate || 0}%`,
        data: s,
        intent
      });
    }

    default: {
      return formatCopilotResponse({
        answer: 'Hello! I am your Civic Assistant. I can help you track your complaints, check resolution timelines, explain municipal SLAs, and view your civic reputation score. How can I help you today?',
        summary: 'Civic Assistant ready.',
        intent: 'GENERAL_ASSISTANCE'
      });
    }
  }
}

// ==========================================
// LEVEL 2 OFFICER DETERMINISTIC FORMATTER
// ==========================================

function formatOfficerFallback(intent, dbData, userInput = '') {
  switch (intent) {
    case 'GREETING': {
      return formatCopilotResponse({
        answer: `Hello! I'm your **Officer Copilot**. I can help you with:\n• **Priority Complaints** — see what needs attention first\n• **SLA Alerts** — identify overdue or at-risk cases\n• **Your Workload** — summary of your active assignments\n• **Department Workload** — departmental queue stats\n• **Performance & Score** — your resolution rate and compliance\n• **Officer Points & Rank** — your leaderboard position\n\nWhat would you like to check?`,
        summary: 'Officer Copilot ready to assist.',
        intent
      });
    }

    case 'HELP': {
      return formatCopilotResponse({
        answer: `**Officer Copilot Quick Guide:**\n• Ask: *"Show my highest priority complaints"* to see deterministically ranked cases.\n• Ask: *"Which complaints are close to SLA breach?"* for urgent deadlines.\n• Ask: *"How is my performance?"* for your compliance and resolution rate.\n• Ask: *"Show department workload"* for department queue metrics.\n• Ask: *"Tell me about complaint CGN-XXXXX"* for a specific case file.`,
        summary: 'Help and usage instructions.',
        intent
      });
    }

    case 'PRIORITY_CASES':
    case 'MY_PRIORITY_CASES': {
      const p = dbData || {};
      const cases = p.assignedPriorityCases || (Array.isArray(dbData) ? dbData : []);
      const unassigned = p.unassignedDepartmentCases || [];

      if (cases.length === 0 && unassigned.length === 0) {
        return formatCopilotResponse({
          answer: 'You have **0 active assigned complaints** in your queue, and no unassigned emergency complaints in your department. All assigned cases have been resolved.',
          summary: 'No active priority cases.',
          data: p,
          intent
        });
      }

      const lines = [];
      if (cases.length > 0) {
        lines.push(`**Highest-Priority Active Assignments (${cases.length} cases):**\n`);
        cases.slice(0, 5).forEach((c, idx) => {
          const reasonText = (c.reasons || []).length > 0 ? ` (${c.reasons[0]})` : '';
          const deadlineText = c.isOverdue
            ? `🔴 **Overdue by ${c.hoursOverdue || 1}h**`
            : (c.hoursRemaining ? `⏳ **Due in ${c.hoursRemaining}h**` : '⏳ In SLA');

          lines.push(`${idx + 1}. **${c.id}** — *${c.title}*`);
          lines.push(`   • Category: **${c.category}** | Severity: **${(c.severity || c.priority).toUpperCase()}**`);
          lines.push(`   • SLA Status: ${deadlineText}`);
          lines.push(`   • Priority Score: **${c.score || 0} pts**${reasonText}`);
        });

        const top = cases[0];
        lines.push(`\n**Recommended First Action:**`);
        lines.push(`Begin investigation on **${top.id}** (*${top.title}*) because it carries the highest operational priority score (**${top.score} pts**) based on severity and SLA timeline.`);
      } else if (unassigned.length > 0) {
        lines.push(`Your personal assigned queue has **0 active complaints**, but there are **${unassigned.length} unassigned open cases** in your department:\n`);
        unassigned.slice(0, 3).forEach((c, idx) => {
          lines.push(`${idx + 1}. **${c.id}** — *${c.title}* [${c.priority.toUpperCase()}]`);
        });
        lines.push(`\nYou may assign these cases to yourself from the Department Queue.`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: cases.length > 0 ? `Top priority: ${cases[0].id}` : 'Queue clear',
        data: p,
        cards: cases.slice(0, 4),
        intent,
        recommendations: cases.length > 0 ? [`Dispatch to ${cases[0].id} immediately`] : ['Claim unassigned department cases if capacity permits']
      });
    }

    case 'SLA_ALERTS':
    case 'MY_SLA_RISK': {
      const a = dbData || {};
      const overdue = a.overdue || [];
      const due2h = a.dueWithin2Hours || [];
      const due6h = a.dueWithin6Hours || [];
      const due24h = a.dueWithin24Hours || [];
      const allRisks = [...overdue, ...due2h, ...due6h, ...due24h];

      if (allRisks.length === 0) {
        return formatCopilotResponse({
          answer: 'Good news! **0 of your assigned complaints** are currently overdue or approaching SLA breach. All active cases are safely within operational timelines.',
          summary: '0 SLA alerts. Operations normal.',
          data: a,
          intent
        });
      }

      const lines = [
        `**SLA Risk Assessment (${allRisks.length} cases needing attention):**\n`
      ];

      if (overdue.length > 0) {
        lines.push(`🔴 **OVERDUE CASES (${overdue.length}):**`);
        overdue.forEach(c => {
          lines.push(`• **${c.id}** — ${c.title} (Overdue by **${c.hoursOverdue || 1}h**)`);
        });
        lines.push('');
      }

      if (due2h.length > 0) {
        lines.push(`🟠 **CRITICAL: DUE WITHIN 2 HOURS (${due2h.length}):**`);
        due2h.forEach(c => {
          lines.push(`• **${c.id}** — ${c.title} (SLA deadline in **${c.hoursRemaining}h**)`);
        });
        lines.push('');
      }

      if (due6h.length > 0) {
        lines.push(`🟡 **URGENT: DUE WITHIN 6 HOURS (${due6h.length}):**`);
        due6h.forEach(c => {
          lines.push(`• **${c.id}** — ${c.title} (SLA deadline in **${c.hoursRemaining}h**)`);
        });
        lines.push('');
      }

      if (due24h.length > 0) {
        lines.push(`🔵 **DUE WITHIN 24 HOURS (${due24h.length}):**`);
        due24h.slice(0, 3).forEach(c => {
          lines.push(`• **${c.id}** — ${c.title} (SLA in **${c.hoursRemaining}h**)`);
        });
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${overdue.length} overdue, ${due2h.length} due < 2h.`,
        data: a,
        cards: allRisks.slice(0, 4),
        intent,
        recommendations: overdue.length > 0
          ? [`Immediately update resolution status on overdue case ${overdue[0].id}`]
          : [`Attend to imminent deadline case ${due2h[0]?.id || allRisks[0]?.id}`]
      });
    }

    case 'MY_WORKLOAD':
    case 'MY_ASSIGNMENTS': {
      const w = dbData?.totalActive !== undefined ? dbData : {
        totalActive: Array.isArray(dbData) ? dbData.length : 0,
        pendingStartCount: Array.isArray(dbData) ? dbData.filter(x => x.status === 'open' || x.status === 'assigned').length : 0,
        inProgressCount: Array.isArray(dbData) ? dbData.filter(x => x.status === 'in_progress').length : 0,
        overdueCount: Array.isArray(dbData) ? dbData.filter(x => x.isOverdue).length : 0,
        criticalCount: Array.isArray(dbData) ? dbData.filter(x => x.priority === 'critical' || x.severity === 'critical').length : 0,
        cases: Array.isArray(dbData) ? dbData : []
      };

      const lines = [
        `**YOUR CURRENT WORKLOAD**\n`,
        `Total active assignments: **${w.totalActive}**\n`,
        `• Pending Start: **${w.pendingStartCount}**`,
        `• In Progress: **${w.inProgressCount}**`,
        `• Overdue: **${w.overdueCount}**`,
        `• Critical Severity: **${w.criticalCount}**`
      ];

      if (w.cases && w.cases.length > 0) {
        lines.push(`\n**Active Cases:**`);
        w.cases.slice(0, 5).forEach(c => {
          lines.push(`• **${c.id}** — ${c.title} [${(c.priority || 'medium').toUpperCase()}] (${c.status})`);
        });
      } else {
        lines.push(`\n*Your personal assignment queue is currently clear.*`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${w.totalActive} active cases (${w.overdueCount} overdue).`,
        data: w,
        cards: (w.cases || []).slice(0, 5),
        intent
      });
    }

    case 'DEPARTMENT_WORKLOAD': {
      const d = dbData || {};
      const lines = [
        `**DEPARTMENT WORKLOAD: ${d.departmentName || 'Your Department'}**\n`,
        `• Total Active In-Flight: **${d.active_complaints || 0} cases**`,
        `• Unassigned / Open Queue: **${d.open_queue || 0} cases**`,
        `• In Progress: **${d.in_progress || 0} cases**`,
        `• Overdue SLA Breaches: **${d.overdue || 0} cases**`,
        `• Critical Emergency Cases: **${d.critical || 0} cases**`,
        `• Total Resolved: **${d.resolved || 0} cases**`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${d.departmentName}: ${d.active_complaints || 0} active, ${d.overdue || 0} overdue`,
        data: d,
        intent
      });
    }

    case 'MY_PERFORMANCE': {
      const p = dbData || {};
      const lines = [
        `**YOUR OFFICER PERFORMANCE METRICS:**\n`,
        `• SLA Compliance Rate: **${p.slaComplianceRate || 100}%**`,
        `• Resolution Rate: **${p.resolutionRate || 100}%**`,
        `• Cases Resolved This Month: **${p.resolvedThisMonth || 0}**`,
        `• Total Resolved All Time: **${p.totalResolved || 0}**`,
        `• Current Active Workload: **${p.assignedToMe || 0}** (${p.overdue || 0} overdue)`,
        `• Reopened Cases: **${p.reopenedCount || 0}**`,
        `• Performance Points: **${p.points || 0} pts** (${p.civicLevel || 'Field Officer'})`
      ];

      if (p.leaderboardRank) {
        lines.push(`• Leaderboard Rank: **#${p.leaderboardRank}** of ${p.totalOfficersRanked || 'all'} officers`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `SLA Compliance: ${p.slaComplianceRate}%, Resolved: ${p.totalResolved}`,
        data: p,
        intent
      });
    }

    case 'MY_POINTS':
    case 'MY_REPUTATION': {
      const r = dbData || {};
      const rankText = r.rank || r.leaderboardRank ? `Rank **#${r.rank || r.leaderboardRank}**` : 'Unranked';
      const lines = [
        `**Officer Points & Reputation:**\n`,
        `• Total Points: **${r.points || 0} pts**`,
        `• Rank & Level: ${r.badgeIcon || '🛡️'} *${r.level || 'Field Officer'}* (${rankText})`,
        `\n**Point Value Rules:**`,
        `• Start Investigation: **+5 pts**`,
        `• Evidence Upload: **+10 pts**`,
        `• Case Resolution: **+25 pts**`,
        `• SLA Bonus (on-time): **+15 pts**`,
        `• SLA Violation Penalty: **-15 pts**`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${r.points || 0} pts, ${rankText}`,
        data: r,
        intent
      });
    }

    case 'COMPLAINT_DETAILS':
    case 'COMPLAINT_STATUS': {
      const c = dbData || {};
      if (c.error) {
        return formatCopilotResponse({
          answer: `⚠️ **${c.error}**`,
          summary: c.error,
          intent
        });
      }

      const lines = [
        `**CASE FILE: ${c.id}**\n`,
        `• Title: **${c.title}**`,
        `• Category: **${c.category}** | Severity: **${(c.severity || c.priority).toUpperCase()}**`,
        `• Status: **${c.status.toUpperCase()}**`,
        `• Location / Address: ${c.address || 'GPS Coordinates Registered'}`,
        `• Assigned Officer: **${c.assigned_officer_name || (c.isAssignedToCaller ? 'Assigned to You' : 'Unassigned')}**`,
        `• Created: ${c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A'}`,
        `• SLA Deadline: ${c.sla_due_at ? new Date(c.sla_due_at).toLocaleString() : 'N/A'} (${c.isOverdue ? '🔴 Overdue' : '🟢 Within SLA'})`
      ];

      if (c.description) {
        lines.push(`\n**Description:**\n${c.description}`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${c.id}: ${c.title} (${c.status})`,
        data: c,
        cards: [c],
        intent
      });
    }

    case 'TODAY_SUMMARY': {
      const s = dbData || {};
      const w = s.workload || {};
      const topCases = s.topPriorityCases || [];
      const lines = [
        `**TODAY'S OPERATIONAL FOCUS**\n`,
        `You have **${w.totalActive || 0} active assignments** (${w.overdueCount || 0} overdue, ${w.criticalCount || 0} critical).\n`
      ];

      if (topCases.length > 0) {
        lines.push(`**Recommended Action Sequence:**`);
        topCases.forEach((c, idx) => {
          const statusDesc = c.isOverdue
            ? `🔴 overdue by ${c.hoursOverdue || 1}h`
            : (c.hoursRemaining ? `⏳ SLA in ${c.hoursRemaining}h` : 'active');
          lines.push(`${idx + 1}. **${c.id}** (${c.title}) — ${statusDesc}`);
        });
      } else {
        lines.push(`*Your immediate queue has no pending items. Check department unassigned queue if you have capacity.*`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Today: ${w.totalActive || 0} active cases.`,
        data: s,
        cards: topCases.slice(0, 3),
        intent
      });
    }

    case 'UNKNOWN':
    default: {
      return formatCopilotResponse({
        answer: `I can check that for you. Did you mean:\n• **Priority Complaints** in your assigned queue?\n• **SLA Alerts** and overdue deadlines?\n• **Department Workload** overview?\n• **Your Performance** and SLA compliance rate?\n\nFeel free to type your exact question or click one of the quick actions above!`,
        summary: 'Clarification required.',
        intent: 'UNKNOWN'
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

      const lines = [
        `**Municipal Emergency Action Summary:**`,
        `There are **${count} critical/urgent complaint(s)** registered in the last 24 hours requiring immediate supervision:\n`
      ];

      list.slice(0, 5).forEach((item, idx) => {
        lines.push(`${idx + 1}. **${item.id}** — *${item.title}*`);
        lines.push(`   • Category: **${item.category}** | Department: **${item.department_name || 'General'}**`);
        lines.push(`   • Officer: **${item.assigned_officer_name || 'Unassigned'}**`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${count} critical complaints registered today.`,
        data: c,
        cards: list.slice(0, 5),
        intent,
        recommendations: [
          'Verify officer assignment on unassigned critical complaints.',
          'Review field escalation protocols for pending cases.'
        ]
      });
    }

    case 'DEPARTMENT_SUMMARY': {
      const d = dbData || {};
      const list = d.departments || [];
      const lines = [
        `**Department Workload & SLA Compliance Snapshot:**\n`
      ];

      list.forEach(dept => {
        lines.push(`• **${dept.name}**: ${dept.totalAssigned} active | **${dept.overdue} overdue** | ${dept.slaCompliance}% SLA Compliance`);
      });

      if (d.topWorkloadDepartment) {
        lines.push(`\n**Leadership Note:** Department of *${d.topWorkloadDepartment.name}* carries the highest current load.`);
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Department analytics for ${list.length} departments.`,
        data: d,
        intent
      });
    }

    case 'SLA_BREACHES': {
      const b = dbData || {};
      const list = b.breaches || [];
      if (list.length === 0) {
        return formatCopilotResponse({
          answer: 'Outstanding news! There are **0 active SLA breaches** across the entire municipality. All departments are performing within designated service timelines.',
          summary: '0 SLA breaches city-wide.',
          data: b,
          intent
        });
      }

      const lines = [
        `**City-Wide SLA Breach Report:**`,
        `There are currently **${b.totalBreaches || list.length} overdue complaint(s)** across municipal departments:\n`
      ];

      list.slice(0, 5).forEach((item, idx) => {
        lines.push(`${idx + 1}. **${item.id}** — *${item.title}*`);
        lines.push(`   • Department: **${item.department_name || 'Unassigned'}** | Overdue by: **${item.hoursOverdue || item.hours_overdue || 1} hour(s)**`);
        lines.push(`   • Officer: **${item.assigned_officer_name || 'Unassigned'}**`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `${b.totalBreaches || list.length} SLA breaches active.`,
        data: b,
        cards: list.slice(0, 5),
        intent,
        recommendations: [
          'Trigger administrative re-assignment on overdue tickets > 48h.',
          'Instruct department heads to prioritize overdue queues.'
        ]
      });
    }

    case 'WARD_UNRESOLVED': {
      const w = dbData || {};
      const list = w.wardBreakdown || [];
      const lines = [
        `**Ward-Level Complaint Scorecard (Top Unresolved):**\n`
      ];

      list.slice(0, 5).forEach(ward => {
        lines.push(`• **${ward.wardName}** (Ward #${ward.wardNumber}): **${ward.unresolved} unresolved** (${ward.open} open, ${ward.inProgress} in progress) | SLA: ${ward.slaCompliance}`);
      });

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Ward scorecard loaded for ${list.length} wards.`,
        data: w,
        intent
      });
    }

    case 'OFFICER_PERFORMANCE': {
      const p = dbData || {};
      const high = p.highestWorkloadOfficers || [];
      const lines = [
        `**Officer Workload & Compliance Overview:**\n`
      ];

      if (high.length > 0) {
        lines.push(`**Highest Active Workload:**`);
        high.slice(0, 4).forEach(o => {
          lines.push(`• **${o.name}** (${o.departmentName || 'Field'}): ${o.activeAssignments} active (${o.overdueAssignments} overdue)`);
        });
      }

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: 'Officer performance analytics loaded.',
        data: p,
        intent
      });
    }

    case 'CIVIC_HEALTH':
    default: {
      const h = dbData || {};
      const lines = [
        `**City-Wide Civic Health Overview:**`,
        `• Total Municipal Complaints: **${h.totalComplaints || 0}**`,
        `• Active Cases: **${(h.openComplaints || 0) + (h.inProgressComplaints || 0)}** (${h.openComplaints || 0} open, ${h.inProgressComplaints || 0} in progress)`,
        `• Successfully Resolved: **${h.resolvedComplaints || 0}**`,
        `• Resolution Rate: **${h.resolutionRate || 0}%**`,
        `• SLA Compliance: **${h.slaCompliance || 0}%**`,
        `• Overdue Breaches: **${h.overdueComplaints || 0}**`,
        `• Critical Emergency Cases Today: **${h.criticalToday || 0}**`
      ];

      return formatCopilotResponse({
        answer: lines.join('\n'),
        summary: `Resolution Rate: ${h.resolutionRate || 0}%, SLA: ${h.slaCompliance || 0}%`,
        data: h,
        intent: 'CIVIC_HEALTH'
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
