/**
 * Civic GreenNet — Canonical Categories and Status Normalization Module
 * Single source of truth for categories across AI, Admin, Officer, Citizen, GIS Map, and Public feeds.
 */

const CANONICAL_CATEGORIES = {
  ROADS: 'roads',
  SANITATION: 'sanitation',
  LIGHTING: 'lighting',
  WATER: 'water',
  DRAINAGE: 'drainage',
  SAFETY: 'public_safety',
  PARKS: 'parks',
  OTHER: 'other'
};

const CATEGORY_DEFINITIONS = {
  roads: {
    key: 'roads',
    label: 'Roads & Infrastructure',
    shortLabel: 'Roads',
    aliases: [
      'roads', 'road', 'road_infrastructure', 'roads & infrastructure',
      'pothole', 'potholes', 'traffic', 'footpath', 'bridge', 'pavement',
      'speed_breaker', 'street_repair', 'infrastructure'
    ],
    defaultDepartment: 'Roads & Infrastructure'
  },
  sanitation: {
    key: 'sanitation',
    label: 'Sanitation & Waste Management',
    shortLabel: 'Sanitation',
    aliases: [
      'sanitation', 'waste', 'garbage', 'debris', 'solid_waste',
      'sanitation & waste management', 'waste management', 'waste_management',
      'trash', 'cleaning', 'dumping', 'litter'
    ],
    defaultDepartment: 'Sanitation & Waste Management'
  },
  lighting: {
    key: 'lighting',
    label: 'Street Lighting & Electricity',
    shortLabel: 'Street Lighting',
    aliases: [
      'lighting', 'street_lighting', 'street lighting', 'streetlights',
      'streetlight', 'electricity', 'electrical', 'power', 'power_outage',
      'lamp_post', 'dark_spot'
    ],
    defaultDepartment: 'Electrical & Street Lighting'
  },
  water: {
    key: 'water',
    label: 'Water Supply & Utilities',
    shortLabel: 'Water Supply',
    aliases: [
      'water', 'water_supply', 'water supply', 'utilities', 'leakage',
      'pipeline', 'water pipeline', 'drinking water', 'contamination',
      'water pollution', 'pipe burst'
    ],
    defaultDepartment: 'Water Supply & Sewage'
  },
  drainage: {
    key: 'drainage',
    label: 'Drainage & Sewerage',
    shortLabel: 'Drainage',
    aliases: [
      'drainage', 'sewerage', 'drain', 'sewer', 'flooding',
      'stormwater', 'clogged drain', 'manhole', 'overflow'
    ],
    defaultDepartment: 'Water Supply & Sewage'
  },
  public_safety: {
    key: 'public_safety',
    label: 'Public Safety & Enforcement',
    shortLabel: 'Public Safety',
    aliases: [
      'public_safety', 'public safety', 'safety', 'security',
      'hazard', 'encroachment', 'stray animals', 'illegal_construction',
      'noise_pollution'
    ],
    defaultDepartment: 'Public Safety & Enforcement'
  },
  parks: {
    key: 'parks',
    label: 'Parks & Horticulture',
    shortLabel: 'Parks',
    aliases: [
      'parks', 'park', 'horticulture', 'environment', 'trees',
      'fallen tree', 'garden', 'gardens', 'greenery'
    ],
    defaultDepartment: 'Parks & Horticulture'
  },
  other: {
    key: 'other',
    label: 'General Municipal Services',
    shortLabel: 'Other / General',
    aliases: [
      'other', 'general', 'misc', 'miscellaneous', 'administrative',
      'civic', 'grievance'
    ],
    defaultDepartment: 'General Administration'
  }
};

/**
 * Normalizes any category string into its canonical key ('roads', 'sanitation', etc.)
 */
function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return CANONICAL_CATEGORIES.OTHER;
  const str = raw.trim().toLowerCase().replace(/[-_]+/g, ' ');

  for (const def of Object.values(CATEGORY_DEFINITIONS)) {
    if (def.key === str) return def.key;
    for (const alias of def.aliases) {
      if (alias.toLowerCase() === str || alias.toLowerCase().replace(/[-_]+/g, ' ') === str) {
        return def.key;
      }
    }
  }

  // Partial substring matching fallback
  if (str.includes('road') || str.includes('pothole') || str.includes('infrastruct')) return 'roads';
  if (str.includes('sanitat') || str.includes('garbage') || str.includes('waste') || str.includes('trash')) return 'sanitation';
  if (str.includes('light') || str.includes('electr') || str.includes('power')) return 'lighting';
  if (str.includes('water') || str.includes('pipe')) return 'water';
  if (str.includes('drain') || str.includes('sewer') || str.includes('flood')) return 'drainage';
  if (str.includes('safety') || str.includes('hazard') || str.includes('encroach')) return 'public_safety';
  if (str.includes('park') || str.includes('tree') || str.includes('horticult') || str.includes('garden')) return 'parks';

  return CANONICAL_CATEGORIES.OTHER;
}

/**
 * Returns all string aliases for SQL matching (LOWER(category) = ANY($1))
 */
function getCategoryAliases(categoryOrKey) {
  if (!categoryOrKey || categoryOrKey === 'all' || categoryOrKey === 'ALL') {
    return [];
  }
  const canonical = normalizeCategory(categoryOrKey);
  const def = CATEGORY_DEFINITIONS[canonical];
  if (!def) return [canonical];

  const unique = new Set([
    canonical,
    def.key,
    def.shortLabel.toLowerCase(),
    def.label.toLowerCase(),
    ...def.aliases.map(a => a.toLowerCase())
  ]);
  return Array.from(unique);
}

/**
 * Normalizes status filter into array of matching canonical database status values
 */
function normalizeStatusFilter(status) {
  if (!status || status === 'all' || status === 'ALL') {
    return null;
  }
  const s = String(status).trim().toLowerCase();

  switch (s) {
    case 'active':
    case 'open_queue':
      return ['open', 'assigned', 'accepted', 'in_progress', 'reopened', 'pending'];
    case 'in_progress':
    case 'working':
      return ['in_progress', 'assigned', 'accepted', 'reopened'];
    case 'resolved':
    case 'closed':
    case 'resolved_closed':
    case 'completed':
      return ['resolved', 'closed'];
    case 'open':
      return ['open', 'pending'];
    case 'assigned':
      return ['assigned', 'accepted'];
    case 'rejected':
      return ['rejected'];
    default:
      return [s.replace('-', '_')];
  }
}

module.exports = {
  CANONICAL_CATEGORIES,
  CATEGORY_DEFINITIONS,
  normalizeCategory,
  getCategoryAliases,
  normalizeStatusFilter
};
