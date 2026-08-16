const db = require('../../config/db');
const { CATEGORY_DEPARTMENT_MAPPING } = require('./complaintClassifier');
const logger = require('../../utils/logger');

/**
 * Smart Department and Officer Routing Engine
 */
async function recommendRouting({ category, priority = 'medium', severity = 'moderate', address = null }) {
  const normCategory = (category || 'other').toLowerCase();
  const deptName = CATEGORY_DEPARTMENT_MAPPING[normCategory] || 'General Municipal Operations';

  let department = null;
  let officers = [];

  if (db._pool) {
    try {
      // 1. Fetch matching department from database
      const deptRes = await db.query(
        `SELECT id, name FROM departments WHERE LOWER(name) LIKE $1 OR LOWER(name) LIKE $2 LIMIT 1`,
        [`%${normCategory}%`, `%${deptName.toLowerCase()}%`]
      );
      department = deptRes.rows[0] || null;

      if (!department) {
        const anyDept = await db.query('SELECT id, name FROM departments ORDER BY id ASC LIMIT 1');
        department = anyDept.rows[0] || { id: 1, name: deptName };
      }

      // 2. Fetch officers in this department with their active workloads and availability
      const officerQuery = `
        SELECT 
          u.id, 
          u.name, 
          u.email,
          COALESCE(u.availability, 'AVAILABLE') AS availability,
          COUNT(CASE WHEN c.status IN ('assigned', 'in_progress', 'open') THEN 1 END)::int AS active_cases,
          COUNT(CASE WHEN c.sla_due_at IS NOT NULL AND c.sla_due_at < now() AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS overdue_cases,
          COUNT(CASE WHEN c.priority IN ('high', 'urgent', 'critical') AND c.status NOT IN ('resolved', 'closed') THEN 1 END)::int AS high_priority_cases
        FROM users u
        LEFT JOIN complaints c ON c.officer_id = u.id
        WHERE u.role = 'officer' AND (u.department_id = $1 OR u.department_id IS NULL)
        GROUP BY u.id, u.name, u.email, COALESCE(u.availability, 'AVAILABLE')
        ORDER BY 
          CASE WHEN UPPER(COALESCE(u.availability, 'AVAILABLE')) = 'AVAILABLE' THEN 0 ELSE 1 END,
          active_cases ASC,
          overdue_cases ASC;
      `;

      const offRes = await db.query(officerQuery, [department.id]);
      officers = offRes.rows;
    } catch (err) {
      logger.warn('[Routing Engine] DB query error, using fallback:', { err: err.message });
    }
  }

  // 3. Select best officer
  let recommendedOfficer = null;
  const availableOfficers = officers.filter(o => o.availability?.toUpperCase() === 'AVAILABLE');
  const pool = availableOfficers.length > 0 ? availableOfficers : officers;

  if (pool.length > 0) {
    const top = pool[0];
    recommendedOfficer = {
      id: top.id,
      name: top.name,
      email: top.email,
      availability: top.availability,
      activeCases: top.active_cases,
      overdueCases: top.overdue_cases,
      highPriorityCases: top.high_priority_cases,
      reason: `${top.name} currently has the lowest active workload (${top.active_cases} active cases) and status "${top.availability}".`
    };
  }

  return {
    category: normCategory,
    recommendedDepartment: department ? department.name : deptName,
    departmentId: department ? department.id : null,
    recommendedOfficer,
    candidateOfficers: officers.slice(0, 5).map(o => ({
      id: o.id,
      name: o.name,
      email: o.email,
      availability: o.availability,
      activeCases: o.active_cases,
      overdueCases: o.overdue_cases
    })),
    confidence: recommendedOfficer ? 0.91 : 0.70,
    routingExplanation: recommendedOfficer 
      ? `Routed to ${department?.name || deptName}. ${recommendedOfficer.reason}`
      : `Routed to ${department?.name || deptName} based on category mapping.`
  };
}

module.exports = {
  recommendRouting
};
