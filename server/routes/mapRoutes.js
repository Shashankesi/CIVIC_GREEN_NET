const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/mapController');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/authMiddleware');

// 1. Complaint markers and spatial aggregations
router.get('/complaints', optionalAuthenticate, getComplaintsInBbox);
router.get('/clusters', optionalAuthenticate, getSpatialClusters);
router.get('/heatmap', optionalAuthenticate, getHeatmap);
router.get('/nearby', optionalAuthenticate, getNearby);

// 2. Intelligence Overlays
router.get('/hotspots', optionalAuthenticate, getHotspotsLayer);
router.get('/sla-risk', optionalAuthenticate, getSlaRiskLayer);
router.get('/duplicate-clusters', optionalAuthenticate, getDuplicateClustersLayer);
router.get('/recurring-zones', optionalAuthenticate, getRecurringZonesLayer);
router.get('/trends', optionalAuthenticate, getTrendsLayer);
router.get('/insights', optionalAuthenticate, getInsightsSummary);

// 3. Boundaries & Jurisdictions
router.get('/wards', optionalAuthenticate, getWardsLayer);
router.get('/zones', optionalAuthenticate, getZonesLayer);
router.get('/departments', optionalAuthenticate, getDepartmentsLayer);

// 4. Admin-Only Operations Coverage
router.get('/officers', authenticate, authorize('admin'), getOfficersCoverageLayer);

module.exports = router;
