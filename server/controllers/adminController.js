const { success, error } = require('../utils/response');
const adminUserService = require('../services/adminUserService');
const adminDeptService = require('../services/adminDepartmentService');
const adminAnalyticsService = require('../services/adminAnalyticsService');
const adminReportService = require('../services/adminReportService');
const assignmentService = require('../services/assignmentService');
const adminComplaintRepo = require('../repositories/adminComplaintRepository');
const auditLogger = require('../utils/auditLogger');

const getUserId = (req) => (req.user ? (req.user.userId || req.user.id) : null);

const handleServiceError = (res, err) => {
  const status = err.status || 500;
  return error(res, err.message || 'Server error', status);
};

// ---- Admin Dashboard / Analytics ----
async function dashboard(req, res) {
  try {
    const options = {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };
    const data = await adminAnalyticsService.adminDashboard(options);
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
      departmentId: req.query.departmentId ? parseInt(req.query.departmentId, 10) : null,
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

async function getUserStats(req, res) {
  try {
    const data = await adminUserService.getUserStats();
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function createUser(req, res) {
  try {
    const actorUserId = getUserId(req);
    const data = await adminUserService.createUser(req.body, actorUserId);
    await auditLogger.log(req, 'USER_CREATED', data.id, 'user', { name: data.name, email: data.email, role: data.role });
    return success(res, data, 'User created successfully', 201);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function exportUsersCsv(req, res) {
  try {
    const params = {
      q: req.query.q || null,
      role: req.query.role || null,
      status: req.query.status || null,
      departmentId: req.query.departmentId ? parseInt(req.query.departmentId, 10) : null
    };
    const csv = await adminUserService.exportUsersCsv(params);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="user-directory-export.csv"');
    return res.status(200).send(csv);
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
    const actorUserId = getUserId(req);
    const data = await adminUserService.updateUser(parseInt(req.params.id, 10), req.body, actorUserId);
    return success(res, data, 'User updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function updateRole(req, res) {
  try {
    const actorUserId = getUserId(req);
    const { role, departmentId, designation, reason } = req.body;
    const data = await adminUserService.updateRole(parseInt(req.params.id, 10), role, actorUserId, departmentId, designation, reason);
    await auditLogger.log(req, 'ROLE_CHANGED', req.params.id, 'user', { newRole: role, departmentId, designation, reason });
    return success(res, data, 'Role updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function updateStatus(req, res) {
  try {
    const actorUserId = getUserId(req);
    const { status, reason } = req.body;
    const data = await adminUserService.updateStatus(parseInt(req.params.id, 10), status, actorUserId, reason);
    await auditLogger.log(req, status === 'suspended' || status === 'blocked' ? 'user_blocking' : 'status_change', req.params.id, 'user', { newStatus: status, reason });
    return success(res, data, 'Status updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function approveOfficer(req, res) {
  try {
    const actorUserId = getUserId(req);
    const data = await adminUserService.approveOfficer(parseInt(req.params.id, 10), actorUserId);
    await auditLogger.log(req, 'officer_approval', req.params.id, 'user', { approved: true });
    return success(res, data, 'Officer approved');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function getOfficerSummary(req, res) {
  try {
    const data = await adminUserService.getOfficerSummary();
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function getOfficerFullProfile(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new adminUserService.AdminError('Invalid officer ID', 400);
    const data = await adminUserService.getOfficerFullProfile(id);
    return success(res, data);
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

const resourceRequestService = require('../services/resourceRequestService');

async function listOfficers(req, res) {
  try {
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId, 10) : null;
    const data = await adminDeptService.listOfficers({ departmentId });
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- Assignment ----
async function assignComplaint(req, res) {
  try {
    const complaintId = parseInt(req.body.complaintId || req.body.id, 10);
    const departmentId = req.body.departmentId !== undefined ? (req.body.departmentId ? parseInt(req.body.departmentId, 10) : null) : null;
    const officerId = req.body.officerId !== undefined ? (req.body.officerId ? parseInt(req.body.officerId, 10) : null) : null;
    const priority = req.body.priority || null;

    const result = await assignmentService.assign({
      complaintId,
      departmentId,
      officerId,
      priority,
      assignedBy: getUserId(req)
    });

    await auditLogger.log(req, 'complaint_assignment', complaintId, 'complaint', { departmentId, officerId, priority });
    return success(res, result, 'Case assignment updated successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function unassignComplaint(req, res) {
  try {
    const result = await assignmentService.unassign(parseInt(req.params.complaintId, 10), getUserId(req));
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
      sortDir: req.query.sortDir || 'desc',
      assignment: req.query.assignment || null,
      dueSoon: req.query.dueSoon || null,
      overdue: req.query.overdue || null
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
    const hasAssignmentChanges = req.body.department_id !== undefined || req.body.officer_id !== undefined || req.body.departmentId !== undefined || req.body.officerId !== undefined;

    if (hasAssignmentChanges) {
      const departmentId = req.body.department_id !== undefined ? req.body.department_id : req.body.departmentId;
      const officerId = req.body.officer_id !== undefined ? req.body.officer_id : req.body.officerId;
      const priority = req.body.priority || null;

      await assignmentService.assign({
        complaintId: id,
        departmentId: departmentId ? parseInt(departmentId, 10) : null,
        officerId: officerId ? parseInt(officerId, 10) : null,
        priority: priority || null,
        assignedBy: getUserId(req)
      });
    }

    const allowed = ['priority', 'severity'];
    const fields = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) fields[k] = req.body[k] || null;
    });

    if (Object.keys(fields).length > 0) {
      await adminComplaintRepo.updateComplaintAdmin(id, fields);
    }

    // Process explicit status override if requested and not stale 'open'/'assigned' default
    const requestedStatus = req.body.status;
    if (requestedStatus && requestedStatus !== 'assigned') {
      const comp = await adminComplaintRepo.getComplaintById(id);
      const isStaleOpenAfterAssign = hasAssignmentChanges && requestedStatus === 'open' && comp && comp.status === 'assigned';
      if (!isStaleOpenAfterAssign && comp && comp.status !== requestedStatus) {
        const timelineService = require('../services/timelineService');
        await timelineService.changeStatus(id, requestedStatus, getUserId(req), req.body.note || 'Status updated by administrator');
      }
    }

    const data = await adminComplaintRepo.getComplaintById(id);
    if (!data) return error(res, 'Complaint not found', 404);
    await auditLogger.log(req, 'complaint_update', id, 'complaint', { ...fields, status: data.status, officer_id: data.officer_id, department_id: data.department_id });
    return success(res, data, 'Complaint updated');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- Resource Requests (Admin) ----
async function listResourceRequests(req, res) {
  try {
    const params = {
      complaintId: req.query.complaintId ? parseInt(req.query.complaintId, 10) : null,
      officerId: req.query.officerId ? parseInt(req.query.officerId, 10) : null,
      departmentId: req.query.departmentId ? parseInt(req.query.departmentId, 10) : null,
      status: req.query.status || null,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    };
    const data = await resourceRequestService.listRequests(params);
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function approveResourceRequest(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { teamName, leaderId, memberNames, notes } = req.body;
    const data = await resourceRequestService.approveRequest(requestId, getUserId(req), {
      teamName,
      leaderId: leaderId ? parseInt(leaderId, 10) : null,
      memberNames: memberNames || [],
      notes
    });
    await auditLogger.log(req, 'resource_request_approved', requestId, 'resource_request', { teamName });
    return success(res, data, 'Resource request approved and team dispatched successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function rejectResourceRequest(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const data = await resourceRequestService.rejectRequest(requestId, getUserId(req), { reason });
    await auditLogger.log(req, 'resource_request_rejected', requestId, 'resource_request', { reason });
    return success(res, data, 'Resource request declined');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

// ---- Administrative Resolution Verification ----
async function verifyComplaintResolution(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { action, note, reason } = req.body; // action: 'verify' | 'reopen' | 'rework'
    const timelineService = require('../services/timelineService');
    const pointService = require('../services/pointService');

    const complaint = await adminComplaintRepo.getComplaintById(complaintId);
    if (!complaint) return error(res, 'Complaint not found', 404);

    if (action === 'verify' || action === 'close') {
      const updated = await timelineService.changeStatus(complaintId, 'closed', getUserId(req), note || 'Resolution verified and closed by municipal administrator.');

      // Award officer verification bonus points
      if (complaint.officer_id) {
        try {
          await pointService.awardPoints({
            userId: complaint.officer_id,
            role: 'officer',
            complaintId,
            eventType: 'OFFICER_VERIFIED_RESOLUTION',
            reason: 'Administrative resolution quality verification passed'
          });
        } catch(e) {}
      }

      await auditLogger.log(req, 'resolution_verified_admin', complaintId, 'complaint', { action: 'closed' });
      return success(res, updated, 'Complaint resolution verified and case marked closed');
    } else {
      // Reopen / request more work
      const reopenReason = (reason || note || 'Administrator requested additional resolution field work').trim();
      const updated = await timelineService.changeStatus(complaintId, 'reopened', getUserId(req), `Admin requested rework: ${reopenReason}`);
      await auditLogger.log(req, 'resolution_reopened_admin', complaintId, 'complaint', { reason: reopenReason });
      return success(res, updated, 'Complaint reopened and returned to officer for additional work');
    }
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
    const search = req.query.search || null;
    const role = req.query.role || null;
    const action = req.query.action || null;
    const datePreset = req.query.datePreset || null;
    const dateFrom = req.query.dateFrom || null;
    const dateTo = req.query.dateTo || null;
    const actorId = req.query.actorId ? parseInt(req.query.actorId, 10) : null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const data = await require('../repositories/auditLogRepository').listLogs({
      search,
      role,
      action,
      datePreset,
      dateFrom,
      dateTo,
      actorId,
      limit,
      offset
    });
    return success(res, data);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function exportAuditLogs(req, res) {
  try {
    const search = req.query.search || null;
    const role = req.query.role || null;
    const action = req.query.action || null;
    const datePreset = req.query.datePreset || null;
    const dateFrom = req.query.dateFrom || null;
    const dateTo = req.query.dateTo || null;

    const csv = await require('../repositories/auditLogRepository').exportLogsCsv({
      search,
      role,
      action,
      datePreset,
      dateFrom,
      dateTo
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-activity-log.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function listSystemHealth(req, res) {
  try {
    const health = {
      database: 'unavailable',
      postgis: 'unavailable',
      ai: 'unavailable',
      map: 'unavailable',
      cloudinary: 'unavailable',
      email: 'unavailable',
      smtp: 'unavailable',
      scheduler: 'unavailable',
      realtime: 'unavailable'
    };

    const checkDb = async () => {
      try {
        const db = require('../config/db');
        await db.query('SELECT 1');
        health.database = 'operational';
      } catch (e) {
        health.database = 'unavailable';
      }
    };

    const checkPostgis = async () => {
      try {
        const db = require('../config/db');
        const r = await db.query('SELECT PostGIS_Version()');
        if (r && r.rows && r.rows.length) {
          health.postgis = 'operational';
        }
      } catch (e) {
        health.postgis = 'unavailable';
      }
    };

    const checkAi = async () => {
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
    };

    const checkMap = async () => {
      try {
        const key = process.env.MAPTILER_API_KEY || '';
        if (key) {
          health.map = 'operational';
        } else {
          health.map = 'not_configured_server_side';
        }
      } catch (e) {
        health.map = 'unavailable';
      }
    };

    const checkCloudinary = async () => {
      try {
        const cloudinary = require('../config/cloudinary');
        if (cloudinary) {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Cloudinary timeout')), 1500);
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
    };

    const checkEmail = async () => {
      try {
        const emailService = require('../services/emailService');
        const status = await emailService.verifyEmail();
        health.email = status.status || 'operational';
        health.smtp = status.status || 'operational'; // Backward-compatible indicator
      } catch (e) {
        health.email = 'unavailable';
        health.smtp = 'unavailable';
      }
    };

    const checkScheduler = async () => {
      try {
        const worker = require('../services/analytics/scheduledReportWorker');
        const schedHealth = await worker.getSchedulerHealth();
        health.scheduler = {
          status: schedHealth.status,
          workerId: schedHealth.workerId,
          lastTickAt: schedHealth.lastTickAt,
          activeSchedules: schedHealth.activeSchedules,
          dueSchedules: schedHealth.dueSchedules,
          currentlyRunning: schedHealth.currentlyRunning,
          stats: schedHealth.stats
        };
      } catch (e) {
        health.scheduler = 'unavailable';
      }
    };

    const checkRealtime = async () => {
      try {
        const realtimeGateway = require('../services/realtimeGateway');
        const metrics = realtimeGateway.getMetrics();
        health.realtime = {
          status: 'operational',
          ...metrics
        };
      } catch (e) {
        health.realtime = 'unavailable';
      }
    };

    await Promise.allSettled([
      checkDb(),
      checkPostgis(),
      checkAi(),
      checkMap(),
      checkCloudinary(),
      checkEmail(),
      checkScheduler(),
      checkRealtime()
    ]);

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
    return success(res, {}, 'Email retry scheduled');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function verifyDocument(req, res) {
  try {
    const officerId = parseInt(req.params.id, 10);
    const docType = req.params.docType; // 'IDENTITY', 'ADDRESS', 'QUALIFICATION'
    const actorUserId = getUserId(req);

    const db = require('../config/db');
    const { rows } = await db.query(
      'SELECT id, type, status FROM officer_documents WHERE user_id = $1 AND type = $2',
      [officerId, docType]
    );

    if (rows.length === 0) {
      return error(res, 'Document not found', 404);
    }

    const doc = rows[0];
    await db.query(
      "UPDATE officer_documents SET status = 'VERIFIED', verified_at = now(), verified_by = $1, rejection_reason = NULL WHERE id = $2",
      [actorUserId, doc.id]
    );

    // Audit Log
    const auditLogger = require('../utils/auditLogger');
    await auditLogger.log(req, 'OFFICER_DOCUMENT_VERIFIED', officerId, 'user', {
      type: docType,
      verifiedBy: actorUserId
    });

    // Create Notification
    try {
      const notificationService = require('../services/notificationService');
      const docLabel = docType === 'IDENTITY' ? 'Government Identity' : docType === 'ADDRESS' ? 'Address Verification' : 'Qualification & Service';
      await notificationService.create(officerId, 'OFFICER', {
        title: 'Document Verified',
        message: `Your ${docLabel} Document has been verified by the administrator.`,
        subtitle: `Document Type: ${docType}`,
        actionUrl: '/officer/onboarding'
      });
    } catch (e) {
      const logger = require('../utils/logger');
      logger.warn('Failed to create verification notification', { err: e.message });
    }

    return success(res, { officerId, docType, status: 'VERIFIED' }, 'Document verified successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function rejectDocument(req, res) {
  try {
    const officerId = parseInt(req.params.id, 10);
    const docType = req.params.docType;
    const { reason } = req.body;
    const actorUserId = getUserId(req);

    if (!reason || !reason.trim()) {
      return error(res, 'Rejection reason is required', 400);
    }

    const db = require('../config/db');
    const { rows } = await db.query(
      'SELECT id, type, status FROM officer_documents WHERE user_id = $1 AND type = $2',
      [officerId, docType]
    );

    if (rows.length === 0) {
      return error(res, 'Document not found', 404);
    }

    const doc = rows[0];
    await db.query(
      "UPDATE officer_documents SET status = 'REJECTED', rejection_reason = $1, verified_at = now(), verified_by = $2 WHERE id = $3",
      [reason.trim(), actorUserId, doc.id]
    );

    // Audit Log
    const auditLogger = require('../utils/auditLogger');
    await auditLogger.log(req, 'OFFICER_DOCUMENT_REJECTED', officerId, 'user', {
      type: docType,
      reason: reason.trim(),
      rejectedBy: actorUserId
    });

    // Create Notification
    try {
      const notificationService = require('../services/notificationService');
      const docLabel = docType === 'IDENTITY' ? 'Government Identity' : docType === 'ADDRESS' ? 'Address Verification' : 'Qualification & Service';
      await notificationService.create(officerId, 'OFFICER', {
        title: 'Document Rejected',
        message: `Your ${docLabel} Document was rejected. Please upload a new document.`,
        subtitle: `Reason: ${reason.trim()}`,
        actionUrl: '/officer/onboarding'
      });
    } catch (e) {
      const logger = require('../utils/logger');
      logger.warn('Failed to create rejection notification', { err: e.message });
    }

    return success(res, { officerId, docType, status: 'REJECTED' }, 'Document rejected successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function testEmail(req, res) {
  try {
    const rawTo = req.body.to || req.user?.email || 'admin@civicgreennet.dev';
    if (typeof rawTo !== 'string' || !rawTo.includes('@')) {
      return error(res, 'Valid recipient email address is required', 400);
    }
    const to = rawTo.trim().toLowerCase();

    const emailService = require('../services/emailService');
    const result = await emailService.sendEmail({
      to,
      subject: 'Civic GreenNet — Administration System Test Email',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; color: #1e293b;">
        <h2 style="color: #059669; margin-top: 0;">Civic GreenNet Email System Verification</h2>
        <p>This is a verified test email sent from the Civic GreenNet Administration portal via the official Resend API.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 4px 0; font-size: 13px;"><strong>Provider:</strong> Resend API</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Domain:</strong> civicgreennet.dev</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Sender:</strong> Civic GreenNet &lt;notifications@civicgreennet.dev&gt;</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="font-size: 12px; color: #64748b;">If you received this message, the Civic GreenNet email integration is functioning properly.</p>
      </div>`,
      text: `Civic GreenNet Email System Test. Sent at ${new Date().toISOString()} via Resend from notifications@civicgreennet.dev.`,
      eventType: 'SYSTEM_TEST'
    });

    if (!result.success && !result.testMode) {
      return error(res, result.error || 'Failed to send test email', 500);
    }

    return success(res, {
      success: true,
      provider: 'resend',
      domain: 'civicgreennet.dev',
      messageId: result.messageId || 'resend-test-msg-id',
      recipient: to
    }, 'Test email sent successfully');
  } catch (err) {
    return handleServiceError(res, err);
  }
}

async function testOtpEmail(req, res) {
  try {
    const rawTo = req.body.to || req.user?.email || 'admin@civicgreennet.dev';
    if (typeof rawTo !== 'string' || !rawTo.includes('@')) {
      return error(res, 'Valid recipient email address is required', 400);
    }
    const to = rawTo.trim().toLowerCase();

    const otpService = require('../services/otpService');
    const emailService = require('../services/emailService');
    const dummyOtp = otpService.generateOtpCode();

    const result = await emailService.sendOtpVerificationEmail(to, dummyOtp, 'admin_diagnostic_test');

    if (!result.success && !result.testMode) {
      return error(res, result.error || 'Failed to dispatch diagnostic OTP email via Resend', 500);
    }

    const maskedId = result.messageId && result.messageId.length > 8
      ? `${result.messageId.slice(0, 8)}...`
      : result.messageId || 'mock-id';

    return success(res, {
      success: true,
      provider: 'resend',
      domain: 'civicgreennet.dev',
      messageId: maskedId,
      recipient: otpService.maskEmail(to)
    }, 'Diagnostic OTP email dispatched successfully via Resend');
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
  getUserStats,
  createUser,
  exportUsersCsv,
  getUser,
  updateUser,
  updateRole,
  updateStatus,
  approveOfficer,
  getOfficerSummary,
  getOfficerFullProfile,
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
  exportAuditLogs,
  listSystemHealth,
  listEmailLogs,
  getEmailStats,
  retryEmail,
  verifyDocument,
  rejectDocument,
  testEmail,
  testOtpEmail,
  listResourceRequests,
  approveResourceRequest,
  rejectResourceRequest,
  verifyComplaintResolution
};
