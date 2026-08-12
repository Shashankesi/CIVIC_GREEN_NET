const asyncHandler = require('../utils/asyncHandler');
const complaintService = require('../services/complaintService');
const { success, error } = require('../utils/response');
const timelineService = require('../services/timelineService');

const create = asyncHandler(async (req, res) => {
  let loc = null;
  if (req.body.location) {
    try { loc = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location; } catch(e) { loc = null; }
  }
  const payload = {
    userId: req.user ? req.user.userId : null,
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
  return success(res, c, 'Complaint created', 201);
});

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const filters = {};
  if (req.query.status) filters.status = req.query.status;
  const rows = await complaintService.listComplaints({ limit, offset, filters });
  return success(res, { items: rows, page, limit });
});

const get = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const c = await complaintService.getComplaint(id);
  if (!c) return error(res, 'Not found', 404);
  return success(res, c);
});

const update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fields = req.body;
  const updated = await complaintService.updateComplaint(id, fields);
  return success(res, updated, 'Updated');
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
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

const publicStats = asyncHandler(async (req, res) => {
  const db = require('../config/db');
  let totalReports = 0;
  let resolvedReports = 0;
  let activeDepartments = 0;
  let activeOfficers = 0;

  try {
    const complaintsCountRes = await db.query(
      `SELECT 
        COUNT(*)::int as total, 
        COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed')::int as resolved 
       FROM complaints`
    );
    totalReports = complaintsCountRes.rows[0].total || 0;
    resolvedReports = complaintsCountRes.rows[0].resolved || 0;

    const deptsCountRes = await db.query('SELECT COUNT(*)::int as total FROM departments');
    activeDepartments = deptsCountRes.rows[0].total || 0;

    const officersCountRes = await db.query("SELECT COUNT(*)::int as total FROM users WHERE role = 'officer' AND status = 'approved'");
    activeOfficers = officersCountRes.rows[0].total || 0;
  } catch (e) {
    console.error('Failed to fetch public stats:', e);
  }

  return success(res, {
    totalReports,
    resolvedReports,
    departments: activeDepartments,
    activeOfficers
  });
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
    sortDir: req.query.sortDir || 'desc'
  };
  const rows = await require('../repositories/complaintRepository').searchComplaints(params);
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
  return success(res, rows);
});

const nearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius, limit, offset } = req.query;
  if (!lat || !lng) return error(res, 'Missing coordinates', 400);
  const rows = await require('../repositories/complaintRepository').nearbyComplaints(parseFloat(lat), parseFloat(lng), parseFloat(radius) || 1000, { limit: parseInt(limit,10)||50, offset: parseInt(offset,10)||0 });
  return success(res, rows);
});

const verifyResolution = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const satisfied = req.body.satisfied === true || req.body.satisfied === 'true';
  const { note } = req.body;

  const complaint = await complaintService.getComplaint(id);
  if (!complaint) return error(res, 'Not found', 404);

  if (complaint.status !== 'resolved') {
    return error(res, 'Complaint is not resolved', 400);
  }

  const toStatus = satisfied ? 'closed' : 'reopened';
  const updated = await timelineService.changeStatus(id, toStatus, req.user.userId, note || 'Citizen verified resolution.');
  return success(res, updated, `Resolution verified: complaint is now ${toStatus}`);
});

module.exports = { create, list, get, update, remove, changeStatus, timeline, stats, publicStats, search, similar, heatmap, bbox, nearby, verifyResolution };
