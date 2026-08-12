const { success, error } = require('../utils/response');
const complaintRepo = require('../repositories/complaintRepository');
const adminUserRepo = require('../repositories/adminUserRepository');
const adminDeptRepo = require('../repositories/adminDepartmentRepository');
const assignmentRepo = require('../repositories/assignmentRepository');

async function handleError(res, err) {
  return error(res, err.message || 'Server error', err.status || 500);
}

// Officer workload: complaints assigned to this officer by status
async function workload(req, res) {
  try {
    const officerId = req.user.userId;
    const assigned = await assignmentRepo.complaintsAssignedToOfficer(officerId, { limit: 1000 });
    const ids = assigned.map((a) => a.id);

    const perStatus = { pending: 0, open: 0, in_progress: 0, resolved: 0, rejected: 0, total: ids.length };
    for (const id of ids) {
      const c = await complaintRepo.getById(id);
      if (c && c.status) perStatus[c.status] = (perStatus[c.status] || 0) + 1;
    }

    return success(res, perStatus);
  } catch (err) {
    return handleError(res, err);
  }
}

// Complaints assigned to the officer (with optional status filter)
async function assignedComplaints(req, res) {
  try {
    const officerId = req.user.userId;
    const status = req.query.status || null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const ids = (await assignmentRepo.complaintsAssignedToOfficer(officerId, { limit: 1000 })).map((a) => a.id);
    let items = [];
    for (const id of ids) {
      const c = await complaintRepo.getById(id);
      if (c) items.push(c);
    }
    if (status) items = items.filter((c) => c.status === status);
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = items.length;
    const offset = (page - 1) * limit;
    return success(res, { items: items.slice(offset, offset + limit), page, limit, total });
  } catch (err) {
    return handleError(res, err);
  }
}

// Department statistics for the officer's department
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

module.exports = { workload, assignedComplaints, departmentStats };
