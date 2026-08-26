const { success, error } = require('../utils/response');
const complaintRepo = require('../repositories/complaintRepository');
const complaintService = require('../services/complaintService');
const adminUserRepo = require('../repositories/adminUserRepository');
const adminDeptRepo = require('../repositories/adminDepartmentRepository');
const assignmentRepo = require('../repositories/assignmentRepository');
const db = require('../config/db');
const { VALID_DESIGNATIONS } = require('./publicController');

async function handleError(res, err) {
  console.error('API Error in officerController:', err);
  return error(res, err.message || 'Server error', err.status || 500);
}

const getUserId = (req) => (req.user ? (req.user.userId || req.user.id) : null);

// Unified KPIs and Operational Center data
async function dashboard(req, res) {
  try {
    const officerId = getUserId(req);

    // 1. Officer profile info
    const officerRes = await db.query(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.status, u.availability,
      u.department_id, u.municipality_id, u.zone_id, u.ward_id, u.jurisdiction, u.designation, u.employee_id, u.settings, u.created_at,
      d.name AS department_name, m.name AS municipality_name, z.name AS zone_name, w.name AS ward_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN municipalities m ON m.id = u.municipality_id
      LEFT JOIN zones z ON z.id = u.zone_id
      LEFT JOIN wards w ON w.id = u.ward_id
      WHERE u.id = $1
    `, [officerId]);

    if (!officerRes.rows.length) {
      return error(res, 'Officer profile not found', 404);
    }
    const u = officerRes.rows[0];
    const settings = typeof u.settings === 'string' ? JSON.parse(u.settings) : (u.settings || {});

    const profile = {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar_url: u.avatar_url,
      role: u.role,
      status: u.status,
      availability: u.availability || 'AVAILABLE',
      employee_id: u.employee_id || settings.employee_id || null,
      designation: u.designation || settings.designation || 'Municipal Officer',
      department: u.department_name ? { id: u.department_id, name: u.department_name } : null,
      municipality: u.municipality_name ? { id: u.municipality_id, name: u.municipality_name } : null,
      zone: u.zone_name ? { id: u.zone_id, name: u.zone_name } : null,
      ward: u.ward_name ? { id: u.ward_id, name: u.ward_name } : null,
      jurisdiction: u.jurisdiction || settings.jurisdiction || null,
      created_at: u.created_at,
      settings
    };

    // 2. Metrics row
    const metricsRes = await db.query(`
      SELECT
        COUNT(*)::int AS total_assigned,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END)::int AS assigned,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END)::int AS accepted,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END)::int AS closed,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed', 'rejected') AND sla_due_at < now() THEN 1 END)::int AS overdue,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed', 'rejected') AND priority IN ('high', 'critical') THEN 1 END)::int AS high_priority,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed', 'rejected') AND sla_due_at >= now() AND sla_due_at <= now() + INTERVAL '24 hours' THEN 1 END)::int AS due_soon
      FROM complaints
      WHERE officer_id = $1
    `, [officerId]);

    const m = metricsRes.rows[0];

    // Use department/jurisdiction stats for the unassigned/open queue
    const statsObj = await complaintRepo.getOfficerDashboardStats(officerId);
    
    const metrics = {
      totalAssigned: m.total_assigned,
      openQueue: statsObj.unassigned || 0,
      assigned: m.assigned,
      accepted: m.accepted,
      inProgress: m.in_progress,
      resolved: m.resolved,
      closed: m.closed,
      overdue: m.overdue,
      highPriority: m.high_priority,
      dueSoon: m.due_soon
    };

    // 3. SLA summary
    const totalResolved = m.resolved + m.closed;
    const slaRes = await db.query(`
      SELECT COUNT(CASE WHEN status IN ('resolved', 'closed') AND (resolution_at <= sla_due_at OR sla_due_at IS NULL) THEN 1 END)::int AS on_time
      FROM complaints
      WHERE officer_id = $1
    `, [officerId]);

    const onTimeCount = slaRes.rows[0]?.on_time || 0;
    const complianceRate = totalResolved > 0 ? Math.round((onTimeCount / totalResolved) * 100) : 100;

    const sla = {
      complianceRate,
      totalResolved,
      onTime: onTimeCount,
      dueSoon: m.due_soon,
      overdue: m.overdue,
      critical: m.critical || 0
    };

    // 4. Active assignments list
    const activeRes = await db.query(`
      SELECT c.*,
      COALESCE(
        (SELECT json_agg(json_build_object('url', ci.url, 'public_id', ci.public_id)) FROM complaint_images ci WHERE ci.complaint_id = c.id),
        '[]'::json
      ) AS images
      FROM complaints c
      WHERE c.officer_id = $1 AND c.status NOT IN ('resolved', 'closed')
      ORDER BY c.created_at DESC
    `, [officerId]);

    const assignments = activeRes.rows;

    // 5. Nearby Issues
    const offLat = parseFloat(settings.latitude || settings.lat);
    const offLng = parseFloat(settings.longitude || settings.lng);
    const offRadius = parseFloat(settings.radius || settings.radius_km * 1000) || 10000;
    let nearbyIssues = [];
    if (!isNaN(offLat) && !isNaN(offLng)) {
      nearbyIssues = await complaintRepo.nearbyComplaints(offLat, offLng, offRadius, { limit: 10 });
    } else {
      const fallbackRes = await db.query(`
        SELECT c.*,
        COALESCE(
          (SELECT json_agg(json_build_object('url', ci.url, 'public_id', ci.public_id)) FROM complaint_images ci WHERE ci.complaint_id = c.id),
          '[]'::json
        ) AS images
        FROM complaints c
        WHERE c.officer_id IS NULL AND c.status = 'open' AND (c.department_id = $1 OR c.address ILIKE $2)
        ORDER BY c.created_at DESC LIMIT 10
      `, [u.department_id, `%${u.municipality_name || ''}%`]);
      nearbyIssues = fallbackRes.rows;
    }

    // 6. Recent Activity (audit logs)
    const activityRes = await db.query(`
      SELECT * FROM audit_logs
      WHERE actor_id = $1
      ORDER BY created_at DESC LIMIT 10
    `, [officerId]);
    const recentActivity = activityRes.rows;

    // 7. Unread Notifications
    const notificationsRes = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = $1 AND is_read = false
      ORDER BY created_at DESC LIMIT 10
    `, [officerId]);
    const notifications = notificationsRes.rows;

    // 8. Performance counts
    const perfRes = await db.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (resolution_at - assigned_at))) / 86400.0 AS avg_resolution_time
      FROM complaints
      WHERE officer_id = $1 AND status IN ('resolved', 'closed') AND assigned_at IS NOT NULL AND resolution_at IS NOT NULL
    `, [officerId]);
    const avgResolutionTime = parseFloat(perfRes.rows[0]?.avg_resolution_time || 0).toFixed(1);

    const performance = {
      assignedCount: m.total_assigned,
      resolvedCount: totalResolved,
      resolutionRate: m.total_assigned > 0 ? Math.round((totalResolved / m.total_assigned) * 100) : 100,
      averageResolutionTime: parseFloat(avgResolutionTime),
      slaCompliance: complianceRate,
      overdueCount: m.overdue,
      highPriorityResolved: m.high_priority
    };

    return success(res, {
      officer: profile,
      metrics,
      sla,
      assignments,
      nearbyIssues,
      recentActivity,
      notifications,
      performance
    });
  } catch (err) {
    return handleError(res, err);
  }
}

// Officer workload counts (existing compatibility endpoint)
async function workload(req, res) {
  try {
    const officerId = getUserId(req);
    const stats = await complaintRepo.getOfficerDashboardStats(officerId);
    return success(res, stats);
  } catch (err) {
    return handleError(res, err);
  }
}

// Assigned complaints queue (existing functionality with enrichments)
async function assignedComplaints(req, res) {
  try {
    const officerId = getUserId(req);
    const status = req.query.status || null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const q = req.query.q || null;

    const items = await complaintRepo.searchComplaints({
      officerId,
      status: status && status !== 'all' ? status : null,
      page,
      limit,
      q
    });

    const countConditions = ['c.officer_id = $1'];
    const countVals = [officerId];
    let countIdx = 2;
    if (status && status !== 'all') {
      countConditions.push(`c.status = $${countIdx++}`);
      countVals.push(status.toLowerCase().replace('-', '_'));
    }
    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM complaints c WHERE ${countConditions.join(' AND ')}`,
      countVals
    );
    const total = countRes.rows[0]?.total || items.length;

    await complaintService.enrichComplaintsWithImages(items);
    return success(res, { items, page, limit, total });
  } catch (err) {
    return handleError(res, err);
  }
}

// Department stats (existing compatibility endpoint)
async function departmentStats(req, res) {
  try {
    const myUser = await adminUserRepo.getById(req.user.userId);
    const deptId = myUser && myUser.department_id;
    if (!deptId) {
      return success(res, { department: null, stats: {} });
    }
    const dept = await adminDeptRepo.getById(deptId);
    const stats = {
      total: dept.complaint_count || 0,
      pending: dept.pending_count || 0,
      resolved: dept.resolved_count || 0,
      resolutionRate: dept.complaint_count ? Math.round((dept.resolved_count / dept.complaint_count) * 10000) / 100 : 0
    };
    return success(res, { department: { id: dept.id, name: dept.name }, stats });
  } catch (err) {
    return handleError(res, err);
  }
}

// Geospatial nearby complaints query
async function nearby(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 5000; // default 5km
    if (isNaN(lat) || isNaN(lng)) {
      return error(res, 'Latitude and Longitude are required', 400);
    }
    const filters = {
      status: req.query.status || null,
      priority: req.query.priority || null,
      category: req.query.category || null
    };
    const list = await complaintRepo.nearbyComplaints(lat, lng, radius, { limit: 100, filters });
    return success(res, { items: list });
  } catch (err) {
    return handleError(res, err);
  }
}

// Officer profile detailed info
async function profile(req, res) {
  try {
    const officer = await adminUserRepo.getById(req.user.userId);
    if (!officer) return error(res, 'Officer not found', 404);
    const dept = officer.department_id ? await adminDeptRepo.getById(officer.department_id) : null;
    return success(res, {
      id: officer.id,
      name: officer.name,
      email: officer.email,
      role: officer.role,
      status: officer.status,
      created_at: officer.created_at,
      department: dept ? { id: dept.id, name: dept.name } : null,
      settings: officer.settings || {}
    });
  } catch (err) {
    return handleError(res, err);
  }
}

// Transition status open -> in_progress
async function acceptComplaint(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const officerId = req.user.userId;
    const c = await complaintRepo.getById(complaintId);
    if (!c) return error(res, 'Complaint not found', 404);
    if (c.officer_id !== officerId) return error(res, 'Forbidden: This complaint is not assigned to you', 403);

    // Accept transitions status from 'assigned' (or fallback open/pending/reopened) to 'accepted'
    if (c.status !== 'assigned' && c.status !== 'open' && c.status !== 'pending' && c.status !== 'reopened') {
      return error(res, `Cannot accept complaint in status ${c.status}`, 400);
    }

    const updated = await complaintRepo.updateComplaint(complaintId, { status: 'accepted' });
    await complaintRepo.addStatusHistory(complaintId, c.status, 'accepted', officerId, 'Officer accepted complaint assignment.');

    // Also update assignment status in complaint_assignments
    await db.query("UPDATE complaint_assignments SET status = 'ACCEPTED' WHERE complaint_id = $1 AND officer_id = $2", [complaintId, officerId]);

    // Audit Log
    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, 'ASSIGNMENT_ACCEPTED', complaintId, 'complaint', { from: c.status, to: 'accepted' });
    } catch (e) {}

    // Notify Citizen
    try {
      await db.query('INSERT INTO notifications(user_id, type, payload, is_read, created_at) VALUES($1,$2,$3,false,now())', [
        c.user_id,
        'COMPLAINT_ACCEPTED',
        JSON.stringify({ complaintId, title: c.title, message: `Officer has accepted assignment for your complaint.` })
      ]);
    } catch (e) {}

    // Award Officer Points for acceptance
    try {
      const pointService = require('../services/pointService');
      await pointService.awardPoints({
        userId: officerId,
        role: 'officer',
        complaintId,
        eventType: 'OFFICER_ACCEPTED',
        reason: 'Accepted case assignment'
      });
    } catch (e) {}

    return success(res, updated, 'Complaint assignment accepted');
  } catch (err) {
    return handleError(res, err);
  }
}

// Transition status validation
async function updateStatus(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const officerId = req.user.userId;
    const { status, note } = req.body;
    const c = await complaintRepo.getById(complaintId);
    if (!c) return error(res, 'Complaint not found', 404);

    const officer = await adminUserRepo.getById(officerId);
    const isOwner = c.officer_id === officerId;
    const isDeptMatch = officer && officer.department_id && c.department_id === officer.department_id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isDeptMatch && !isAdmin) {
      return error(res, 'Forbidden: You are not authorized to update this complaint status', 403);
    }

    const timelineService = require('../services/timelineService');
    const updated = await timelineService.changeStatus(complaintId, status, officerId, note);

    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, 'complaint_status_change', complaintId, 'complaint', { from: c.status, to: status, note });
    } catch (e) {}

    return success(res, updated, 'Status updated successfully');
  } catch (err) {
    return handleError(res, err);
  }
}

const resourceRequestService = require('../services/resourceRequestService');

// Mark complaint resolved
async function resolveComplaint(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const officerId = req.user.userId;
    const { resolutionNote } = req.body;
    const c = await complaintRepo.getById(complaintId);
    if (!c) return error(res, 'Complaint not found', 404);

    const officer = await adminUserRepo.getById(officerId);
    const isOwner = c.officer_id === officerId;
    const isDeptMatch = officer && officer.department_id && c.department_id === officer.department_id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isDeptMatch && !isAdmin) {
      return error(res, 'Forbidden: You are not authorized to resolve this complaint', 403);
    }

    if (!resolutionNote || !resolutionNote.trim()) {
      return error(res, 'A clear resolution summary note is required to mark the complaint resolved.', 400);
    }

    const timelineService = require('../services/timelineService');
    const updated = await timelineService.changeStatus(complaintId, 'resolved', officerId, resolutionNote.trim());

    // Save resolution note on complaint table
    await db.query('UPDATE complaints SET resolution_note = $1 WHERE id = $2', [resolutionNote.trim(), complaintId]);

    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, 'complaint_resolution', complaintId, 'complaint', { note: resolutionNote.trim() });
    } catch (e) {}

    return success(res, updated, 'Complaint marked as resolved');
  } catch (err) {
    return handleError(res, err);
  }
}

// POST /api/officer/complaints/:id/resource-requests
async function createResourceRequest(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const officerId = req.user.userId;
    const { requestType, requiredPeople, requiredSkills, equipment, priority, reason } = req.body;

    const data = await resourceRequestService.createRequest({
      complaintId,
      officerId,
      requestType,
      requiredPeople,
      requiredSkills,
      equipment,
      priority,
      reason
    });

    return success(res, data, 'Resource request submitted for administrative review', 201);
  } catch (err) {
    return handleError(res, err);
  }
}

// GET /api/officer/complaints/:id/resource-requests
async function getResourceRequests(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const data = await resourceRequestService.listRequests({ complaintId });
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

// GET /api/officer/complaints/:id/team
async function getComplaintTeam(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const data = await resourceRequestService.getTeamForComplaint(complaintId);
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

// Add operational notes
async function addNote(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const officerId = req.user.userId;
    const { note, isInternal } = req.body;
    if (!note || !note.trim()) return error(res, 'Note content is required', 400);

    const c = await complaintRepo.getById(complaintId);
    if (!c) return error(res, 'Complaint not found', 404);
    if (c.officer_id !== officerId && req.user.role !== 'admin') {
      return error(res, 'Forbidden: You do not own this complaint assignment', 403);
    }

    const q = `INSERT INTO complaint_notes(complaint_id, user_id, note, is_internal, created_at)
      VALUES($1, $2, $3, $4, now()) RETURNING *`;
    const r = await db.query(q, [complaintId, officerId, note.trim(), isInternal === undefined ? true : isInternal === true || isInternal === 'true']);

    // Award evidence / work documentation points to officer
    try {
      const pointService = require('../services/pointService');
      await pointService.awardPoints({
        userId: officerId,
        role: 'officer',
        complaintId,
        eventType: 'OFFICER_EVIDENCE_SUBMITTED',
        reason: 'Operational notes & investigation evidence logged'
      });
    } catch (ptErr) {}

    return success(res, r.rows[0], 'Note added');
  } catch (err) {
    return handleError(res, err);
  }
}

// Get complaint notes
async function getNotes(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const c = await complaintRepo.getById(complaintId);
    if (!c) return error(res, 'Complaint not found', 404);

    let filterInternal = true;
    if (req.user.role === 'citizen') {
      filterInternal = false;
    }

    const q = `SELECT n.id, n.note, n.is_internal, n.created_at, u.name AS author_name, u.role AS author_role
      FROM complaint_notes n
      JOIN users u ON u.id = n.user_id
      WHERE n.complaint_id = $1
      ${filterInternal ? '' : 'AND n.is_internal = false'}
      ORDER BY n.created_at DESC`;
    const r = await db.query(q, [complaintId]);
    return success(res, r.rows);
  } catch (err) {
    return handleError(res, err);
  }
}

// Context-aware Groq AI assistant chat completions
async function aiChat(req, res) {
  try {
    const userId = req.user.userId;
    const aiService = require('../services/ai/aiService');
    const userMessages = req.body.messages || [];
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || 'Show my assigned complaints';

    const result = await aiService.processUserMessage({
      userId,
      role: 'officer',
      message: lastUserMsg
    });

    return success(res, { message: { role: 'assistant', content: result.assistantMessage.content } });
  } catch (err) {
    return handleError(res, err);
  }
}

async function submitOnboarding(req, res) {
  try {
    const userId = req.user.userId;
    const {
      name, phone, address, city, state, postalCode,
      employeeId, designation, qualification, experience, joiningDate,
      departmentId, documents
    } = req.body;

    const user = await adminUserRepo.getById(userId);
    if (!user) return error(res, 'User not found', 404);

    if (designation && !VALID_DESIGNATIONS.includes(designation)) {
      return error(res, 'Invalid designation selected', 400);
    }

    // Verify all 3 required documents are uploaded
    const docsCheck = await db.query(
      "SELECT COUNT(*) as count FROM officer_documents WHERE user_id = $1 AND status IN ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED')",
      [userId]
    );
    if (parseInt(docsCheck.rows[0].count, 10) < 3) {
      return error(res, 'Please upload all 3 required verification documents before submitting.', 400);
    }

    // Update document status from UPLOADED to UNDER_REVIEW
    await db.query(
      "UPDATE officer_documents SET status = 'UNDER_REVIEW' WHERE user_id = $1 AND status = 'UPLOADED'",
      [userId]
    );

    const currentSettings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
    const empId = employeeId || user.employee_id || currentSettings.employee_id || `CGN-DEL-GEN-${String(userId).padStart(5, '0')}`;

    const updatedSettings = {
      ...currentSettings,
      onboarding_status: 'COMPLETED',
      phone,
      address,
      city,
      state,
      postal_code: postalCode,
      qualification,
      experience,
      joining_date: joiningDate,
      documents: documents || currentSettings.documents || {},
      employee_id: empId
    };

    const updates = ['settings = $1', 'status = \'pending\''];
    const vals = [JSON.stringify(updatedSettings)];
    let idx = 2;

    if (name) { updates.push(`name = $${idx++}`); vals.push(name); }
    if (departmentId) { updates.push(`department_id = $${idx++}`); vals.push(parseInt(departmentId, 10)); }
    if (designation) { updates.push(`designation = $${idx++}`); vals.push(designation); }
    if (empId) { updates.push(`employee_id = $${idx++}`); vals.push(empId); }

    vals.push(userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, vals);

    const auditLogger = require('../utils/auditLogger');
    await auditLogger.log(req, 'OFFICER_PROFILE_SUBMITTED', userId, 'user', {
      departmentId, designation, employeeId: empId
    });

    try {
      const notificationService = require('../services/notificationService');
      const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
      for (const admin of admins) {
        await notificationService.create(admin.id, 'OFFICER', {
          title: 'Officer Profile Submitted for Review',
          message: `Officer ${name || user.name} has submitted their officer profile.`,
          subtitle: `Officer ID: ${empId}`,
          actionUrl: '/admin?tab=officer-approvals',
          officerId: userId
        });
      }
    } catch (e) {
      const logger = require('../utils/logger');
      logger.warn('Failed sending admin submission notification', { err: e.message });
    }

    return success(res, { userId, onboarding_status: 'COMPLETED', status: 'pending' }, 'Officer profile submitted successfully for administrator review');
  } catch (err) {
    return handleError(res, err);
  }
}

async function getOnboardingDocuments(req, res) {
  try {
    const userId = req.user.userId;
    const { rows } = await db.query(
      'SELECT id, type, status, original_file_name, file_size, document_url, rejection_reason, version FROM officer_documents WHERE user_id = $1',
      [userId]
    );
    const requiredTypes = ['IDENTITY', 'ADDRESS', 'QUALIFICATION'];
    const data = requiredTypes.map(t => {
      const doc = rows.find(r => r.type === t);
      if (doc) {
        return {
          id: doc.id,
          type: doc.type,
          status: doc.status,
          fileName: doc.original_file_name,
          fileSize: doc.file_size,
          documentUrl: doc.document_url,
          rejectionReason: doc.rejection_reason,
          version: doc.version
        };
      }
      return {
        type: t,
        status: 'NOT_UPLOADED'
      };
    });
    return success(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function uploadOnboardingDocument(req, res) {
  try {
    const userId = req.user.userId;
    const type = req.body.documentType;
    const file = req.file;

    const allowedTypes = ['IDENTITY', 'ADDRESS', 'QUALIFICATION'];
    if (!type || !allowedTypes.includes(type)) {
      return error(res, 'Invalid document type selected', 400);
    }

    if (!file) {
      return error(res, 'No file uploaded', 400);
    }

    const cloudinary = require('../config/cloudinary');
    if (!cloudinary) {
      return error(res, 'File storage is not configured', 500);
    }

    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const folder = `officer-documents/${userId}/${type}`;
    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'auto'
    });

    const storedFileName = uploadRes.public_id;
    const documentUrl = uploadRes.secure_url || uploadRes.url;
    const storagePath = uploadRes.public_id;

    const q = `
      INSERT INTO officer_documents (user_id, type, original_file_name, stored_file_name, mime_type, file_size, storage_path, document_url, status, version, uploaded_at, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'UPLOADED', 1, now(), $1)
      ON CONFLICT (user_id, type) DO UPDATE SET
        original_file_name = EXCLUDED.original_file_name,
        stored_file_name = EXCLUDED.stored_file_name,
        mime_type = EXCLUDED.mime_type,
        file_size = EXCLUDED.file_size,
        storage_path = EXCLUDED.storage_path,
        document_url = EXCLUDED.document_url,
        status = 'UPLOADED',
        version = officer_documents.version + 1,
        uploaded_at = now(),
        uploaded_by = EXCLUDED.user_id,
        rejection_reason = NULL
      RETURNING id, type, original_file_name, status, version, uploaded_at
    `;
    const dbRes = await db.query(q, [
      userId, type, file.originalname, storedFileName, file.mimetype, file.size, storagePath, documentUrl
    ]);
    const doc = dbRes.rows[0];

    // Audit Log
    const auditLogger = require('../utils/auditLogger');
    await auditLogger.log(req, 'DOCUMENT_UPLOADED', userId, 'user', {
      type,
      fileName: file.originalname,
      version: doc.version
    });

    // Create Notification
    try {
      const notificationService = require('../services/notificationService');
      const docLabel = type === 'IDENTITY' ? 'Government Identity' : type === 'ADDRESS' ? 'Address Verification' : 'Qualification & Service';
      await notificationService.create(userId, 'OFFICER', {
        title: 'Document Uploaded',
        message: `Your ${docLabel} Document has been successfully uploaded.`,
        subtitle: `Filename: ${file.originalname}`,
        actionUrl: '/officer/onboarding'
      });
    } catch (e) {
      const logger = require('../utils/logger');
      logger.warn('Failed to send upload notification', { err: e.message });
    }

    return success(res, {
      success: true,
      document: {
        id: doc.id,
        type: doc.type,
        originalFileName: doc.original_file_name,
        status: doc.status,
        uploadedAt: doc.uploaded_at
      }
    }, 'Document uploaded successfully');
  } catch (err) {
    return handleError(res, err);
  }
}

// POST /api/officer/complaints/:id/decline
async function declineComplaint(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const officerId = req.user.userId;
    const { reason } = req.body;
    const c = await complaintRepo.getById(complaintId);
    if (!c) return error(res, 'Complaint not found', 404);
    if (c.officer_id !== officerId) return error(res, 'Forbidden: This complaint is not assigned to you', 403);

    if (c.status !== 'assigned' && c.status !== 'accepted') {
      return error(res, `Cannot decline complaint in status ${c.status}`, 400);
    }

    await db.query("UPDATE complaints SET officer_id = NULL, assigned_at = NULL, status = 'open' WHERE id = $1", [complaintId]);
    await complaintRepo.addStatusHistory(complaintId, c.status, 'open', officerId, `Officer declined assignment. Reason: ${reason || 'Not specified'}`);

    await db.query(
      "UPDATE complaint_assignments SET status = 'DECLINED', declined_reason = $1 WHERE complaint_id = $2 AND officer_id = $3",
      [reason || 'Not specified', complaintId, officerId]
    );

    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, 'ASSIGNMENT_DECLINED', complaintId, 'complaint', { reason });
    } catch (e) {}

    try {
      const notificationService = require('../services/notificationService');
      const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
      const formattedId = `CGN-${String(complaintId).padStart(5, '0')}`;
      for (const admin of admins) {
        await notificationService.create(admin.id, 'ASSIGNMENT_DECLINED', {
          title: 'Officer Declined Assignment',
          message: `Officer declined complaint #${formattedId}. Reassignment required.`,
          subtitle: `Reason: ${reason || 'Not specified'}`,
          actionUrl: `/admin/complaints/${complaintId}`,
          complaintId
        });
      }
    } catch (e) {}

    return success(res, null, 'Assignment declined and returned to open pool');
  } catch (err) {
    return handleError(res, err);
  }
}

// POST /api/officer/complaints/:id/start-work
async function startWork(req, res) {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const officerId = req.user.userId;
    const c = await complaintRepo.getById(complaintId);
    if (!c) return error(res, 'Complaint not found', 404);
    if (c.officer_id !== officerId) return error(res, 'Forbidden: This complaint is not assigned to you', 403);

    if (c.status !== 'accepted' && c.status !== 'assigned') {
      return error(res, `Cannot start work in status ${c.status}`, 400);
    }

    const updated = await complaintRepo.updateComplaint(complaintId, { status: 'in_progress' });
    await complaintRepo.addStatusHistory(complaintId, c.status, 'in_progress', officerId, 'Officer started work on the complaint.');

    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, 'COMPLAINT_STARTED', complaintId, 'complaint', { from: c.status, to: 'in_progress' });
    } catch (e) {}

    try {
      await db.query('INSERT INTO notifications(user_id, type, payload, is_read, created_at) VALUES($1,$2,$3,false,now())', [
        c.user_id,
        'COMPLAINT_IN_PROGRESS',
        JSON.stringify({ complaintId, title: c.title, message: `Officer has started work on your complaint.` })
      ]);
    } catch (e) {}

    return success(res, updated, 'Work started successfully');
  } catch (err) {
    return handleError(res, err);
  }
}

// PATCH /api/officer/availability
async function updateAvailability(req, res) {
  try {
    const officerId = req.user.userId;
    const { availability } = req.body;
    const allowed = ['AVAILABLE', 'BUSY', 'ON_FIELD', 'OFFLINE'];
    if (!availability || !allowed.includes(availability.toUpperCase())) {
      return error(res, 'Invalid availability status', 400);
    }

    const norm = availability.toUpperCase();
    await db.query('UPDATE users SET availability = $1 WHERE id = $2', [norm, officerId]);

    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, 'OFFICER_AVAILABILITY_CHANGED', officerId, 'user', { availability: norm });
    } catch (e) {}

    return success(res, { availability: norm }, 'Availability status updated successfully');
  } catch (err) {
    return handleError(res, err);
  }
}

// PATCH /api/officer/profile
async function updateProfile(req, res) {
  try {
    const officerId = req.user.userId;
    const { name, phone, address, city, state, postalCode } = req.body;

    const user = await adminUserRepo.getById(officerId);
    if (!user) return error(res, 'Officer not found', 404);

    const currentSettings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
    const updatedSettings = {
      ...currentSettings,
      phone: phone !== undefined ? phone.trim() : currentSettings.phone,
      address: address !== undefined ? address.trim() : currentSettings.address,
      city: city !== undefined ? city.trim() : currentSettings.city,
      state: state !== undefined ? state.trim() : currentSettings.state,
      postal_code: postalCode !== undefined ? postalCode.trim() : currentSettings.postal_code
    };

    const updates = ['settings = $1'];
    const vals = [JSON.stringify(updatedSettings)];
    let idx = 2;

    if (name) {
      updates.push(`name = $${idx++}`);
      vals.push(name.trim());
    }

    vals.push(officerId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, vals);

    try {
      const auditLogger = require('../utils/auditLogger');
      await auditLogger.log(req, 'OFFICER_PROFILE_UPDATED', officerId, 'user', { name, phone, address });
    } catch (e) {}

    return success(res, { userId: officerId, settings: updatedSettings }, 'Profile details updated successfully');
  } catch (err) {
    return handleError(res, err);
  }
}

// GET /api/officer/activity
async function getActivity(req, res) {
  try {
    const officerId = req.user.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      'SELECT * FROM audit_logs WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [officerId, limit, offset]
    );

    const countRes = await db.query('SELECT COUNT(*)::int AS count FROM audit_logs WHERE actor_id = $1', [officerId]);

    return success(res, { items: rows, total: countRes.rows[0].count, page, limit });
  } catch (err) {
    return handleError(res, err);
  }
}

// GET /api/officer/performance
async function getPerformance(req, res) {
  try {
    const officerId = req.user.userId;
    
    const statsRes = await db.query(`
      SELECT
        COUNT(*)::int AS total_assigned,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int AS completed_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int AS in_progress_count,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END)::int AS assigned_count,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END)::int AS accepted_count,
        COUNT(CASE WHEN status NOT IN ('resolved', 'closed', 'rejected') AND sla_due_at < now() THEN 1 END)::int AS overdue_count,
        COUNT(CASE WHEN status IN ('resolved', 'closed') AND (resolution_at <= sla_due_at OR sla_due_at IS NULL) THEN 1 END)::int AS on_time_count,
        AVG(EXTRACT(EPOCH FROM (resolution_at - assigned_at))) / 86400.0 AS avg_resolution_time
      FROM complaints
      WHERE officer_id = $1
    `, [officerId]);

    const s = statsRes.rows[0];
    const totalResolved = s.completed_count;
    const complianceRate = totalResolved > 0 ? Math.round((s.on_time_count / totalResolved) * 100) : 100;
    const resolutionRate = s.total_assigned > 0 ? Math.round((totalResolved / s.total_assigned) * 100) : 100;

    const trendRes = await db.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::int AS assigned_count,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int AS resolved_count
      FROM complaints
      WHERE officer_id = $1
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC LIMIT 6
    `, [officerId]);

    return success(res, {
      assignedCount: s.total_assigned,
      resolvedCount: totalResolved,
      inProgressCount: s.in_progress_count,
      assignedOnlyCount: s.assigned_count,
      acceptedCount: s.accepted_count,
      overdueCount: s.overdue_count,
      complianceRate,
      resolutionRate,
      averageResolutionTime: parseFloat(parseFloat(s.avg_resolution_time || 0).toFixed(1)),
      monthlyTrend: trendRes.rows.reverse()
    });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  dashboard,
  workload,
  assignedComplaints,
  departmentStats,
  nearby,
  profile,
  acceptComplaint,
  declineComplaint,
  startWork,
  updateStatus,
  resolveComplaint,
  addNote,
  getNotes,
  aiChat,
  submitOnboarding,
  getOnboardingDocuments,
  uploadOnboardingDocument,
  updateAvailability,
  updateProfile,
  getActivity,
  getPerformance,
  createResourceRequest,
  getResourceRequests,
  getComplaintTeam
};
