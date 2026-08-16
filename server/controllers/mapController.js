const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const { success, error } = require('../utils/response');
const mapService = require('../services/mapService');

/**
 * 1. Bounding Box Complaints
 * GET /api/maps/complaints?minLng=...&minLat=...&maxLng=...&maxLat=...
 */
const getComplaintsInBbox = asyncHandler(async (req, res) => {
  const { minLng, minLat, maxLng, maxLat, status, category, priority, departmentId, officerId, slaRisk, timeframe, search, limit, offset } = req.query;

  if (!minLng || !minLat || !maxLng || !maxLat) {
    return error(res, 'Bounding box coordinates (minLng, minLat, maxLng, maxLat) are required', 400);
  }

  const pMinLng = parseFloat(minLng);
  const pMinLat = parseFloat(minLat);
  const pMaxLng = parseFloat(maxLng);
  const pMaxLat = parseFloat(maxLat);

  if (isNaN(pMinLng) || isNaN(pMinLat) || isNaN(pMaxLng) || isNaN(pMaxLat)) {
    return error(res, 'Invalid bounding box numeric coordinates', 400);
  }

  const userRole = req.user?.role || 'citizen';
  const data = await mapService.getBboxComplaints(pMinLng, pMinLat, pMaxLng, pMaxLat, {
    status,
    category,
    priority,
    departmentId,
    officerId,
    slaRisk,
    timeframe,
    search,
    limit,
    offset
  }, userRole);

  return success(res, data);
});

/**
 * 2. Spatial Clusters for Low/Mid Zoom
 * GET /api/maps/clusters?minLng=...&minLat=...&maxLng=...&maxLat=...&zoom=...
 */
const getSpatialClusters = asyncHandler(async (req, res) => {
  const { minLng, minLat, maxLng, maxLat, zoom, status, category, priority } = req.query;

  if (!minLng || !minLat || !maxLng || !maxLat) {
    return error(res, 'Bounding box coordinates (minLng, minLat, maxLng, maxLat) are required', 400);
  }

  const pMinLng = parseFloat(minLng);
  const pMinLat = parseFloat(minLat);
  const pMaxLng = parseFloat(maxLng);
  const pMaxLat = parseFloat(maxLat);
  const pZoom = parseInt(zoom, 10) || 10;

  const data = await mapService.getSpatialClusters(pMinLng, pMinLat, pMaxLng, pMaxLat, pZoom, {
    status,
    category,
    priority
  });

  return success(res, data);
});

/**
 * 3. Weighted Heatmap Data
 * GET /api/maps/heatmap?minLng=...&minLat=...&maxLng=...&maxLat=...&weightBy=...
 */
const getHeatmap = asyncHandler(async (req, res) => {
  const { minLng, minLat, maxLng, maxLat, zoom, weightBy, category, status } = req.query;

  let bbox = null;
  if (minLng && minLat && maxLng && maxLat) {
    bbox = [parseFloat(minLng), parseFloat(minLat), parseFloat(maxLng), parseFloat(maxLat)];
  }

  const data = await mapService.getHeatmapData(bbox, parseInt(zoom, 10) || 10, weightBy, { category, status });
  return success(res, data);
});

/**
 * 4. AI Hotspot Map Layer
 * GET /api/maps/hotspots?days=30&category=roads
 */
const getHotspotsLayer = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const category = req.query.category || null;
  const data = await mapService.getHotspotLayers(days, category);
  return success(res, data);
});

/**
 * 5. SLA Risk Geographic Layer
 * GET /api/maps/sla-risk
 */
const getSlaRiskLayer = asyncHandler(async (req, res) => {
  const { minLng, minLat, maxLng, maxLat } = req.query;
  let bbox = null;
  if (minLng && minLat && maxLng && maxLat) {
    bbox = [parseFloat(minLng), parseFloat(minLat), parseFloat(maxLng), parseFloat(maxLat)];
  }
  const data = await mapService.getSlaRiskLayer(bbox);
  return success(res, data);
});

/**
 * 6. Duplicate Clusters Map Layer
 * GET /api/maps/duplicate-clusters
 */
const getDuplicateClustersLayer = asyncHandler(async (req, res) => {
  const data = await mapService.getDuplicateClusterLayer();
  return success(res, data);
});

/**
 * 7. Recurring Issue Zones Map Layer
 * GET /api/maps/recurring-zones?days=60
 */
const getRecurringZonesLayer = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 60;
  const data = await mapService.getRecurringIssueLayer(days);
  return success(res, data);
});

/**
 * 8. Ward Intelligence & Boundary Polygons
 * GET /api/maps/wards
 */
const getWardsLayer = asyncHandler(async (req, res) => {
  const data = await mapService.getWardIntelligence();
  return success(res, data);
});

/**
 * 9. Zone Intelligence
 * GET /api/maps/zones
 */
const getZonesLayer = asyncHandler(async (req, res) => {
  const data = await mapService.getZoneIntelligence();
  return success(res, data);
});

/**
 * 10. Department Jurisdiction & Workload
 * GET /api/maps/departments
 */
const getDepartmentsLayer = asyncHandler(async (req, res) => {
  const data = await mapService.getDepartmentJurisdiction();
  return success(res, data);
});

/**
 * 11. Privacy-Safe Officer Coverage (Admin Only)
 * GET /api/maps/officers
 */
const getOfficersCoverageLayer = asyncHandler(async (req, res) => {
  const data = await mapService.getOfficerOperationalCoverage();
  return success(res, data);
});

/**
 * 12. Nearby Complaints
 * GET /api/maps/nearby?lat=...&lng=...&radius=1000
 */
const getNearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius, category, status, priority, limit, offset } = req.query;

  if (!lat || !lng) {
    return error(res, 'Latitude and longitude coordinates are required', 400);
  }

  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);

  if (isNaN(pLat) || isNaN(pLng)) {
    return error(res, 'Invalid numeric coordinates', 400);
  }

  const userRole = req.user?.role || 'citizen';
  const data = await mapService.getNearbyComplaints(pLat, pLng, parseFloat(radius) || 1000, {
    category,
    status,
    priority,
    limit,
    offset
  }, userRole);

  return success(res, data);
});

/**
 * 13. Geographic Spatial Trends
 * GET /api/maps/trends?timeframe=30d
 */
const getTrendsLayer = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || '30d';
  const data = await mapService.getGeographicTrends(timeframe);
  return success(res, data);
});

/**
 * 14. AI Geographic Insights Summary
 * GET /api/maps/insights
 */
const getInsightsSummary = asyncHandler(async (req, res) => {
  const data = await mapService.getGeographicInsightsSummary();
  return success(res, data);
});

module.exports = {
  getComplaintsInBbox,
  getSpatialClusters,
  getHeatmap,
  getHotspotsLayer,
  getSlaRiskLayer,
  getDuplicateClustersLayer,
  getRecurringZonesLayer,
  getWardsLayer,
  getZonesLayer,
  getDepartmentsLayer,
  getOfficersCoverageLayer,
  getNearby,
  getTrendsLayer,
  getInsightsSummary
};
