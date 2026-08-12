const { success, error } = require('../utils/response');
const adminUserService = require('../services/adminUserService');
const adminDeptService = require('../services/adminDepartmentService');
const adminAnalyticsService = require('../services/adminAnalyticsService');
const adminReportService = require('../services/adminReportService');
const assignmentService = require('../services/assignmentService');
const adminComplaintRepo = require('../repositories/adminComplaintRepository');
const auditLogger = require('../utils/auditLogger');

const handleServiceError = (res, err) => {
  const status = err.status || 500;
  return error(res, err.message || 'Server error', status);
};

// ---- Admin Dashboard / Analytics ----
async function dashboard(req, res) {
  try {
    const data = await adminAnalyticsService.adminDashboard();
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- User Management ----
async function listUsers(req, res) {
  try {
    const params = {
      q: req.query.q || null,
      role: req.query.role || null,
      status: req.query.status || null,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortDir: req.query.sortDir || 'desc'
    };
    const data = await adminUserService.listUsers(params);
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function getUser(req, res) {
  try {
    const data = await adminUserService.getById(parseInt(req.params.id, 10));
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function updateUser(req, res) {
  try {
    const actorUserId = req.user.userId;
    const data = await adminUserService.updateUser(parseInt(req.params.id, 10), req.body, actorUserId);
    return success(res, data, 'User updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function updateRole(req, res) {
  try {
    const actorUserId = req.user.userId;
    const data = await adminUserService.updateRole(parseInt(req.params.id, 10), req.body.role, actorUserId);
    await auditLogger.log(req, 'role_change', req.params.id, 'user', { newRole: req.body.role });
    return success(res, data, 'Role updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function updateStatus(req, res) {
  try {
    const actorUserId = req.user.userId;
    const data = await adminUserService.updateStatus(parseInt(req.params.id, 10), req.body.status, actorUserId);
    await auditLogger.log(req, req.body.status === 'suspended' || req.body.status === 'blocked' ? 'user_blocking' : 'status_change', req.params.id, 'user', { newStatus: req.body.status });
    return success(res, data, 'Status updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function approveOfficer(req, res) {
  try {
    const actorUserId = req.user.userId;
    const data = await adminUserService.approveOfficer(parseInt(req.params.id, 10), actorUserId);
    await auditLogger.log(req, 'officer_approval', req.params.id, 'user', { approved: true });
    return success(res, data, 'Officer approved');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- Department Management ----
async function listDepartments(req, res) {
  try {
    const params = {
      q: req.query.q || null,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 50
    };
    const data = await adminDeptService.listDepartments(params);
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function getDepartment(req, res) {
  try {
    const data = await adminDeptService.getById(parseInt(req.params.id, 10));
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function createDepartment(req, res) {
  try {
    const data = await adminDeptService.createDepartment(req.body);
    return success(res, data, 'Department created', 201);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function updateDepartment(req, res) {
  try {
    const data = await adminDeptService.updateDepartment(parseInt(req.params.id, 10), req.body);
    return success(res, data, 'Department updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function deleteDepartment(req, res) {
  try {
    await adminDeptService.deleteDepartment(parseInt(req.params.id, 10));
    return success(res, {}, 'Department deleted');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function listOfficers(req, res) {
  try {
    const data = await adminDeptService.listOfficers();
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- Assignment ----
async function assignComplaint(req, res) {
  try {
    const compliance = await assignmentService.assign(
      parseInt(req.body.complaintId, 10),
      parseInt(req.body.officerId, 10),
      req.user.userId
    );
    await auditLogger.log(req, 'complaint_assignment', req.body.complaintId, 'complaint', { officerId: req.body.officerId });
    return success(res, compliance, 'Assigned');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function unassignComplaint(req, res) {
  try {
    const result = await assignmentService.unassign(parseInt(req.params.complaintId, 10), req.user.userId);
    await auditLogger.log(req, 'complaint_unassignment', req.params.complaintId, 'complaint');
    return success(res, result, 'Unassigned');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- Admin Complaint Management ----
async function listComplaints(req, res) {
  try {
    const params = {
      search: req.query.search || req.query.q || null,
      status: req.query.status || null,
      priority: req.query.priority || null,
      category: req.query.category || null,
      departmentId: req.query.departmentId ? parseInt(req.query.departmentId, 10) : null,
      officerId: req.query.officerId ? parseInt(req.query.officerId, 10) : null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortDir: req.query.sortDir || 'desc'
    };
    const data = await adminComplaintRepo.listComplaints(params);
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function getComplaint(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await adminComplaintRepo.getComplaintById(id);
    if (!data) return error(res, 'Complaint not found', 404);
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function updateComplaint(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const allowed = ['status', 'priority', 'severity', 'department_id', 'officer_id'];
    const fields = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) fields[k] = req.body[k] || null;
    });
    // If assigning officer, record timestamp
    if (fields.officer_id) fields.assigned_at = new Date().toISOString();
    const data = await adminComplaintRepo.updateComplaintAdmin(id, fields);
    if (!data) return error(res, 'Complaint not found', 404);
    await auditLogger.log(req, 'complaint_update', id, 'complaint', fields);
    return success(res, data, 'Complaint updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- Reports ----
async function reportSummary(req, res) {
  try {
    const params = {
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      category: req.query.category || null,
      departmentId: req.query.departmentId || null,
      officerId: req.query.officerId || null,
      status: req.query.status || null,
      priority: req.query.priority || null
    };
    const data = await adminReportService.reportSummary(params);
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function reportComplaints(req, res) {
  try {
    const params = {
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      category: req.query.category || null,
      departmentId: req.query.departmentId || null,
      officerId: req.query.officerId || null,
      status: req.query.status || null,
      priority: req.query.priority || null,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortDir: req.query.sortDir || 'desc'
    };
    const data = await adminReportService.reportComplaints(params);
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function exportReport(req, res) {
  try {
    const params = {
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      category: req.query.category || null,
      departmentId: req.query.departmentId || null,
      officerId: req.query.officerId || null,
      status: req.query.status || null,
      priority: req.query.priority || null
    };
    const csv = await adminReportService.exportComplaints(params);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="complaints-report.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function listAuditLogs(req, res) {
  try {
    const action = req.query.action || null;
    const actorId = req.query.actorId ? parseInt(req.query.actorId, 10) : null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    const data = await require('../repositories/auditLogRepository').listLogs({
      action,
      actorId,
      limit,
      offset
    });
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function listSystemHealth(req, res) {
  try {
    const health = {
      database: 'unavailable',
      ai: 'unavailable',
      map: 'unavailable',
      cloudinary: 'unavailable',
      smtp: 'unavailable'
    };

    // 1. Database
    try {
      const db = require('../config/db');
      await db.query('SELECT 1');
      health.database = 'operational';
    } catch (e) {
      health.database = 'unavailable';
    }

    // 2. AI Service
    try {
      const { GEMINI, GROQ } = require('../config');
      if (GEMINI.API_KEY) {
        health.ai = 'operational';
      } else if (GROQ.API_KEY) {
        health.ai = 'degraded';
      } else {
        health.ai = 'not_configured';
      }
    } catch (e) {
      health.ai = 'unavailable';
    }

    // 3. Map Service (MapTiler)
    // VITE_* env vars are browser-only (Vite build-time injection) and are NEVER
    // available in Node.js. Check the server-side MAPTILER_API_KEY if configured.
    try {
      const key = process.env.MAPTILER_API_KEY || '';
      if (key) {
        // Key is present — mark as operational without making an HTTP call to avoid latency
        health.map = 'operational';
      } else {
        // Map tiles still work via the browser key; server doesn't need the key.
        health.map = 'not_configured_server_side';
      }
    } catch (e) {
      health.map = 'unavailable';
    }

    // 4. Cloudinary
    try {
      const cloudinary = require('../config/cloudinary');
      if (cloudinary) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Cloudinary timeout')), 3000);
          cloudinary.api.ping((err, result) => {
            clearTimeout(timer);
            if (err) reject(err);
            else resolve(result);
          });
        });
        health.cloudinary = 'operational';
      } else {
        health.cloudinary = 'not_configured';
      }
    } catch (e) {
      health.cloudinary = 'unavailable';
    }

    // 5. SMTP
    try {
      const nodemailer = require('nodemailer');
      const { EMAIL } = require('../config');
      if (EMAIL.SMTP_HOST && EMAIL.SMTP_USER) {
        const transporter = nodemailer.createTransport({
          host: EMAIL.SMTP_HOST,
          port: EMAIL.SMTP_PORT,
          secure: false,
          auth: { user: EMAIL.SMTP_USER, pass: EMAIL.SMTP_PASS }
        });
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('SMTP timeout')), 3000);
          transporter.verify((err, success) => {
            clearTimeout(timer);
            if (err) reject(err);
            else resolve(success);
          });
        });
        health.smtp = 'operational';
      } else {
        health.smtp = 'not_configured';
      }
    } catch (e) {
      health.smtp = 'unavailable';
    }

    return success(res, health);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function listEmailLogs(req, res) {
  try {
    const db = require('../config/db');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const eventType = req.query.eventType || null;
    const status = req.query.status || null;
    const recipient = req.query.recipient || null;

    const conditions = [];
    const vals = [];
    let idx = 1;
    if (eventType) { conditions.push(`event_type = $${idx++}`); vals.push(eventType); }
    if (status) { conditions.push(`status = $${idx++}`); vals.push(status); }
    if (recipient) { conditions.push(`recipient ILIKE $${idx++}`); vals.push(`%${recipient}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const qCount = `SELECT COUNT(*) FROM email_logs ${where}`;
    const countRes = await db.query(qCount, vals);
    const total = parseInt(countRes.rows[0].count, 10);

    const qList = `SELECT id, user_id, complaint_id, event_type, recipient, subject, status, provider_message_id, error_message, attempt_count, created_at, sent_at
                   FROM email_logs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    vals.push(limit, offset);
    const listRes = await db.query(qList, vals);

    return success(res, {
      items: listRes.rows,
      total,
      page,
      limit
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function getEmailStats(req, res) {
  try {
    const db = require('../config/db');
    const qStats = `
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) AS sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
        COUNT(CASE WHEN created_at >= now() - INTERVAL '24 hours' THEN 1 END) AS last_24h,
        COUNT(CASE WHEN created_at >= now() - INTERVAL '7 days' THEN 1 END) AS last_7d
      FROM email_logs
    `;
    const statsRes = await db.query(qStats);
    const stats = statsRes.rows[0];
    return success(res, {
      total: parseInt(stats.total, 10) || 0,
      sent: parseInt(stats.sent, 10) || 0,
      failed: parseInt(stats.failed, 10) || 0,
      pending: parseInt(stats.pending, 10) || 0,
      last24h: parseInt(stats.last_24h, 10) || 0,
      last7d: parseInt(stats.last_7d, 10) || 0
    });
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function retryEmail(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const emailService = require('../services/emailService');
    const ok = await emailService.retryEmailLog(id);
    if (!ok) {
      return error(res, 'Failed to retry email. Log may not exist or is already sent.', 400);
    }
    return success(res, {}, 'Email retried successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

module.exports = {
  dashboard,
  listComplaints,
  getComplaint,
  updateComplaint,
  listUsers,
  getUser,
  updateUser,
  updateRole,
  updateStatus,
  approveOfficer,
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listOfficers,
  assignComplaint,
  unassignComplaint,
  reportSummary,
  reportComplaints,
  exportReport,
  listAuditLogs,
  listSystemHealth,
  listEmailLogs,
  getEmailStats,
  retryEmail
};
