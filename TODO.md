# Civic GreenNet — Geoapify Map Integration

## Implementation Plan

- [x] 0. Inspect existing map architecture (MapView, MapPicker, MapPage, services, backend bbox/heatmap/nearby)
- [x] 1. Get plan approved
- [x] 2. Create client/src/config/mapConfig.js (Geoapify tiles, light/dark, attribution)
- [x] 3. Create client/src/services/geoapify.js (forward/reverse geocoding, caching, debounce, errors)
- [x] 4. Add VITE_GEOAPIFY_API_KEY to client/.env and client/.env.example
- [x] 5. Ensure .env git-ignored (root .gitignore)
- [x] 6. Rewrite client/src/components/MapView.jsx (Geoapify tiles, clustering, heatmap, premium popups, filters, locate, graceful fallback)
- [x] 7. Rewrite client/src/components/MapPicker.jsx (click/drag/current-location/search/reverse-geocode/reset)
- [x] 8. Upgrade client/src/pages/MapPage.jsx (responsive filters, search, locate, heatmap, legend)
- [x] 9. Add dashboard map preview (client/src/pages/Dashboard.jsx)
- [x] 10. Add admin map view (client/src/pages/AdminPortal.jsx)
- [x] 11. Add officer map view (client/src/pages/OfficerPortal.jsx)
- [x] 12. Backend: forward status/category/priority filters through bbox controller
- [x] 13. Add map/cluster/heatmap/legend styles to client/src/styles/index.css
- [x] 14. Run server tests (cd server && npm test) — 3 suites / 7 tests passed
- [x] 15. Run client build (cd client && npm run build) — passed (1730 modules, 18.07s)
- [x] 16. Security scan client/dist for server secrets — clean
- [x] 17. Final verification report + git diff cleanup

## Signup Bug Fix (URGENT)

- [x] 18. Root cause: Input component did not forward react-hook-form `register().ref` (wrapped in `forwardRef`)
- [x] 19. Root cause: Backend signup crashed (HTTP 500) when SMTP verification email failed (Gmail 550 daily limit) — user was persisted but response was blocked
- [x] 20. Fix client/src/ui/Input.jsx via React.forwardRef so RHF reads typed values for validation
- [x] 21. Fix server/controllers/authController.js — wrap verification email send in try/catch (best-effort, non-blocking)
- [x] 22. Restarted backend on port 5000 with fix
- [x] 23. Verified signup no longer 500 (duplicate email now returns 409 "Email already in use")
- [x] 24. Verified user persisted in real Neon DB (login returns 200 + valid JWT, userId 29, role citizen)
- [x] 25. Backend tests re-verified — 3 suites / 7 tests passed
- [x] 26. Client build re-verified — passed (7.63s, 1730 modules)
- [x] 27. Security scan client/dist — SECURITY_SCAN_CLEAN (no server secrets)
