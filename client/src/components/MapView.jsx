import React, {
  useEffect, useState, useRef, useCallback, useContext, useMemo
} from 'react'
import { MapContainer, TileLayer, Marker, useMap, Circle, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster/dist/leaflet.markercluster.js'
import 'leaflet.heat'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LocateFixed, Thermometer, X, Search, Loader2, Navigation2,
  AlertCircle, RefreshCw, SlidersHorizontal, MapPin, ChevronDown,
  ArrowRight, Target, Radio
} from 'lucide-react'
import complaintsApi from '../services/complaints'
import maptiler from '../services/maptiler'
import {
  getTileConfig, STATUS_META, PRIORITY_META, CATEGORY_OPTIONS,
  STATUS_OPTIONS, PRIORITY_OPTIONS, RADIUS_OPTIONS,
  DEFAULT_CENTER, DEFAULT_ZOOM, ATTRIBUTION
} from '../config/mapConfig'
import ThemeContext from '../context/ThemeContext'

// ─── Utilities ───────────────────────────────────────────────────────────────

function getStatusMeta(s) {
  return STATUS_META[s] || { label: s || 'Unknown', color: '#64748b', icon: '●' }
}
function getPriorityMeta(p) {
  return PRIORITY_META[p] || { label: p || '', color: '#94a3b8', ring: 0 }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(m) {
  if (m == null) return null
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

// ─── Marker icon factory ──────────────────────────────────────────────────────

function createMarkerIcon(complaint) {
  const sm = getStatusMeta(complaint.status)
  const pm = getPriorityMeta(complaint.priority)
  const size = pm.ring ? 28 + pm.ring : 24
  const html = `
    <div class="cgn-pin" style="width:${size}px;height:${size}px;">
      <div class="cgn-pin-inner" style="background:${sm.color};">
        <span class="cgn-pin-icon">${sm.icon}</span>
      </div>
      ${pm.ring ? `<div class="cgn-pin-ring" style="border:2.5px solid ${pm.color};"></div>` : ''}
    </div>
  `
  return L.divIcon({
    className: 'cgn-marker-icon',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

// ─── Popup HTML ───────────────────────────────────────────────────────────────

function makePopupHtml(m, userLat, userLng) {
  const sm = getStatusMeta(m.status)
  const pm = getPriorityMeta(m.priority)
  const imgUrl = m.image_url || (m.images && m.images[0] && m.images[0].url)
  const date = m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const address = m.address || m.formattedAddress || ''

  // Distance from user location (when available)
  let distStr = ''
  if (userLat != null && userLng != null && m.lat != null && m.lng != null) {
    const km = haversineKm(userLat, userLng, m.lat, m.lng)
    distStr = km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`
  } else if (m.distance != null) {
    distStr = formatDist(m.distance)
  }

  return `
    <div class="cgn-popup">
      ${imgUrl ? `<img class="cgn-pop-img" src="${imgUrl}" alt="" />` : ''}
      <div class="cgn-pop-head">
        <span class="cgn-pop-id">#${m.id}</span>
        <span class="cgn-pop-dot" style="background:${sm.color}"></span>
        <span class="cgn-pop-status">${sm.label}</span>
        ${pm.ring ? `<span class="cgn-pop-pri" style="color:${pm.color}">● ${pm.label}</span>` : ''}
      </div>
      <div class="cgn-pop-title">${m.title || m.summary || 'Complaint #' + m.id}</div>
      ${m.category ? `<div class="cgn-pop-meta">🏷 ${m.category}</div>` : ''}
      ${distStr ? `<div class="cgn-pop-meta">📍 ${distStr}</div>` : ''}
      ${address ? `<div class="cgn-pop-meta" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${address}</div>` : ''}
      ${date ? `<div class="cgn-pop-meta">📅 ${date}</div>` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
        <a class="cgn-pop-btn" href="/complaints/${m.id}">View Report</a>
        ${m.lat != null ? `<a class="cgn-pop-btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}" target="_blank" rel="noreferrer">Directions</a>` : ''}
      </div>
    </div>
  `
}

// ─── Leaflet imperative children ─────────────────────────────────────────────

function MarkerClusterLayer({ markers, userLat, userLng }) {
  const map = useMap()
  const groupRef = useRef(null)
  const supported = typeof L.markerClusterGroup === 'function'

  useEffect(() => {
    if (!map || !supported) return
    if (!groupRef.current) {
      groupRef.current = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        animate: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount()
          const size = count >= 100 ? 46 : count >= 10 ? 38 : 30
          return L.divIcon({
            html: `<div class="cgn-cluster" style="width:${size}px;height:${size}px;font-size:${count>=100?13:count>=10?12:11}px;">${count}</div>`,
            className: 'cgn-cluster-icon',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
          })
        }
      })
      map.addLayer(groupRef.current)
    }
    return () => {
      if (groupRef.current) { map.removeLayer(groupRef.current); groupRef.current = null }
    }
  }, [map, supported])

  useEffect(() => {
    if (!groupRef.current || !supported) return
    const grp = groupRef.current
    grp.clearLayers()
    markers.forEach((m) => {
      const lat = m.lat != null ? m.lat : m.location?.lat
      const lng = m.lng != null ? m.lng : m.location?.lng
      if (lat == null || lng == null) return
      const marker = L.marker([lat, lng], { icon: createMarkerIcon(m) })
      marker.bindPopup(makePopupHtml(m, userLat, userLng), { maxWidth: 260, className: 'cgn-leaflet-popup' })
      grp.addLayer(marker)
    })
  }, [markers, userLat, userLng, supported])

  return null
}

function HeatLayer({ points }) {
  const map = useMap()
  const layerRef = useRef(null)
  const heatPoints = useMemo(
    () => (points || []).filter(p => p.lat != null && p.lng != null).map(p => [p.lat, p.lng, p.count || 1]),
    [points]
  )
  useEffect(() => {
    if (!map) return
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null }
    if (heatPoints.length) {
      layerRef.current = L.heatLayer(heatPoints, {
        radius: 22, blur: 18, maxZoom: 16, minOpacity: 0.25,
        gradient: { 0.2: '#22d3ee', 0.45: '#10b981', 0.65: '#f59e0b', 0.85: '#f97316', 1: '#ef4444' }
      })
      map.addLayer(layerRef.current)
    }
    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null } }
  }, [map, heatPoints])
  return null
}

function BboxTracker({ onBbox }) {
  const map = useMap()
  const timerRef = useRef(null)
  const lastRef = useRef('')

  function emit() {
    const b = map.getBounds()
    const key = [b.getWest().toFixed(3), b.getSouth().toFixed(3), b.getEast().toFixed(3), b.getNorth().toFixed(3)].join(',')
    if (key === lastRef.current) return
    lastRef.current = key
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]), 400)
  }

  useMapEvents({ moveend: emit, zoomend: emit })
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])
  return null
}

function MapRefSetter({ mapRef }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    // Invalidate size once mounted to fix 0px height bug
    requestAnimationFrame(() => map.invalidateSize({ pan: false, animate: false }))
    setTimeout(() => map.invalidateSize({ pan: false, animate: false }), 300)
  }, [map, mapRef])
  return null
}

function FlyToLocation({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target && target.lat != null && target.lng != null) {
      map.flyTo([target.lat, target.lng], Math.max(15, map.getZoom()), { animate: true, duration: 1.2 })
    }
  }, [target, map])
  return null
}

// ─── Nearby complaint list panel ──────────────────────────────────────────────

function NearbyPanel({ complaints, userLat, userLng, loading, onSelect, radiusMeters }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs">Loading nearby reports…</span>
      </div>
    )
  }
  if (!userLat) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-8 px-4 text-center">
        <MapPin className="h-8 w-8 opacity-40" />
        <span className="text-xs font-medium">Enable location to see nearby reports</span>
        <span className="text-xs opacity-60">Click "My Location" to get started</span>
      </div>
    )
  }
  if (!complaints.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-8 px-4 text-center">
        <Target className="h-8 w-8 opacity-40" />
        <span className="text-xs font-medium">No civic complaints reported nearby</span>
        <span className="text-xs opacity-60">Within {(radiusMeters / 1000).toFixed(0)} km of your location</span>
      </div>
    )
  }
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
      {complaints.map((c) => {
        const sm = getStatusMeta(c.status)
        const pm = getPriorityMeta(c.priority)
        const dist = c.distance != null ? formatDist(c.distance) :
          (userLat != null && c.lat != null
            ? formatDist(haversineKm(userLat, userLng, c.lat, c.lng) * 1000)
            : null)
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full text-left px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {c.title || `Complaint #${c.id}`}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {c.category && (
                    <span className="text-[10px] text-slate-400 capitalize">{c.category}</span>
                  )}
                  {pm.label && pm.ring > 0 && (
                    <span className="text-[10px] font-semibold" style={{ color: pm.color }}>● {pm.label}</span>
                  )}
                  {dist && (
                    <span className="text-[10px] text-slate-400">{dist}</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ background: sm.color }}>
                {sm.label}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main MapView ─────────────────────────────────────────────────────────────

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  filters,
  height = 500,
  onLoaded,
  showLegend = true,
  showControls = true,
  showSidebar = false,  // sidebar with nearby panel
  clustered = true,
  showHeatmap = false,
  preview = false,
  onLocationSelect,
  initialRadius = 5000
}) {
  const { dark } = useContext(ThemeContext)
  const [markers, setMarkers] = useState([])
  const [nearbyComplaints, setNearbyComplaints] = useState([])
  const [heatPoints, setHeatPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tileError, setTileError] = useState(false)
  const [userLocation, setUserLocation] = useState(null)   // [lat, lng]
  const [accuracy, setAccuracy] = useState(null)
  const [locStatus, setLocStatus] = useState('idle')       // idle|locating|done|denied|error
  const [locAddress, setLocAddress] = useState('')
  const [bbox, setBbox] = useState(null)
  const [heatOn, setHeatOn] = useState(showHeatmap)
  const [viewMode, setViewMode] = useState('markers')      // markers|heatmap
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchStatus, setSearchStatus] = useState('idle') // idle|loading|done|empty|error
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const [radius, setRadius] = useState(initialRadius)
  const [activeFilters, setActiveFilters] = useState(filters || {})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const mapRef = useRef(null)
  const searchAbortRef = useRef(null)
  const bboxAbortRef = useRef(null)
  const loadingRef = useRef(false)

  // Sync external filters prop
  useEffect(() => {
    setActiveFilters(filters || {})
  }, [filters])

  // Tile config
  const tileConfig = useMemo(() => getTileConfig(dark), [dark])

  // Invalidate map on resize/prop changes
  const invalidate = useCallback(() => {
    if (!mapRef.current) return
    requestAnimationFrame(() => mapRef.current?.invalidateSize({ pan: false, animate: false }))
  }, [])

  useEffect(() => {
    invalidate()
    const t = setTimeout(invalidate, 300)
    return () => clearTimeout(t)
  }, [height, dark, preview, showControls, showSidebar, invalidate])

  useEffect(() => {
    if (!mapRef.current || typeof ResizeObserver === 'undefined') return
    const container = mapRef.current.getContainer?.()
    if (!container) return
    const obs = new ResizeObserver(invalidate)
    obs.observe(container)
    return () => obs.disconnect()
  }, [invalidate])

  // Load markers for current bbox
  const loadBboxMarkers = useCallback(async (b) => {
    if (!b || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    if (bboxAbortRef.current) bboxAbortRef.current.abort()
    const ctrl = new AbortController()
    bboxAbortRef.current = ctrl
    try {
      const params = {
        minLng: b[0], minLat: b[1], maxLng: b[2], maxLat: b[3],
        limit: 500, offset: 0,
        ...activeFilters
      }
      const items = await complaintsApi.bboxQuery(params)
      if (ctrl.signal.aborted) return
      setMarkers(Array.isArray(items) ? items : [])
      if (onLoaded) onLoaded(Array.isArray(items) ? items.length : 0)
    } catch (e) {
      if (!e?.name?.includes('Abort')) setError('Unable to load civic reports.')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [activeFilters, onLoaded])

  useEffect(() => {
    if (bbox) loadBboxMarkers(bbox)
  }, [bbox, activeFilters, loadBboxMarkers])

  // Load heatmap
  const loadHeat = useCallback(async () => {
    if (!mapRef.current || !heatOn) { setHeatPoints([]); return }
    const b = mapRef.current.getBounds()
    try {
      const rows = await complaintsApi.heatmap({
        minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth(),
        zoom: mapRef.current.getZoom(), ...activeFilters
      })
      setHeatPoints(Array.isArray(rows) ? rows : [])
    } catch { setHeatPoints([]) }
  }, [heatOn, activeFilters])

  useEffect(() => { loadHeat() }, [loadHeat, bbox])

  // Load nearby complaints using PostGIS
  const loadNearby = useCallback(async (lat, lng, r) => {
    if (!lat || !lng) return
    setNearbyLoading(true)
    try {
      const rows = await complaintsApi.nearby({ lat, lng, radius: r || radius, limit: 30 })
      setNearbyComplaints(Array.isArray(rows) ? rows : [])
    } catch { setNearbyComplaints([]) }
    finally { setNearbyLoading(false) }
  }, [radius])

  useEffect(() => {
    if (userLocation) loadNearby(userLocation[0], userLocation[1], radius)
  }, [userLocation, radius, loadNearby])

  // Geolocation
  function locateMe() {
    if (!navigator.geolocation) { setLocStatus('error'); return }
    setLocStatus('locating')
    setUserLocation(null)
    setLocAddress('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = pos.coords.accuracy
        setUserLocation([lat, lng])
        setAccuracy(acc || null)
        setLocStatus('done')
        setFlyTarget({ lat, lng })
        // Reverse geocode (best-effort)
        try {
          const r = await maptiler.reverseGeocode(lat, lng)
          if (r.status === 'ok' && r.result) setLocAddress(r.result.formatted || '')
        } catch {}
        if (onLocationSelect) onLocationSelect({ lat, lng })
      },
      (err) => {
        setLocStatus(err && err.code === 1 ? 'denied' : 'error')
        setUserLocation(null)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  // Debounced search using MapTiler
  useEffect(() => {
    if (!searchTerm || !searchTerm.trim()) {
      setSearchResults([])
      setSearchStatus('idle')
      return
    }
    setSearchStatus('loading')
    if (searchAbortRef.current) searchAbortRef.current.abort()
    const ctrl = new AbortController()
    searchAbortRef.current = ctrl
    const t = setTimeout(async () => {
      const r = await maptiler.searchPlaces(searchTerm.trim(), { signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      setSearchStatus(r.status === 'ok' ? (r.results.length ? 'done' : 'empty') : 'error')
      setSearchResults(r.results || [])
    }, 450)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [searchTerm])

  function selectSearchResult(r) {
    if (!r || r.lat == null || r.lng == null) return
    setSelectedLocation({ lat: r.lat, lng: r.lng, formatted: r.formatted })
    setSearchTerm(r.formatted || '')
    setSearchResults([])
    setSearchOpen(false)
    setFlyTarget({ lat: r.lat, lng: r.lng })
    if (onLocationSelect) onLocationSelect({ lat: r.lat, lng: r.lng, formatted: r.formatted })
  }

  function handleNearbySelect(c) {
    if (c.lat == null || c.lng == null) return
    setFlyTarget({ lat: c.lat, lng: c.lng })
  }

  function resetLocation() {
    setSelectedLocation(null)
    setUserLocation(null)
    setAccuracy(null)
    setLocStatus('idle')
    setLocAddress('')
    if (onLocationSelect) onLocationSelect(null)
  }

  const hasActiveFilters = Object.values(activeFilters).some(Boolean)
  const locStatusIcon = {
    idle: <Navigation2 className="h-4 w-4" />,
    locating: <Loader2 className="h-4 w-4 animate-spin" />,
    done: <LocateFixed className="h-4 w-4 text-emerald-500" />,
    denied: <AlertCircle className="h-4 w-4 text-red-400" />,
    error: <AlertCircle className="h-4 w-4 text-amber-400" />
  }[locStatus] || <Navigation2 className="h-4 w-4" />

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative flex gap-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg`}
      style={{ height, minHeight: preview ? 280 : 400 }}
    >
      {/* ── Map area ── */}
      <div className="relative flex-1 min-w-0">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={!preview}
        >
          <MapRefSetter mapRef={mapRef} />
          <BboxTracker onBbox={setBbox} />
          {flyTarget && <FlyToLocation target={flyTarget} key={`${flyTarget.lat},${flyTarget.lng}`} />}

          <TileLayer
            key={dark ? 'dark' : 'light'}
            url={tileError ? tileConfig.fallback : tileConfig.url}
            attribution={tileConfig.attribution}
            maxZoom={tileConfig.maxZoom}
            eventHandlers={{
              load: () => setTileError(false),
              tileerror: () => setTileError(true)
            }}
          />

          {/* Complaint markers */}
          {viewMode === 'markers' && clustered && (
            <MarkerClusterLayer
              markers={markers}
              userLat={userLocation?.[0]}
              userLng={userLocation?.[1]}
            />
          )}

          {viewMode === 'markers' && !clustered && markers.map((m) => {
            const lat = m.lat ?? m.location?.lat
            const lng = m.lng ?? m.location?.lng
            if (lat == null || lng == null) return null
            return (
              <Marker key={m.id} position={[lat, lng]} icon={createMarkerIcon(m)}>
                <Popup maxWidth={260} className="cgn-leaflet-popup">
                  <div dangerouslySetInnerHTML={{ __html: makePopupHtml(m, userLocation?.[0], userLocation?.[1]) }} />
                </Popup>
              </Marker>
            )
          })}

          {/* User location */}
          {userLocation && (
            <>
              <Circle
                center={userLocation}
                radius={accuracy || 50}
                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1, weight: 2, dashArray: '4 4' }}
              />
              <Marker
                position={userLocation}
                icon={L.divIcon({
                  className: 'cgn-loc-icon',
                  html: '<div class="cgn-loc-dot"></div>',
                  iconSize: [18, 18], iconAnchor: [9, 9]
                })}
              >
                <Popup>
                  <div style={{ minWidth: 140, fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#10b981', marginBottom: 2 }}>📍 Your Location</div>
                    {locAddress && <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>{locAddress}</div>}
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}</div>
                    {accuracy && <div style={{ fontSize: 10, color: '#94a3b8' }}>Accuracy: ±{Math.round(accuracy)} m</div>}
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Selected location (from search) */}
          {selectedLocation && (
            <Marker
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={L.divIcon({
                className: 'cgn-marker-icon',
                html: '<div class="cgn-pin cgn-pin-selected"><div class="cgn-pin-inner" style="background:#6366f1;"><span class="cgn-pin-icon">📍</span></div></div>',
                iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
              })}
            >
              {selectedLocation.formatted && <Popup>{selectedLocation.formatted}</Popup>}
            </Marker>
          )}

          {/* Heatmap */}
          {viewMode === 'heatmap' && <HeatLayer points={heatPoints} />}
        </MapContainer>

        {/* ── Loading indicator (slim bar at top, NOT a full overlay) ── */}
        {loading && (
          <div className="absolute top-0 left-0 right-0 z-[900] h-1 overflow-hidden">
            <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '60%', animation: 'cgn-progress 1.5s ease-in-out infinite' }} />
          </div>
        )}

        {/* ── Tile error banner ── */}
        {tileError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[900]">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 shadow dark:bg-amber-900/40 dark:text-amber-300">
              <AlertCircle className="h-3.5 w-3.5" />
              Using OpenStreetMap fallback
            </div>
          </div>
        )}

        {/* ── Map content error ── */}
        {error && !loading && (
          <div className="absolute bottom-16 left-3 z-[900]">
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-600 shadow dark:bg-red-900/40 dark:text-red-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
              <button onClick={() => bbox && loadBboxMarkers(bbox)} className="ml-1 underline">Retry</button>
            </div>
          </div>
        )}

        {/* ── Controls overlay ── */}
        {showControls && (
          <>
            {/* Search bar — top left */}
            <div className="absolute left-3 top-3 z-[900] w-full max-w-[280px] sm:max-w-[320px]">
              <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 shadow-lg">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSearchOpen(true) }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
                  placeholder="Search city, area, landmark…"
                  aria-label="Search location"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(''); setSearchResults([]); setSearchStatus('idle') }} aria-label="Clear">
                    <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              <AnimatePresence>
                {searchOpen && searchTerm && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    {searchStatus === 'loading' && (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                      </div>
                    )}
                    {searchStatus === 'empty' && (
                      <div className="px-3 py-2.5 text-xs text-slate-400">No results found</div>
                    )}
                    {searchStatus === 'error' && (
                      <div className="px-3 py-2.5 text-xs text-red-500">Search unavailable</div>
                    )}
                    {(searchResults || []).map((r, i) => (
                      <button
                        key={i}
                        onMouseDown={() => selectSearchResult(r)}
                        className="block w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                          <span className="truncate">{r.formatted}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom-left controls */}
            {!preview && (
              <div className="absolute bottom-6 left-3 z-[900] flex flex-col gap-2">
                {/* Locate me */}
                <button
                  onClick={locateMe}
                  disabled={locStatus === 'locating'}
                  aria-label="Use my location"
                  title="Use my location"
                  className="glass flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform hover:scale-105 disabled:opacity-60 text-slate-700 dark:text-slate-200"
                >
                  {locStatusIcon}
                </button>

                {/* Toggle heatmap/markers */}
                <button
                  onClick={() => setViewMode(v => v === 'heatmap' ? 'markers' : 'heatmap')}
                  aria-label="Toggle heatmap"
                  title={viewMode === 'heatmap' ? 'Show markers' : 'Show heatmap'}
                  className={`glass flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform hover:scale-105 ${viewMode === 'heatmap' ? 'text-orange-500' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  <Thermometer className="h-5 w-5" />
                </button>

                {/* Reset */}
                {(userLocation || selectedLocation) && (
                  <button
                    onClick={resetLocation}
                    aria-label="Reset location"
                    title="Reset location"
                    className="glass flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform hover:scale-105 text-slate-700 dark:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Radius selector — bottom center */}
            {!preview && userLocation && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[900]">
                <div className="glass flex items-center gap-1 rounded-xl px-2 py-1.5 shadow-lg text-xs">
                  <Radio className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-slate-500 dark:text-slate-400 mr-1">Nearby:</span>
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRadius(opt.value)}
                      className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                        radius === opt.value
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Marker count badge — top right */}
            {!preview && markers.length > 0 && (
              <div className="absolute right-3 top-3 z-[900]">
                <div className="glass rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-lg">
                  {markers.length} reports in view
                </div>
              </div>
            )}
          </>
        )}

        {/* Location status messages */}
        {locStatus === 'denied' && (
          <div className="absolute bottom-20 right-3 z-[900] rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-600 shadow dark:bg-red-900/40 dark:text-red-300">
            📵 Location permission denied. Search manually.
          </div>
        )}
        {locStatus === 'error' && (
          <div className="absolute bottom-20 right-3 z-[900] rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 shadow dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            Could not get your location.
            <button onClick={locateMe} className="underline font-semibold">Retry</button>
          </div>
        )}

        {/* Location accuracy label */}
        {locStatus === 'done' && accuracy && !preview && (
          <div className="absolute left-3 bottom-20 z-[900]">
            <div className="glass rounded-xl px-2.5 py-1.5 text-[10px] text-slate-500 dark:text-slate-400 shadow">
              <span className="font-semibold text-emerald-600">◎ You are here</span>
              {locAddress && <span className="ml-1 truncate max-w-[160px] inline-block align-bottom"> · {locAddress.split(',')[0]}</span>}
              {' '}<span className="opacity-60">±{Math.round(accuracy)}m</span>
            </div>
          </div>
        )}

        {/* Legend */}
        {showLegend && !preview && markers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 right-3 z-[900] pointer-events-none"
          >
            <div className="glass rounded-xl p-3 shadow-lg text-[10px]">
              <div className="mb-1.5 font-bold uppercase tracking-widest text-slate-400">Status</div>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 mb-1 text-slate-600 dark:text-slate-300">
                  <span className="cgn-legend-dot" style={{ background: v.color }} />
                  {v.label}
                </div>
              ))}
              <div className="mt-2 mb-1.5 font-bold uppercase tracking-widest text-slate-400">You</div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="cgn-loc-dot" style={{ width: 8, height: 8, display: 'inline-block', borderRadius: '50%', background: '#10b981', border: '1.5px solid white', boxShadow: '0 0 0 2px rgba(16,185,129,0.3)' }} />
                Your location
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Sidebar / nearby panel ── */}
      {showSidebar && !preview && (
        <div className="w-72 shrink-0 flex flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Nearby Reports</div>
              {userLocation && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {nearbyComplaints.length} within {(radius / 1000).toFixed(0)} km
                </div>
              )}
            </div>
            {userLocation && (
              <button
                onClick={() => loadNearby(userLocation[0], userLocation[1], radius)}
                disabled={nearbyLoading}
                aria-label="Refresh nearby"
                className="text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${nearbyLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <NearbyPanel
              complaints={nearbyComplaints}
              userLat={userLocation?.[0]}
              userLng={userLocation?.[1]}
              loading={nearbyLoading}
              onSelect={handleNearbySelect}
              radiusMeters={radius}
            />
          </div>
          {/* Locate me shortcut */}
          {locStatus !== 'done' && (
            <div className="shrink-0 p-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={locateMe}
                disabled={locStatus === 'locating'}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 transition-colors disabled:opacity-60"
              >
                {locStatus === 'locating' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                {locStatus === 'locating' ? 'Locating…' : 'Use My Location'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
