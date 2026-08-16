const express = require('express');
const router = express.Router();
const publicCtl = require('../controllers/publicController');

// Standard public metadata
router.get('/departments', publicCtl.getDepartments);
router.get('/municipalities', publicCtl.getMunicipalities);
router.get('/municipalities/:municipalityId/zones', publicCtl.getZones);
router.get('/zones/:zoneId/wards', publicCtl.getWards);
router.get('/designations', publicCtl.getDesignations);

// Public live civic technology endpoints
router.get('/public/stats', publicCtl.getPublicStats);
router.get('/public/activity', publicCtl.getPublicActivity);
router.get('/public/recent', publicCtl.getPublicRecent);
router.get('/public/map', publicCtl.getPublicMap);
router.get('/public/categories', publicCtl.getPublicCategories);
router.get('/public/impact', publicCtl.getPublicImpact);

module.exports = router;
