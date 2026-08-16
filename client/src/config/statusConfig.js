// Centralized Civic GreenNet Semantic Status & Priority Color Configuration

export const STATUS_COLOR_CONFIG = {
  open: {
    label: 'Open',
    dotColor: 'bg-amber-500',
    badgeInactive: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    badgeActive: 'bg-amber-600 text-white border-amber-600 shadow-sm'
  },
  in_progress: {
    label: 'In Progress',
    dotColor: 'bg-blue-500',
    badgeInactive: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
    badgeActive: 'bg-blue-600 text-white border-blue-600 shadow-sm'
  },
  resolved: {
    label: 'Resolved',
    dotColor: 'bg-emerald-500',
    badgeInactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
    badgeActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
  },
  closed: {
    label: 'Closed',
    dotColor: 'bg-slate-300',
    badgeInactive: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    badgeActive: 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-slate-950 dark:border-slate-800'
  },
  reopened: {
    label: 'Reopened',
    dotColor: 'bg-purple-500',
    badgeInactive: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
    badgeActive: 'bg-purple-600 text-white border-purple-600 shadow-sm'
  },
  rejected: {
    label: 'Rejected',
    dotColor: 'bg-red-500',
    badgeInactive: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50',
    badgeActive: 'bg-red-600 text-white border-red-600 shadow-sm'
  },
  pending: {
    label: 'Pending',
    dotColor: 'bg-slate-400',
    badgeInactive: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    badgeActive: 'bg-slate-700 text-white border-slate-700 shadow-sm'
  }
};

export const PRIORITY_COLOR_CONFIG = {
  low: {
    label: 'Low',
    dotColor: 'bg-slate-400',
    badgeInactive: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  },
  medium: {
    label: 'Medium',
    dotColor: 'bg-amber-500',
    badgeInactive: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
  },
  high: {
    label: 'High',
    dotColor: 'bg-orange-500',
    badgeInactive: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/50'
  },
  critical: {
    label: 'Critical',
    dotColor: 'bg-red-500',
    badgeInactive: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50'
  }
};
