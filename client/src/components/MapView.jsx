import React, {
  useEffect, useState, useRef, useCallback, useContext, useMemo
} from 'react'
import { MapContainer, TileLayer, Marker, useMap, Circle, Popup, GeoJSON, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

if (typeof window !== 'undefined' && !window.L) {
  window.L = L
}

import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster/dist/leaflet.markercluster.js'
import 'leaflet.heat'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  LocateFixed, Thermometer, X, Search, Loader2, Navigation2,
  AlertCircle, RefreshCw, SlidersHorizontal, MapPin, ChevronDown,
  ArrowRight, Target, Radio, Layers, Flame, Clock, Sparkles,
  Repeat, ShieldCheck, Building2, User, ExternalLink, CheckCircle2,
  AlertTriangle, Filter
} from 'lucide-react'
import mapsApi from '../services/maps'
import complaintsApi from '../services/complaints'
import maptiler from '../services/maptiler'
import {
  getTileConfig, STATUS_META, PRIORITY_META, CATEGORY_OPTIONS,
  STATUS_OPTIONS, PRIORITY_OPTIONS, RADIUS_OPTIONS, TIME_OPTIONS,
  GIS_LAYERS, SLA_RISK_META, HOTSPOT_LEVEL_META,
  DEFAULT_CENTER, DEFAULT_ZOOM, ATTRIBUTION
} from '../config/mapConfig'
import ThemeContext from '../context/ThemeContext'
import AuthContext from '../context/AuthContext'
import { useRealtime } from '../context/RealtimeContext'

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
  const isOverdue = complaint.slaStatus === 'overdue' || complaint.sla_status === 'overdue'
  const size = pm.ring ? 28 + pm.ring : 24
  
  const html = `
    <div class="cgn-pin ${isOverdue ? 'cgn-pin-overdue' : ''}" style="width:${size}px;height:${size}px;">
      <div class="cgn-pin-inner" style="background:${sm.color};">
        <span class="cgn-pin-icon">${sm.icon}</span>
      </div>
      ${pm.ring ? `<div class="cgn-pin-ring" style="border:2.5px solid ${pm.color};"></div>` : ''}
      ${isOverdue ? `<div class="cgn-overdue-halo"></div>` : ''}
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

// ─── Sla Risk Pin Factory ────────────────────────────────────────────────────
function createSlaRiskIcon(tier) {
  const meta = SLA_RISK_META[tier] || SLA_RISK_META.on_time
  const html = `
    <div class="cgn-sla-pin" style="background:${meta.color}; width:24px; height:24px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
      <span style="font-size:10px; color:white; font-weight:bold;">${tier === 'overdue' ? '!' : tier === 'due_soon' ? '⏱' : '✓'}</span>
    </div>
  `
  return L.divIcon({
    className: 'cgn-sla-marker',
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

// ─── Popup HTML for Leaflet ──────────────────────────────────────────────────

function makePopupHtml(m, userLat, userLng) {
  const sm = getStatusMeta(m.status)
  const pm = getPriorityMeta(m.priority)
  const imgUrl = m.image_url || m.imageUrl || (m.images && m.images[0] && m.images[0].url)
  const date = m.created_at || m.createdAt ? new Date(m.created_at || m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const address = m.address || m.formattedAddress || 'Municipal Area'
  const isOverdue = m.slaStatus === 'overdue' || m.sla_status === 'overdue'

  let distStr = ''
  if (userLat != null && userLng != null && m.lat != null && m.lng != null) {
    const km = haversineKm(userLat, userLng, m.lat, m.lng)
    distStr = km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`
  } else if (m.distanceFormatted) {
    distStr = m.distanceFormatted
  }

  return `
    <div class="cgn-popup">
      ${imgUrl ? `<img class="cgn-pop-img" src="${imgUrl}" alt="" />` : ''}
      <div class="cgn-pop-head">
        <span class="cgn-pop-id">#${m.id || m.ticketId}</span>
        <span class="cgn-pop-dot" style="background:${sm.color}"></span>
        <span class="cgn-pop-status">${sm.label}</span>
        ${pm.ring ? `<span class="cgn-pop-pri" style="color:${pm.color}">● ${pm.label}</span>` : ''}
      </div>
      <div class="cgn-pop-title">${m.title || m.summary || 'Complaint #' + m.id}</div>
      ${m.category ? `<div class="cgn-pop-meta">🏷 ${m.category}</div>` : ''}
      ${isOverdue ? `<div class="cgn-pop-meta" style="color:#ef4444; font-weight:bold;">⏱ SLA Overdue</div>` : ''}
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

// ─── Leaflet Imperative Sub-Layers ──────────────────────────────────────────

function MarkerClusterLayer({ markers, userLat, userLng, onSelectComplaint }) {
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
      if (onSelectComplaint) {
        marker.on('click', () => onSelectComplaint(m))
      }
      grp.addLayer(marker)
    })
  }, [markers, userLat, userLng, supported, onSelectComplaint])

  return null
}

function HeatLayer({ points }) {
  const map = useMap()
  const layerRef = useRef(null)
  
  const heatPoints = useMemo(() => {
    if (!points) return []
    return points.map(p => {
      if (Array.isArray(p)) return p
      return [p.lat, p.lng, p.count || p.weight || 0.6]
    }).filter(p => p[0] != null && p[1] != null)
  }, [points])

  useEffect(() => {
    if (!map || typeof L.heatLayer !== 'function') return
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null }
    if (heatPoints.length) {
      layerRef.current = L.heatLayer(heatPoints, {
        radius: 24, blur: 18, maxZoom: 16, minOpacity: 0.25,
        gradient: { 0.2: '#22d3ee', 0.45: '#10b981', 0.65: '#f59e0b', 0.85: '#f97316', 1: '#ef4444' }
      })
      map.addLayer(layerRef.current)
    }
    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null } }
  }, [map, heatPoints])

  return null
}

function MapPanController({ targetCenter, targetZoom }) {
  const map = useMap()
  useEffect(() => {
    if (targetCenter && targetCenter[0] && targetCenter[1]) {
      map.flyTo(targetCenter, targetZoom || map.getZoom(), { duration: 1.2 })
    }
  }, [map, targetCenter, targetZoom])
  return null
}

function BboxTracker({ onBbox, onZoomChange }) {
  const map = useMap()
  const timerRef = useRef(null)
  const lastRef = useRef('')

  const emit = useCallback(() => {
    try {
      const b = map.getBounds()
      const z = map.getZoom()
      if (!b || !b.isValid()) return
      if (onZoomChange) onZoomChange(z)
      const key = [b.getWest().toFixed(3), b.getSouth().toFixed(3), b.getEast().toFixed(3), b.getNorth().toFixed(3)].join(',')
      if (key === lastRef.current) return
      lastRef.current = key
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], z), 150)
    } catch (e) {}
  }, [map, onBbox, onZoomChange])

  useMapEvents({ moveend: emit, zoomend: emit })

  useEffect(() => {
    emit()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [emit])

  return null
}

// ─── Main MapView Component ──────────────────────────────────────────────────

export default function MapView({
  height = 560,
  initialCenter = [30.7333, 76.7794], // Chandigarh Default
  initialZoom = 12,
  filters = {},
  userRole = 'citizen',
  showAdminDrawer = true,
  onComplaintClick = null,
  onStatsChange = null
}) {
  const { dark } = useContext(ThemeContext)
  const { user } = useContext(AuthContext)
  const { subscribe: realtimeSubscribe } = useRealtime()
  const isDark = Boolean(dark)
  const role = user?.role || userRole || 'citizen'
  const isAdminOrOfficer = role === 'admin' || role === 'officer'

  // Map and layer states
  const [activeLayers, setActiveLayers] = useState({
    complaints: true,
    heatmap: false,
    hotspots: true,
    slaRisk: false,
    duplicateClusters: false,
    recurringZones: false,
    wards: true,
    departments: false
  })

  const [currentZoom, setCurrentZoom] = useState(initialZoom)
  const [bbox, setBbox] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [heatmapPoints, setHeatmapPoints] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [slaRiskData, setSlaRiskData] = useState({ overdue: [], dueSoon: [], onTime: [], summary: {} })
  const [duplicateClusters, setDuplicateClusters] = useState([])
  const [recurringZones, setRecurringZones] = useState([])
  const [wards, setWards] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)

  // Drawer / Selection
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [selectedHotspot, setSelectedHotspot] = useState(null)
  const [selectedWard, setSelectedWard] = useState(null)
  const [panTarget, setPanTarget] = useState(null)

  // Search & Geolocation
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)

  // 1. Fetch Wards & Static Layers on Mount
  useEffect(() => {
    let unmounted = false
    async function loadStaticLayers() {
      try {
        const [wRes, dRes] = await Promise.all([
          mapsApi.getWards(),
          mapsApi.getDepartments()
        ])
        if (!unmounted) {
          setWards(wRes)
          setDepartments(dRes)
        }
      } catch (err) {
        console.warn('Failed to load static GIS layers:', err)
      }
    }
    loadStaticLayers()
    return () => { unmounted = true }
  }, [])

  // 2. Fetch Bounding-Box Dynamic Data
  const loadMapData = useCallback(async (currentBbox, zoomLevel) => {
    if (!currentBbox || currentBbox.length < 4) return
    setLoading(true)
    try {
      const [minLng, minLat, maxLng, maxLat] = currentBbox
      const queryParams = {
        minLng, minLat, maxLng, maxLat,
        zoom: zoomLevel,
        ...filters
      }

      // Parallel fetch based on active layers
      const promises = []

      // Layer 1: Complaints
      if (activeLayers.complaints) {
        promises.push(mapsApi.getComplaintsInBbox(queryParams).then(res => setComplaints(res)))
      }

      // Layer 2: Heatmap
      if (activeLayers.heatmap) {
        promises.push(mapsApi.getHeatmap(queryParams).then(res => setHeatmapPoints(res)))
      }

      // Layer 3: Hotspots
      if (activeLayers.hotspots) {
        promises.push(mapsApi.getHotspots({ days: filters.timeframe === '7d' ? 7 : 30 }).then(res => setHotspots(res)))
      }

      // Layer 4: SLA Risk
      if (activeLayers.slaRisk) {
        promises.push(mapsApi.getSlaRisk(queryParams).then(res => setSlaRiskData(res)))
      }

      // Layer 5: Duplicate Clusters
      if (activeLayers.duplicateClusters) {
        promises.push(mapsApi.getDuplicateClusters().then(res => setDuplicateClusters(res)))
      }

      // Layer 6: Recurring Zones
      if (activeLayers.recurringZones) {
        promises.push(mapsApi.getRecurringZones().then(res => setRecurringZones(res)))
      }

      await Promise.all(promises)
    } catch (err) {
      console.error('Error fetching GIS map data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeLayers, filters])

  // Reload when bbox or filters change
  useEffect(() => {
    if (bbox) {
      loadMapData(bbox, currentZoom)
    }
  }, [bbox, currentZoom, loadMapData])

  // 3. Real-Time Sync via RealtimeContext (single managed SSE connection)
  const bboxRef = useRef(bbox)
  const zoomRef = useRef(currentZoom)
  bboxRef.current = bbox
  zoomRef.current = currentZoom

  useEffect(() => {
    const unsubCreate = realtimeSubscribe('COMPLAINT_CREATED', () => {
      if (bboxRef.current) loadMapData(bboxRef.current, zoomRef.current)
    })
    const unsubUpdate = realtimeSubscribe('COMPLAINT_STATUS_UPDATED', () => {
      if (bboxRef.current) loadMapData(bboxRef.current, zoomRef.current)
    })
    return () => {
      unsubCreate()
      unsubUpdate()
    }
  }, [realtimeSubscribe, loadMapData])

  // 4. Geolocation handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setPanTarget([latitude, longitude])
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // 5. Search handler
  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    // Check if searching for a ward
    const wardMatch = wards.find(w => w.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    if (wardMatch && wardMatch.geojson?.coordinates) {
      const coords = wardMatch.geojson.coordinates[0][0]
      setPanTarget([coords[1], coords[0]])
      setSelectedWard(wardMatch)
      return
    }

    // Check if searching for complaint in current list
    const compMatch = complaints.find(c =>
      String(c.id) === searchQuery.trim() ||
      c.ticketId?.toLowerCase() === searchQuery.trim().toLowerCase() ||
      c.title?.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    if (compMatch && compMatch.lat && compMatch.lng) {
      setPanTarget([compMatch.lat, compMatch.lng])
      setSelectedComplaint(compMatch)
      return
    }
  }

  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }

  const tileConfig = getTileConfig(isDark)

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-900" style={{ height }}>
      {/* ── Top GIS Command Toolbar ────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="pointer-events-auto flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 p-1 px-3 w-full max-w-sm sm:max-w-md">
          <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Ticket ID (CGN-00123), Ward, Area..."
            className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none py-1.5"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 text-emerald-500 animate-spin shrink-0" />
          ) : (
            <button type="submit" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 hover:underline">
              Go
            </button>
          )}
        </form>

        {/* Action Buttons & Layer Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Locate Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            title="Locate Me"
            className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-700 dark:text-slate-200 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <LocateFixed className={`h-4 w-4 text-emerald-600 dark:text-emerald-400 ${locating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs font-bold">Around Me</span>
          </button>

          {/* Layer Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLayerMenuOpen(!layerMenuOpen)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-2xl shadow-lg transition-all cursor-pointer text-xs font-bold"
            >
              <Layers className="h-4 w-4" />
              <span>GIS Layers</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {layerMenuOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white dark:bg-[#0E1B2E] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-1 z-[1100] text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-slate-800 dark:text-white px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <span>MUNICIPAL LAYERS</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">PostGIS Active</span>
                </div>
                {GIS_LAYERS.map((layer) => {
                  const isActive = activeLayers[layer.key]
                  return (
                    <button
                      key={layer.key}
                      type="button"
                      onClick={() => toggleLayer(layer.key)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors text-left ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{layer.icon}</span>
                        <span>{layer.label}</span>
                      </span>
                      <span className={`h-3 w-3 rounded-md border flex items-center justify-center ${isActive ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                        {isActive && '✓'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Leaflet Interactive Map ────────────────────────────────────────── */}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
        />

        <BboxTracker
          onBbox={(newBbox, zoom) => {
            setBbox(newBbox)
            setCurrentZoom(zoom)
          }}
          onZoomChange={(zoom) => setCurrentZoom(zoom)}
        />

        <MapPanController targetCenter={panTarget} />

        {/* User Location Marker */}
        {userLocation && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={filters.radius || 1000}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.15 }}
          >
            <Popup className="cgn-leaflet-popup">
              <div className="p-2 text-xs font-bold text-slate-800">
                📍 You are here
              </div>
            </Popup>
          </Circle>
        )}

        {/* LAYER 1: Ward Boundaries */}
        {activeLayers.wards && wards.map((w) => {
          if (!w.geojson) return null
          return (
            <GeoJSON
              key={`ward-${w.id}`}
              data={w.geojson}
              style={{
                color: '#3b82f6',
                weight: 2,
                opacity: 0.7,
                fillColor: '#3b82f6',
                fillOpacity: 0.08
              }}
              eventHandlers={{
                click: () => setSelectedWard(w)
              }}
            />
          )
        })}

        {/* LAYER 2: AI Hotspots */}
        {activeLayers.hotspots && hotspots.map((hs) => {
          const meta = HOTSPOT_LEVEL_META[hs.riskLevel] || HOTSPOT_LEVEL_META.normal
          return (
            <Circle
              key={`hs-${hs.id}`}
              center={[hs.lat, hs.lng]}
              radius={hs.radiusMeters || 600}
              pathOptions={{
                color: meta.border,
                fillColor: meta.color,
                fillOpacity: 0.25,
                weight: 2.5
              }}
              eventHandlers={{
                click: () => setSelectedHotspot(hs)
              }}
            >
              <Popup className="cgn-leaflet-popup">
                <div className="p-2 text-xs space-y-1.5">
                  <div className="font-black text-slate-900 flex items-center justify-between">
                    <span>{hs.status}</span>
                    <span className="text-rose-600 font-black">{hs.trendDisplay}</span>
                  </div>
                  <div className="text-slate-600 font-semibold">{hs.name}</div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 p-1.5 rounded-lg">
                    <div>Reports: <strong>{hs.totalReports}</strong></div>
                    <div>Unresolved: <strong className="text-amber-600">{hs.unresolvedCount}</strong></div>
                    <div>SLA Breaches: <strong className="text-rose-600">{hs.slaBreaches}</strong></div>
                    <div>Trend: <strong>{hs.trendPercentage}%</strong></div>
                  </div>
                </div>
              </Popup>
            </Circle>
          )
        })}

        {/* LAYER 3: Density Heatmap */}
        {activeLayers.heatmap && (
          <HeatLayer points={heatmapPoints} />
        )}

        {/* LAYER 4: Complaints Pins / Marker Clustering */}
        {activeLayers.complaints && (
          <MarkerClusterLayer
            markers={complaints}
            userLat={userLocation?.lat}
            userLng={userLocation?.lng}
            onSelectComplaint={(c) => {
              setSelectedComplaint(c)
              if (onComplaintClick) onComplaintClick(c)
            }}
          />
        )}

        {/* LAYER 5: SLA Risk Markers */}
        {activeLayers.slaRisk && (
          <>
            {slaRiskData.overdue.map(item => (
              <Marker
                key={`sla-od-${item.id}`}
                position={[item.lat, item.lng]}
                icon={createSlaRiskIcon('overdue')}
              >
                <Popup className="cgn-leaflet-popup">
                  <div className="p-2 text-xs">
                    <span className="font-bold text-rose-600">🔴 SLA Overdue</span>
                    <div className="font-bold text-slate-800 mt-1">{item.title}</div>
                    <div className="text-[11px] text-slate-500">{item.departmentName}</div>
                    <a href={`/complaints/${item.id}`} className="mt-2 inline-block text-[11px] font-bold text-emerald-600">View Ticket →</a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}
      </MapContainer>

      {/* ── Floating Legend ────────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 p-2.5 text-[11px] hidden sm:block">
        <div className="font-bold text-slate-800 dark:text-white mb-1">GIS LEGEND</div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Open</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> In Progress</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Resolved</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Overdue</span>
          <span className="flex items-center gap-1"><span className="text-orange-500 font-bold">🔥</span> Hotspot</span>
        </div>
      </div>

      {/* ── Slide-Over Complaint Drawer (Admin / GIS Command) ────────────────── */}
      <AnimatePresence>
        {selectedComplaint && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-white dark:bg-[#0B1628] shadow-2xl border-l border-slate-200 dark:border-slate-800 z-[1200] p-5 overflow-y-auto flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-lg">
                    {selectedComplaint.ticketId || `#${selectedComplaint.id}`}
                  </span>
                  <span className="text-xs font-bold capitalize text-slate-700 dark:text-slate-300">
                    {selectedComplaint.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Title & Status */}
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                  {selectedComplaint.title}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md font-bold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Status: {selectedComplaint.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Priority: {selectedComplaint.priority}
                  </span>
                </div>

                {/* Location */}
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{selectedComplaint.address}</span>
                </div>

                {/* Department & Officer */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">DEPARTMENT</span>
                    <span className="font-semibold text-slate-800 dark:text-white truncate block">
                      {selectedComplaint.departmentName || 'General Operations'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">ASSIGNED OFFICER</span>
                    <span className="font-semibold text-slate-800 dark:text-white truncate block">
                      {selectedComplaint.officerName || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* AI Intelligence snippet */}
                {selectedComplaint.aiConfidence && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/50 dark:border-emerald-800/40 text-xs space-y-1">
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      AI Case Assessment ({Math.round(selectedComplaint.aiConfidence * 100)}% confidence)
                    </div>
                    {selectedComplaint.aiReason && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedComplaint.aiReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 mt-4">
              <Link
                to={`/complaints/${selectedComplaint.id}`}
                className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                <span>Open Full Case</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
