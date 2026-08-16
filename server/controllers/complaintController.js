const asyncHandler = require('../utils/asyncHandler');
const complaintService = require('../services/complaintService');
const { success, error } = require('../utils/response');
const timelineService = require('../services/timelineService');
const contributionService = require('../services/citizenContributionService');
const db = require('../config/db');

const getUserId = (req) => (req.user ? (req.user.userId || req.user.id) : null);

const create = asyncHandler(async (req, res) => {
  let loc = null;
  if (req.body.location) {
    try { loc = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location; } catch(e) { loc = null; }
  }
  const payload = {
    userId: getUserId(req),
    departmentId: req.body.departmentId || null,
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
    severity: req.body.severity,
    isAnonymous: req.body.isAnonymous === 'true' || req.body.isAnonymous === true,
    address: req.body.address || null,
    location: loc || { lat: null, lng: null }
  };
  const files = req.files || [];
  const c = await complaintService.createComplaint(payload, files);

  // Award citizen contribution points for valid report submission
  if (payload.userId && c?.id) {
    try {
      await contributionService.recordContributionEvent(payload.userId, 'REPORT_SUBMITTED', 'complaint', c.id);
    } catch(e) {}
  }

  return success(res, c, 'Complaint created', 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const filters = {};
  if (req.query.status) filters.status = req.query.status;

  if (req.query.mine === 'true' || req.query.mine === true) {
    if (!req.user) return error(res, 'Unauthorized', 401);
    const searchParams = {
      page,
      limit,
      category: req.query.category || null,
      status: req.query.status || null,
      priority: req.query.priority || null,
      sortBy: req.query.sortBy || 'created_at',
      sortDir: req.query.sortDir || 'desc'
    };
    if (req.user.role === 'citizen') searchParams.userId = getUserId(req);
    else if (req.user.role === 'officer') searchParams.officerId = getUserId(req);
    const rows = await complaintService.searchComplaints(searchParams);
    return success(res, { items: rows, page, limit });
  }

  if (req.user && req.user.role === 'officer') {
    const rows = await complaintService.searchComplaints({
      page,
      limit,
      officerScopeId: getUserId(req),
      status: req.query.status || null
    });
    return success(res, { items: rows, page, limit });
  }

  const rows = await complaintService.listComplaints({ limit, offset, filters });
  return success(res, { items: rows, page, limit });
});

const get = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return error(res, 'Invalid complaint ID', 400);

  const c = await complaintService.getComplaint(id);
  if (!c) return error(res, 'Complaint not found', 404);

  // Security Check: Hide owner details if anonymous and viewer is not authorized
  if (c.is_anonymous) {
    let isAuthorized = false;
    if (req.user) {
      if (req.user.role === 'admin' || req.user.role === 'officer' || req.user.userId === c.user_id) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      c.owner = null;
      c.user_id = null;
    }
  }

  // Enrich with votes, follow, and comments
  const userId = req.user?.userId || null;
  const complaintRepo = require('../repositories/complaintRepository');
  const [votes, follow, comments] = await Promise.all([
    complaintRepo.getComplaintVotes(id, userId).catch(() => ({ count: 0, hasVoted: false })),
    complaintRepo.getComplaintFollow(id, userId).catch(() => ({ count: 0, isFollowing: false })),
    complaintRepo.getComments(id, userId).catch(() => [])
  ]);
  c.votes = votes;
  c.follow = follow;
  c.comments = comments;

  return success(res, c);
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const c = await complaintService.getComplaint(id);
  if (!c) return error(res, 'Not found', 404);

  // Security Check: Citizens can only update their own complaints
  if (req.user.role === 'citizen' && c.user_id !== req.user.userId) {
    return error(res, 'Forbidden: You do not own this complaint', 403);
  }

  const fields = req.body;
  const updated = await complaintService.updateComplaint(id, fields);
  return success(res, updated, 'Updated');
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const c = await complaintService.getComplaint(id);
  if (!c) return error(res, 'Not found', 404);

  // Security Check: Citizens can only delete their own complaints
  if (req.user.role === 'citizen' && c.user_id !== req.user.userId) {
    return error(res, 'Forbidden: You do not own this complaint', 403);
  }

  await complaintService.deleteComplaint(id);
  return success(res, {}, 'Deleted');
});

const changeStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, note } = req.body;
  // perform status change (validations in service)
  const updated = await timelineService.changeStatus(id, status, req.user.userId, note);

  // handle optional image upload (resolution image) and upload to Cloudinary
  if (req.file) {
    const cloudinary = require('../config/cloudinary');
    const complaintRepo = require('../repositories/complaintRepository');
    const logger = require('../utils/logger');
    try {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const res = await cloudinary.uploader.upload(dataUri, { folder: 'complaints/resolutions' });
      const meta = {
        original_filename: req.file.originalname,
        uploaded_by: req.user ? req.user.userId : null,
        uploaded_at: new Date().toISOString(),
        resolution: true,
        width: res.width,
        height: res.height,
        format: res.format
      };
      await complaintRepo.addComplaintImage(id, res.secure_url || res.url, res.public_id, meta);
    } catch (e) {
      // do not block status change
      const logger = require('../utils/logger');
      logger.error('Resolution image upload failed', { err: e });
    }
    // if multer had created temp file path, attempt delete (best-effort)
    if (req.file.path) {
      const fs = require('fs');
      fs.unlink(req.file.path, () => {});
    }
  }

  return success(res, updated, 'Status updated');
});

const timeline = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const t = await timelineService.getTimeline(id);
  return success(res, t);
});

const stats = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || null;
  const stats = await require('../repositories/complaintRepository').statsSummary(userId);
  const recent = await require('../repositories/complaintRepository').recentComplaints(10, userId);
  const trend = await require('../repositories/complaintRepository').trend(30, userId);
  const categories = await require('../repositories/complaintRepository').categoryDistribution(userId);
  const priorities = await require('../repositories/complaintRepository').priorityDistribution(userId);
  const monthly = await require('../repositories/complaintRepository').monthlyTrend(6, userId);
  return success(res, { stats, recent, trend, categories, priorities, monthly });
});

const publicStats = asyncHandler(async (req, res, next) => {
  const publicCtl = require('./publicController');
  return publicCtl.getPublicStats(req, res, next);
});

const search = asyncHandler(async (req, res) => {
  const params = {
    q: req.query.q || null,
    category: req.query.category || null,
    departmentId: req.query.departmentId || null,
    status: req.query.status || null,
    priority: req.query.priority || null,
    dateFrom: req.query.dateFrom || null,
    dateTo: req.query.dateTo || null,
    lat: req.query.lat ? parseFloat(req.query.lat) : null,
    lng: req.query.lng ? parseFloat(req.query.lng) : null,
    radius: req.query.radius ? parseFloat(req.query.radius) : null,
    page: parseInt(req.query.page,10) || 1,
    limit: parseInt(req.query.limit,10) || 20,
    sortBy: req.query.sortBy || 'created_at',
    sortDir: req.query.sortDir || 'desc',
    assigned: req.query.assigned || null,
    dueSoon: req.query.dueSoon || null
  };

  const uid = getUserId(req);
  if (req.query.mine === 'true' || req.query.mine === true) {
    if (!req.user || !uid) return error(res, 'Unauthorized', 401);
    if (req.user.role === 'citizen') {
      params.userId = uid;
    } else if (req.user.role === 'officer') {
      params.officerId = uid;
    }
  } else if (req.user && req.user.role === 'officer') {
    params.officerScopeId = uid;
  }

  const rows = await complaintService.searchComplaints(params);
  return success(res, { items: rows, page: params.page });
});

const similar = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const rows = await require('../repositories/complaintRepository').getSimilarComplaints(id, 0.7, 10);
  return success(res, { items: rows });
});

const heatmap = asyncHandler(async (req, res) => {
  const { minLng, minLat, maxLng, maxLat, zoom } = req.query;
  let bbox = null;
  if (minLng && minLat && maxLng && maxLat) bbox = [parseFloat(minLng), parseFloat(minLat), parseFloat(maxLng), parseFloat(maxLat)];
  const rows = await require('../repositories/complaintRepository').heatmapAggregation({ bbox, zoom: parseInt(zoom,10) || 10 });
  return success(res, rows);
});

const bbox = asyncHandler(async (req, res) => {
  const { minLng, minLat, maxLng, maxLat, limit, offset, status, category, priority } = req.query;
  if (!minLng || !minLat || !maxLng || !maxLat) return error(res, 'Missing bbox', 400);
  const filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;
  if (priority) filters.priority = priority;
  const rows = await require('../repositories/complaintRepository').bboxQuery(parseFloat(minLng), parseFloat(minLat), parseFloat(maxLng), parseFloat(maxLat), { limit: parseInt(limit,10)||100, offset: parseInt(offset,10)||0, filters });
  await complaintService.enrichComplaintsWithImages(rows);
  return success(res, rows);
});

const nearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius, limit, offset } = req.query;
  if (!lat || !lng) return error(res, 'Missing coordinates', 400);
  const rows = await require('../repositories/complaintRepository').nearbyComplaints(parseFloat(lat), parseFloat(lng), parseFloat(radius) || 1000, { limit: parseInt(limit,10)||50, offset: parseInt(offset,10)||0 });
  await complaintService.enrichComplaintsWithImages(rows);
  return success(res, rows);
});

const verifyResolution = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const satisfied = req.body.satisfied === true || req.body.satisfied === 'true';
  const { note, reason } = req.body;

  const complaint = await complaintService.getComplaint(id);
  if (!complaint) return error(res, 'Not found', 404);

  if (complaint.status !== 'resolved') {
    return error(res, 'Complaint is not in resolved status', 400);
  }

  // Security Check: Citizens can only verify resolution of their own complaints
  if (req.user.role === 'citizen' && complaint.user_id !== getUserId(req)) {
    return error(res, 'Forbidden: You do not own this complaint', 403);
  }

  if (satisfied) {
    // 1. Confirm Resolution -> Status closed
    const updated = await timelineService.changeStatus(id, 'closed', getUserId(req), note || 'Citizen confirmed and verified resolution.');
    // Award citizen contribution points (+5)
    try {
      await contributionService.recordContributionEvent(complaint.user_id, 'RESOLUTION_VERIFIED', 'complaint', id);
    } catch(e) {}
    return success(res, updated, 'Resolution verified: complaint is now closed');
  } else {
    // 2. Request Reopening -> Requires valid reason
    const reopenReason = (reason || note || '').trim();
    if (!reopenReason || reopenReason.length < 5) {
      return error(res, 'A clear reason (minimum 5 characters) is required to request reopening', 400);
    }

    // Record reopening in PostgreSQL complaint_reopenings ledger
    try {
      await db.query(`
        INSERT INTO complaint_reopenings (complaint_id, user_id, reason, created_at)
        VALUES ($1, $2, $3, now())
      `, [id, getUserId(req), reopenReason]);
    } catch (e) {
      console.warn('Could not insert to complaint_reopenings ledger', e.message);
    }

    const updated = await timelineService.changeStatus(id, 'reopened', getUserId(req), `Reopened by citizen: ${reopenReason}`);
    return success(res, updated, 'Complaint reopened for further review');
  }
});

const toggleVote = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return error(res, 'Invalid complaint ID', 400);
  const complaintRepo = require('../repositories/complaintRepository');
  const result = await complaintRepo.toggleVote(id, getUserId(req));

  // If voted, award contribution points to voter and complaint owner
  if (result.hasVoted) {
    try {
      await contributionService.recordContributionEvent(getUserId(req), 'COMMUNITY_SUPPORT_GIVEN', 'complaint', id);
      const comp = await complaintService.getComplaint(id);
      if (comp?.user_id && comp.user_id !== getUserId(req)) {
        await contributionService.recordContributionEvent(comp.user_id, 'COMMUNITY_SUPPORT_RECEIVED', 'complaint', id);
      }
    } catch(e) {}
  }

  return success(res, result, result.hasVoted ? 'Supported complaint' : 'Removed support');
});

const toggleFollow = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return error(res, 'Invalid complaint ID', 400);
  const complaintRepo = require('../repositories/complaintRepository');
  const result = await complaintRepo.toggleFollow(id, getUserId(req));
  return success(res, result, result.isFollowing ? 'Following complaint updates' : 'Unfollowed complaint');
});

const getComments = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return error(res, 'Invalid complaint ID', 400);
  const complaintRepo = require('../repositories/complaintRepository');
  const comments = await complaintRepo.getComments(id, getUserId(req));
  return success(res, comments);
});

const addComment = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return error(res, 'Invalid complaint ID', 400);
  const { comment, isAnonymous } = req.body;
  if (!comment || typeof comment !== 'string' || comment.trim().length < 2) {
    return error(res, 'Comment must be at least 2 characters long', 400);
  }
  if (comment.trim().length > 1000) {
    return error(res, 'Comment exceeds maximum allowed length of 1000 characters', 400);
  }

  const complaintRepo = require('../repositories/complaintRepository');
  const newComment = await complaintRepo.addComment(id, getUserId(req), comment.trim(), isAnonymous === true || isAnonymous === 'true');

  // Award constructive comment points (+2)
  try {
    await contributionService.recordContributionEvent(getUserId(req), 'CONSTRUCTIVE_COMMENT', 'comment', newComment.id);
  } catch(e) {}

  return success(res, newComment, 'Comment added', 201);
});

const reportComment = asyncHandler(async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  if (isNaN(commentId)) return error(res, 'Invalid comment ID', 400);
  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return error(res, 'A reporting reason is required', 400);
  }

  const complaintRepo = require('../repositories/complaintRepository');
  const report = await complaintRepo.reportComment(commentId, getUserId(req), reason.trim());
  return success(res, report, 'Comment reported for moderation review', 201);
});

const addEvidence = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return error(res, 'Invalid complaint ID', 400);
  const complaint = await complaintService.getComplaint(id);
  if (!complaint) return error(res, 'Complaint not found', 404);

  // Security check: citizen can only add evidence to own complaint or if admin/officer
  if (req.user.role === 'citizen' && complaint.user_id !== getUserId(req)) {
    return error(res, 'Forbidden: You can only add evidence to your own complaints', 403);
  }

  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) return error(res, 'No files provided', 400);

  const cloudinary = require('../config/cloudinary');
  const complaintRepo = require('../repositories/complaintRepository');
  const uploaded = [];

  for (const file of files) {
    try {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const r = await cloudinary.uploader.upload(dataUri, { folder: 'complaints/evidence' });
      const meta = {
        original_filename: file.originalname,
        uploaded_by: getUserId(req),
        uploaded_at: new Date().toISOString(),
        width: r.width,
        height: r.height,
        format: r.format
      };
      const img = await complaintRepo.addComplaintImage(id, r.secure_url || r.url, r.public_id, meta);
      uploaded.push(img);
    } catch (e) {
      console.error('Failed to upload additional evidence', e.message);
    }
  }

  if (uploaded.length > 0) {
    try {
      await contributionService.recordContributionEvent(getUserId(req), 'EVIDENCE_UPLOADED', 'complaint', id);
    } catch(e) {}
  }

  return success(res, uploaded, 'Evidence uploaded successfully', 201);
});

module.exports = {
  create,
  list,
  get,
  update,
  remove,
  changeStatus,
  timeline,
  stats,
  publicStats,
  search,
  similar,
  heatmap,
  bbox,
  nearby,
  verifyResolution,
  toggleVote,
  toggleFollow,
  getComments,
  addComment,
  reportComment,
  addEvidence
};
