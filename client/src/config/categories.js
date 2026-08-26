/**
 * Civic GreenNet — Canonical Categories and Status Normalization Configuration (Frontend)
 * Synchronized with server/constants/categories.js.
 */

export const CATEGORY_DEFINITIONS = {
  roads: {
    key: 'roads',
    label: 'Roads & Infrastructure',
    shortLabel: 'Roads',
    tone: 'amber',
    icon: 'Road'
  },
  sanitation: {
    key: 'sanitation',
    label: 'Sanitation & Waste Management',
    shortLabel: 'Sanitation',
    tone: 'emerald',
    icon: 'Trash2'
  },
  lighting: {
    key: 'lighting',
    label: 'Street Lighting',
    shortLabel: 'Street Lighting',
    tone: 'yellow',
    icon: 'Zap'
  },
  water: {
    key: 'water',
    label: 'Water Supply & Utilities',
    shortLabel: 'Water Supply',
    tone: 'blue',
    icon: 'Droplets'
  },
  drainage: {
    key: 'drainage',
    label: 'Drainage & Sewerage',
    shortLabel: 'Drainage',
    tone: 'cyan',
    icon: 'Waves'
  },
  public_safety: {
    key: 'public_safety',
    label: 'Public Safety',
    shortLabel: 'Public Safety',
    tone: 'rose',
    icon: 'ShieldAlert'
  },
  parks: {
    key: 'parks',
    label: 'Parks & Horticulture',
    shortLabel: 'Parks',
    tone: 'teal',
    icon: 'Trees'
  },
  other: {
    key: 'other',
    label: 'Other Municipal Services',
    shortLabel: 'Other',
    tone: 'slate',
    icon: 'Layers'
  }
};

export const PUBLIC_MAP_CATEGORY_OPTIONS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Roads', value: 'roads' },
  { label: 'Sanitation', value: 'sanitation' },
  { label: 'Street Lighting', value: 'lighting' },
  { label: 'Water Supply', value: 'water' },
  { label: 'Drainage', value: 'drainage' },
  { label: 'Public Safety', value: 'public_safety' },
  { label: 'Parks', value: 'parks' }
];

export const PUBLIC_MAP_STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active Issues', value: 'active' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved / Closed', value: 'resolved' }
];

export function getCategoryBadge(category) {
  const catKey = (category || '').toLowerCase().trim();
  if (catKey.includes('road') || catKey.includes('pothole')) {
    return { label: 'Roads', tone: 'amber', colorCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
  }
  if (catKey.includes('sanitat') || catKey.includes('waste') || catKey.includes('garbage')) {
    return { label: 'Sanitation', tone: 'emerald', colorCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  }
  if (catKey.includes('light') || catKey.includes('electr')) {
    return { label: 'Lighting', tone: 'yellow', colorCls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' };
  }
  if (catKey.includes('water') || catKey.includes('pipe')) {
    return { label: 'Water', tone: 'blue', colorCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
  }
  if (catKey.includes('drain') || catKey.includes('sewer')) {
    return { label: 'Drainage', tone: 'cyan', colorCls: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' };
  }
  if (catKey.includes('safety') || catKey.includes('hazard')) {
    return { label: 'Public Safety', tone: 'rose', colorCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
  }
  if (catKey.includes('park') || catKey.includes('tree')) {
    return { label: 'Parks', tone: 'teal', colorCls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
  }
  return { label: category || 'General', tone: 'slate', colorCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
}
