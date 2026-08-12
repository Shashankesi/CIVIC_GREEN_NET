const reportRepo = require('../repositories/adminReportRepository');

// Simple, safe CSV escaping
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = [
    'ID', 'Title', 'Summary', 'Category', 'Priority', 'Status', 'Address',
    'Created At', 'Citizen', 'Officer', 'Department'
  ];
  const lines = [headers.join(',')];
  rows.forEach((r) => {
    lines.push([
      r.id, r.title, r.summary, r.category, r.priority, r.status, r.address,
      r.created_at ? new Date(r.created_at).toISOString() : '',
      r.citizen_name, r.officer_name, r.department_name
    ].map(escapeCsv).join(','));
  });
  return lines.join('\n');
}

async function reportSummary(params) {
  return reportRepo.reportSummary(params);
}

async function reportComplaints(params) {
  return reportRepo.reportComplaints(params);
}

async function exportComplaints(params) {
  const rows = await reportRepo.exportComplaints(params);
  return toCsv(rows);
}

module.exports = { reportSummary, reportComplaints, exportComplaints, toCsv };
