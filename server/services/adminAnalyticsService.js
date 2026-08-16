const analyticsRepo = require('../repositories/adminAnalyticsRepository');

async function adminDashboard(options = {}) {
  const { startDate, endDate } = options;

  const results = await Promise.allSettled([
    analyticsRepo.analyticsOverview(startDate, endDate),
    analyticsRepo.usersOverview(),
    analyticsRepo.categoryDistribution(startDate, endDate),
    analyticsRepo.priorityDistribution(startDate, endDate),
    analyticsRepo.monthlyTrend(6, startDate, endDate),
    analyticsRepo.departmentPerformance(startDate, endDate),
    analyticsRepo.officerPerformance(startDate, endDate),
    analyticsRepo.resolutionTrend(startDate, endDate)
  ]);

  const defaultOverview = {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    rejected: 0,
    pending: 0,
    critical: 0,
    highPriority: 0,
    unassigned: 0,
    dueSoon: 0,
    overdue: 0,
    pendingApprovals: 0,
    activeOfficers: 0,
    resolutionRate: 0,
    avgResolutionHours: 0
  };

  const defaultUsers = { total: 0, citizen: 0, officer: 0, admin: 0 };

  const [
    complaintsRes,
    usersRes,
    categoriesRes,
    prioritiesRes,
    monthlyRes,
    departmentsRes,
    officersRes,
    resolutionTrendRes
  ] = results;

  // Log any failed analytics section
  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      const names = ['analyticsOverview', 'usersOverview', 'categoryDistribution', 'priorityDistribution', 'monthlyTrend', 'departmentPerformance', 'officerPerformance', 'resolutionTrend'];
      console.error(`[Analytics Service] ${names[idx]} failed:`, r.reason?.message || r.reason);
    }
  });

  return {
    complaints: complaintsRes.status === 'fulfilled' ? complaintsRes.value : defaultOverview,
    users: usersRes.status === 'fulfilled' ? usersRes.value : defaultUsers,
    categories: categoriesRes.status === 'fulfilled' ? categoriesRes.value : [],
    priorities: prioritiesRes.status === 'fulfilled' ? prioritiesRes.value : [],
    monthly: monthlyRes.status === 'fulfilled' ? monthlyRes.value : [],
    departments: departmentsRes.status === 'fulfilled' ? departmentsRes.value : [],
    officers: officersRes.status === 'fulfilled' ? officersRes.value : [],
    resolutionTrend: resolutionTrendRes.status === 'fulfilled' ? resolutionTrendRes.value : [],
    trend: resolutionTrendRes.status === 'fulfilled' ? resolutionTrendRes.value : (monthlyRes.status === 'fulfilled' ? monthlyRes.value : [])
  };
}

module.exports = { adminDashboard };
