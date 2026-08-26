const deptRepo = require('../repositories/adminDepartmentRepository');

class DeptError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function listDepartments(params) {
  return deptRepo.listDepartments(params);
}

async function getById(id) {
  const dept = await deptRepo.getById(id);
  if (!dept) throw new DeptError('Department not found', 404);
  return dept;
}

async function createDepartment({ name, description }) {
  if (!name || !name.trim()) throw new DeptError('Department name is required', 400);
  const existing = await deptRepo.getByName(name);
  if (existing) throw new DeptError('A department with that name already exists', 409);
  return deptRepo.createDepartment({ name: name.trim(), description: description || null });
}

async function updateDepartment(id, fields) {
  const existing = await deptRepo.getById(id);
  if (!existing) throw new DeptError('Department not found', 404);
  if (fields.name) {
    const duplicate = await deptRepo.getByName(fields.name);
    if (duplicate && duplicate.id !== id) throw new DeptError('A department with that name already exists', 409);
  }
  return deptRepo.updateDepartment(id, fields);
}

async function deleteDepartment(id) {
  const existing = await deptRepo.getById(id);
  if (!existing) throw new DeptError('Department not found', 404);
  // Safe deletion: refuse to delete a department that still has complaints or officers.
  if (existing.complaint_count && existing.complaint_count > 0) {
    throw new DeptError('Cannot delete department with associated complaints', 400);
  }
  if (existing.officer_count && existing.officer_count > 0) {
    throw new DeptError('Cannot delete department with assigned officers', 400);
  }
  await deptRepo.deleteDepartment(id);
  return true;
}

async function listOfficers(params = {}) {
  return deptRepo.listOfficers(params);
}

module.exports = { listDepartments, getById, createDepartment, updateDepartment, deleteDepartment, listOfficers, DeptError };
