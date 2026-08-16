// Centralized MapTiler map tile configuration.
// The browser API key is read from Vite's env (VITE_MAPTILER_API_KEY).
// It is never hardcoded in JSX/JS source files.

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || ''

// MapTiler raster tile URLs (PNG) — work with react-leaflet TileLayer.
// Light:  streets-v2  (clean civic government look)
// Dark:   dataviz-dark  (readable dark civic style)
function tileUrl(style) {
  if (!MAPTILER_API_KEY) {
    // OSM fallback when no key is set
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  }
  return `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`
}

export const MAPTILER_KEY = MAPTILER_API_KEY

export const ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'

// Civic styles
export const MAP_STYLES = {
  light: {
    label: 'Light',
    url: tileUrl('streets-v2'),
    fallback: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 22,
    attribution: MAPTILER_API_KEY ? ATTRIBUTION : OSM_ATTRIBUTION
  },
  dark: {
    label: 'Dark',
    url: tileUrl('dataviz-dark'),
    fallback: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 22,
    attribution: MAPTILER_API_KEY ? ATTRIBUTION : OSM_ATTRIBUTION
  }
}

// Returns the active tile layer config for a given theme.
export function getTileConfig(dark) {
  const style = dark ? MAP_STYLES.dark : MAP_STYLES.light
  return {
    url: style.url,
    fallback: style.fallback,
    attribution: style.attribution,
    maxZoom: style.maxZoom,
    subdomains: []
  }
}

// Whether a MapTiler key is configured (needed for custom tiles + geocoding).
export function hasMaptilerKey() {
  return MAPTILER_API_KEY && MAPTILER_API_KEY.length > 0
}

// Legacy alias — kept for any import that still calls hasGeoapifyKey
export const hasGeoapifyKey = hasMaptilerKey

export const DEFAULT_CENTER = [20.5937, 78.9629] // India
export const DEFAULT_ZOOM = 5

// Civic GreenNet complaint statuses (from backend) + colors.
export const STATUS_META = {
  open:        { label: 'Open',        color: '#3b82f6', icon: '●' },
  pending:     { label: 'Pending',     color: '#64748b', icon: '◌' },
  in_progress: { label: 'In Progress', color: '#f59e0b', icon: '◐' },
  resolved:    { label: 'Resolved',    color: '#10b981', icon: '✓' },
  rejected:    { label: 'Rejected',    color: '#ef4444', icon: '✕' },
  closed:      { label: 'Closed',      color: '#6b7280', icon: '⊘' }
}

export const PRIORITY_META = {
  low:      { label: 'Low',      color: '#94a3b8', ring: 0 },
  medium:   { label: 'Medium',   color: '#f59e0b', ring: 4 },
  high:     { label: 'High',     color: '#f97316', ring: 6 },
  critical: { label: 'Critical', color: '#ef4444', ring: 8 }
}

export const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.keys(STATUS_META).map((k) => ({ value: k, label: STATUS_META[k].label }))
]

export const PRIORITY_OPTIONS = [
  { value: '', label: 'Any priority' },
  ...Object.keys(PRIORITY_META).map((k) => ({ value: k, label: PRIORITY_META[k].label }))
]

export const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'sanitation',     label: 'Sanitation' },
  { value: 'roads',          label: 'Roads' },
  { value: 'water',          label: 'Water' },
  { value: 'electricity',    label: 'Electricity' },
  { value: 'public safety',  label: 'Public Safety' },
  { value: 'waste',          label: 'Waste' },
  { value: 'parks',          label: 'Parks' },
  { value: 'drainage',       label: 'Drainage' },
  { value: 'streetlights',   label: 'Streetlights' },
  { value: 'other',          label: 'Other' }
]

export const RADIUS_OPTIONS = [
  { value: 500,   label: '500 m' },
  { value: 1000,  label: '1 km'  },
  { value: 2000,  label: '2 km'  },
  { value: 5000,  label: '5 km'  },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' }
]

export const TIME_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last 1 Year' }
]

export const GIS_LAYERS = [
  { key: 'complaints', label: 'Complaints Pins', icon: '📍', default: true },
  { key: 'heatmap', label: 'Density Heatmap', icon: '🌡️', default: false },
  { key: 'hotspots', label: 'AI Civic Hotspots', icon: '🔥', default: true },
  { key: 'slaRisk', label: 'SLA Risk Map', icon: '⏱️', default: false },
  { key: 'duplicateClusters', label: 'Duplicate Clusters', icon: '⚠️', default: false },
  { key: 'recurringZones', label: 'Recurring Defect Zones', icon: '↻', default: false },
  { key: 'wards', label: 'Ward Boundaries', icon: '🏛️', default: true },
  { key: 'departments', label: 'Department Coverage', icon: '🏢', default: false }
]

export const SLA_RISK_META = {
  overdue: { label: 'Overdue', color: '#ef4444', ring: 8, icon: '🔴' },
  due_soon: { label: 'Due Soon (<24h)', color: '#f59e0b', ring: 6, icon: '🟡' },
  on_time: { label: 'On Time', color: '#10b981', ring: 0, icon: '🟢' }
}

export const HOTSPOT_LEVEL_META = {
  critical: { label: 'Critical Hotspot', color: '#dc2626', fill: 'rgba(220, 38, 38, 0.25)', border: '#b91c1c' },
  emerging: { label: 'Emerging Hotspot', color: '#ea580c', fill: 'rgba(234, 88, 12, 0.25)', border: '#c2410c' },
  recurring: { label: 'Recurring Pattern', color: '#eab308', fill: 'rgba(234, 179, 8, 0.25)', border: '#ca8a04' },
  normal: { label: 'Complaint Cluster', color: '#2563eb', fill: 'rgba(37, 99, 235, 0.20)', border: '#1d4ed8' }
}
