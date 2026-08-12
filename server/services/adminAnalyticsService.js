const analyticsRepo = require('../repositories/adminAnalyticsRepository');

async function adminDashboard() {
  const [complaints, users, categories, priorities, monthly, departments, officers, resolutionTrend] = await Promise.all([
    analyticsRepo.analyticsOverview(),
    analyticsRepo.usersOverview(),
    analyticsRepo.categoryDistribution(),
    analyticsRepo.priorityDistribution(),
    analyticsRepo.monthlyTrend(6),
    analyticsRepo.departmentPerformance(),
    analyticsRepo.officerPerformance(),
    analyticsRepo.resolutionTrend()
  ]);

  return {
    complaints,
    users,
    categories,
    priorities,
    monthly,
    departments,
    officers,
    resolutionTrend
  };
}

module.exports = { adminDashboard };
