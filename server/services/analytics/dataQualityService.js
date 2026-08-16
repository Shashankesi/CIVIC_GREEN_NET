const db = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * 1. Data Quality Health Report
 */
async function getDataQualityReport() {
  if (!db._pool) return getFallbackDataQuality();

  try {
    const qualityQuery = `
      SELECT
        COUNT(*)::int AS total_complaints,
        COUNT(CASE WHEN location IS NULL THEN 1 END)::int AS missing_location,
        COUNT(CASE WHEN department_id IS NULL THEN 1 END)::int AS missing_department,
        COUNT(CASE WHEN officer_id IS NULL AND status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS unassigned_active,
        COUNT(CASE WHEN sla_due_at IS NULL AND status NOT IN ('resolved', 'closed', 'rejected') THEN 1 END)::int AS missing_sla,
        COUNT(CASE WHEN address IS NULL OR TRIM(address) = '' THEN 1 END)::int AS missing_address
      FROM complaints;
    `;

    const res = await db.query(qualityQuery);
    const row = res.rows[0] || {};

    const total = row.total_complaints || 0;
    const missingLoc = row.missing_location || 0;
    const missingDept = row.missing_department || 0;
    const unassigned = row.unassigned_active || 0;
    const missingSla = row.missing_sla || 0;
    const missingAddr = row.missing_address || 0;

    // Calculate Data Integrity Score (0-100)
    let score = 100;
    if (total > 0) {
      const locPenalty = (missingLoc / total) * 30;
      const deptPenalty = (missingDept / total) * 30;
      const slaPenalty = (missingSla / total) * 20;
      const addrPenalty = (missingAddr / total) * 20;
      score = Math.round(Math.max(0, 100 - (locPenalty + deptPenalty + slaPenalty + addrPenalty)));
    }

    return {
      integrityScore: score,
      status: score >= 90 ? 'OPTIMAL' : score >= 75 ? 'SATISFACTORY' : 'NEEDS ATTENTION',
      totalComplaints: total,
      anomalies: {
        missingLocation: missingLoc,
        missingDepartment: missingDept,
        unassignedActive: unassigned,
        missingSla: missingSla,
        missingAddress: missingAddr
      },
      completenessRate: {
        location: total > 0 ? parseFloat((((total - missingLoc) / total) * 100).toFixed(1)) : 100.0,
        department: total > 0 ? parseFloat((((total - missingDept) / total) * 100).toFixed(1)) : 100.0,
        sla: total > 0 ? parseFloat((((total - missingSla) / total) * 100).toFixed(1)) : 100.0,
        address: total > 0 ? parseFloat((((total - missingAddr) / total) * 100).toFixed(1)) : 100.0
      }
    };
  } catch (err) {
    logger.error('[DataQualityService getDataQualityReport Error]', { err: err.message });
    return getFallbackDataQuality();
  }
}

/**
 * 2. Governance Rule-Based Alerts
 */
async function getGovernanceAlerts() {
  if (!db._pool) return [];

  try {
    const alerts = [];

    // Check 1: Overdue cases
    const overdueRes = await db.query(`
      SELECT COUNT(*)::int AS count
      FROM complaints
      WHERE status NOT IN ('resolved', 'closed', 'rejected') AND sla_due_at IS NOT NULL AND sla_due_at < now();
    `);
    const overdueCount = overdueRes.rows[0]?.count || 0;
    if (overdueCount > 0) {
      alerts.push({
        id: 'alert-overdue-sla',
        type: 'sla_breach_spike',
        severity: overdueCount >= 5 ? 'critical' : 'high',
        title: 'Active SLA Breaches Detected',
        description: `There are currently ${overdueCount} complaint(s) exceeding SLA resolution deadlines.`,
        metricValue: overdueCount,
        thresholdValue: 0
      });
    }

    // Check 2: Critical backlog
    const critRes = await db.query(`
      SELECT COUNT(*)::int AS count
      FROM complaints
      WHERE priority = 'critical' AND status NOT IN ('resolved', 'closed', 'rejected');
    `);
    const critCount = critRes.rows[0]?.count || 0;
    if (critCount > 0) {
      alerts.push({
        id: 'alert-crit-backlog',
        type: 'critical_backlog',
        severity: critCount >= 3 ? 'critical' : 'high',
        title: 'Critical Emergency Backlog',
        description: `${critCount} critical public safety or infrastructure ticket(s) are awaiting resolution.`,
        metricValue: critCount,
        thresholdValue: 0
      });
    }

    // Check 3: Department Overload / Low SLA (<85%)
    const deptSlaRes = await db.query(`
      SELECT
        d.name,
        COUNT(c.id)::int AS total,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') AND (c.sla_due_at IS NULL OR c.resolution_at <= c.sla_due_at) THEN 1 END)::int AS on_time,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END)::int AS resolved
      FROM departments d
      JOIN complaints c ON c.department_id = d.id
      GROUP BY d.name
      HAVING COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END) >= 5;
    `);

    deptSlaRes.rows.forEach(d => {
      const rate = (d.on_time / d.resolved) * 100;
      if (rate < 85) {
        alerts.push({
          id: `alert-dept-sla-${d.name.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'department_overload',
          severity: rate < 70 ? 'high' : 'medium',
          title: `Low SLA in ${d.name}`,
          description: `${d.name} department SLA compliance is at ${rate.toFixed(1)}% (target: >= 85%).`,
          metricValue: parseFloat(rate.toFixed(1)),
          thresholdValue: 85.0
        });
      }
    });

    return alerts;
  } catch (err) {
    logger.error('[DataQualityService getGovernanceAlerts Error]', { err: err.message });
    return [];
  }
}

function getFallbackDataQuality() {
  return {
    integrityScore: 100,
    status: 'OPTIMAL',
    totalComplaints: 0,
    anomalies: { missingLocation: 0, missingDepartment: 0, unassignedActive: 0, missingSla: 0, missingAddress: 0 },
    completenessRate: { location: 100, department: 100, sla: 100, address: 100 }
  };
}

module.exports = {
  getDataQualityReport,
  getGovernanceAlerts
};
