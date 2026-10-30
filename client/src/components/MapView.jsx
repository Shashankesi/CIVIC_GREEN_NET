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
import toast from 'react-hot-toast'
import {
  LocateFixed, Thermometer, X, Search, Loader2, Navigation2,
  AlertCircle, RefreshCw, SlidersHorizontal, MapPin, ChevronDown,
  ArrowRight, Target, Radio, Layers, Flame, Clock, Sparkles,
  Repeat, ShieldCheck, Building2, User, ExternalLink, CheckCircle2,
  AlertTriangle, Filter, FileText, Compass
} from 'lucide-react'
import mapsApi from '../services/maps'
import complaintsApi from '../services/complaints'
import maptiler from '../services/maptiler'
import { searchLocations, searchTicketComplaint, isTicketQuery } from '../services/geocoding'
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

function createSearchLocationIcon() {
  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(19,136,8,0.25);animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position:relative;width:32px;height:32px;border-radius:50%;background:#138808;color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);border:2.5px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `
  return L.divIcon({
    className: 'cgn-search-pin',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

function MapPanController({ targetCenter, targetZoom }) {
  const map = useMap()
  const prevRef = useRef({ lat: null, lng: null, zoom: null })

  useEffect(() => {
    if (targetCenter && targetCenter[0] != null && targetCenter[1] != null) {
      const lat = targetCenter[0]
      const lng = targetCenter[1]
      const zoom = targetZoom || map.getZoom()

      if (
        prevRef.current.lat === lat &&
        prevRef.current.lng === lng &&
        prevRef.current.zoom === zoom
      ) {
        return
      }

      prevRef.current = { lat, lng, zoom }
      map.flyTo([lat, lng], zoom, { duration: 1.4, easeLinearity: 0.25 })
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

export default function MapView({
  height = 560,
  initialCenter = [30.7333, 76.7794], // Chandigarh Default
  initialZoom = 12,
  filters = {},
  userRole = 'citizen',
  showAdminDrawer = true,
  onComplaintClick = null,
  onStatsChange = null,
  complaints: propComplaints = null,
  preview = false,
  showLegend = true,
  showControls = true,
  showSidebar = true,
  initialRadius = 10000
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
    hotspots: !preview,
    slaRisk: false,
    duplicateClusters: false,
    recurringZones: false,
    wards: !preview,
    departments: false
  })

  const [currentZoom, setCurrentZoom] = useState(initialZoom)
  const [bbox, setBbox] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [heatmapPoints, setHeatmapPoints] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [slaRiskData, setSlaRiskData] = useState({ overdue: [], dueSoon: [], onTime: [], summary: {} })

  const displayComplaints = useMemo(() => {
    if (propComplaints && Array.isArray(propComplaints)) {
      return propComplaints
    }
    return complaints
  }, [propComplaints, complaints])
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
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState('idle') // idle | typing | loading | results | selected | empty | error
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [searchMarker, setSearchMarker] = useState(null)
  const [panTargetZoom, setPanTargetZoom] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)

  const searchAbortRef = useRef(null)
  const searchBoxRef = useRef(null)
  const isTypingRef = useRef(false)
  const lastFetchedQueryRef = useRef('')
  const wardsRef = useRef(wards)
  const complaintsRef = useRef(complaints)
  wardsRef.current = wards
  complaintsRef.current = complaints

  // Close search suggestions on click outside without clearing selected location
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search autocomplete (450ms delay, strictly on user typing)
  useEffect(() => {
    // If input change was NOT initiated by user typing (e.g. selection or reset), skip
    if (!isTypingRef.current) {
      return
    }

    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchSuggestions([])
      setSearching(false)
      setShowSuggestions(false)
      setSearchStatus('idle')
      return
    }

    // Prevent duplicate request if query has not changed
    if (trimmed.toLowerCase() === lastFetchedQueryRef.current.toLowerCase()) {
      return
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const controller = new AbortController()
    searchAbortRef.current = controller

    setSearching(true)
    setSearchStatus('loading')

    const timeout = setTimeout(async () => {
      try {
        const combined = []
        const currentWards = wardsRef.current || []
        const currentComplaints = complaintsRef.current || []

        // 1. Check local wards
        const matchedWards = currentWards
          .filter((w) => w.name && w.name.toLowerCase().includes(trimmed.toLowerCase()))
          .slice(0, 3)
        for (const w of matchedWards) {
          if (w.geojson?.coordinates) {
            const coords = w.geojson.coordinates[0][0]
            combined.push({
              id: `ward-${w.id}`,
              name: w.name,
              subtitle: `Municipal Ward • ${w.zone || 'City Jurisdiction'}`,
              formatted: `${w.name}, Ward Jurisdiction`,
              lat: coords[1],
              lng: coords[0],
              zoom: 14,
              type: 'ward',
              wardObj: w
            })
          }
        }

        // 2. Check ticket ID or complaints
        if (isTicketQuery(trimmed)) {
          const ticketComp = await searchTicketComplaint(trimmed)
          if (ticketComp && ticketComp.lat && ticketComp.lng) {
            combined.push({
              id: `ticket-${ticketComp.id}`,
              name: `#${ticketComp.ticketId || ticketComp.id} — ${ticketComp.title || 'Civic Complaint'}`,
              subtitle: `${ticketComp.category || 'General'} • Status: ${ticketComp.status || 'Active'}`,
              formatted: ticketComp.address || 'Reported Location',
              lat: ticketComp.lat,
              lng: ticketComp.lng,
              zoom: 16,
              type: 'ticket',
              complaintObj: ticketComp
            })
          }
        }

        // In-memory complaints matching
        const matchedComps = currentComplaints
          .filter(
            (c) =>
              (c.ticketId && c.ticketId.toLowerCase().includes(trimmed.toLowerCase())) ||
              (c.title && c.title.toLowerCase().includes(trimmed.toLowerCase())) ||
              String(c.id) === trimmed
          )
          .slice(0, 2)
        for (const c of matchedComps) {
          if (c.lat && c.lng && !combined.some((item) => item.id === `ticket-${c.id}`)) {
            combined.push({
              id: `ticket-${c.id}`,
              name: `#${c.ticketId || c.id} — ${c.title || 'Civic Complaint'}`,
              subtitle: `${c.category || 'General'} • Status: ${c.status || 'Active'}`,
              formatted: c.address || 'Reported Location',
              lat: c.lat,
              lng: c.lng,
              zoom: 16,
              type: 'ticket',
              complaintObj: c
            })
          }
        }

        // 3. Search geographical places (cities, sectors, landmarks, streets)
        const places = await searchLocations(trimmed, { signal: controller.signal })
        for (const p of places) {
          if (
            !combined.some(
              (item) => Math.abs(item.lat - p.lat) < 0.002 && Math.abs(item.lng - p.lng) < 0.002
            )
          ) {
            combined.push(p)
          }
        }

        lastFetchedQueryRef.current = trimmed
        setSearchSuggestions(combined)
        setShowSuggestions(true)
        setSearchStatus(combined.length > 0 ? 'results' : 'empty')
        setSelectedIndex(-1)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Search autocomplete error:', err)
          setSearchStatus('error')
        }
      } finally {
        setSearching(false)
      }
    }, 450)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [searchQuery])

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
      if (activeLayers.complaints && !propComplaints) {
        promises.push(mapsApi.getComplaintsInBbox(queryParams).then(res => {
          const list = Array.isArray(res) ? res : []
          setComplaints(list)
          if (onStatsChange) onStatsChange(list.length)
        }))
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
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setPanTarget([latitude, longitude])
        setPanTargetZoom(15)
        setLocating(false)
        toast.success('Centered on your current location', { id: 'cgn-locate' })
      },
      (err) => {
        setLocating(false)
        if (err.code === 1) {
          toast.error('Location permission was denied. Please enable location access in browser.', { id: 'cgn-locate' })
        } else {
          toast.error('Unable to retrieve your location.', { id: 'cgn-locate' })
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // 5. Autocomplete selection handler
  const handleSelectSuggestion = (item) => {
    // Disarm typing flag immediately so no new autocomplete request is fired
    isTypingRef.current = false

    // Close dropdown immediately and clear suggestions & loading
    setShowSuggestions(false)
    setSearching(false)
    setSearchSuggestions([])
    setSelectedIndex(-1)
    setSearchStatus('selected')

    // Store the location name in the input field
    const displayName = item.formatted || item.name || ''
    setSearchQuery(displayName)
    lastFetchedQueryRef.current = displayName

    if (item.type === 'ticket' && item.complaintObj) {
      setPanTarget([item.lat, item.lng])
      setPanTargetZoom(item.zoom || 16)
      setSelectedComplaint(item.complaintObj)
      toast.success(`Complaint #${item.complaintObj.ticketId || item.complaintObj.id} located`, { id: 'cgn-search' })
      return
    }

    if (item.type === 'ward') {
      const currentWards = wardsRef.current || []
      const wardMatch = currentWards.find(
        (w) => w.id === item.id || (w.name && w.name.toLowerCase() === item.name.toLowerCase())
      )
      if (wardMatch) {
        setSelectedWard(wardMatch)
        setPanTarget([item.lat, item.lng])
        setPanTargetZoom(item.zoom || 14)
        toast.success(`Navigated to ${item.name}`, { id: 'cgn-search' })
        return
      }
    }

    // Geographical location selection
    if (item.lat && item.lng && !isNaN(item.lat) && !isNaN(item.lng)) {
      setPanTarget([item.lat, item.lng])
      setPanTargetZoom(item.zoom || 14)
      setSearchMarker({
        lat: item.lat,
        lng: item.lng,
        title: item.name || 'Selected Location',
        address: item.subtitle ? `${item.name}, ${item.subtitle}` : item.formatted || item.name
      })
      toast.success('Location selected successfully', { id: 'cgn-search' })
    } else {
      toast.error('Unable to locate coordinates for the selected place.', { id: 'cgn-search' })
    }
  }

  // 6. Clear search and restore view
  const handleClear = () => {
    isTypingRef.current = false
    setSearchQuery('')
    lastFetchedQueryRef.current = ''
    setSearchSuggestions([])
    setShowSuggestions(false)
    setSearching(false)
    setSearchStatus('idle')
    setSelectedIndex(-1)
    setSearchMarker(null)
    setPanTarget(initialCenter)
    setPanTargetZoom(initialZoom)
  }

  // 7. Keyboard navigation for autocomplete dropdown
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      return
    }

    if (!showSuggestions || searchSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < searchSuggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchSuggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < searchSuggestions.length) {
        handleSelectSuggestion(searchSuggestions[selectedIndex])
      } else if (searchSuggestions.length > 0) {
        handleSelectSuggestion(searchSuggestions[0])
      }
    }
  }

  // 8. Search submission handler (form enter or Go button)
  const handleSearch = async (e) => {
    e?.preventDefault?.()
    if (!searchQuery.trim()) return

    // If an item was actively highlighted in suggestions, pick it
    if (selectedIndex >= 0 && searchSuggestions[selectedIndex]) {
      handleSelectSuggestion(searchSuggestions[selectedIndex])
      return
    }

    // If suggestions are currently populated, pick the first match
    if (searchSuggestions.length > 0) {
      handleSelectSuggestion(searchSuggestions[0])
      return
    }

    // Direct ticket ID search
    if (isTicketQuery(searchQuery)) {
      setSearching(true)
      const found = await searchTicketComplaint(searchQuery)
      setSearching(false)
      if (found && found.lat && found.lng) {
        setPanTarget([found.lat, found.lng])
        setPanTargetZoom(16)
        setSelectedComplaint(found)
        setShowSuggestions(false)
        toast.success(`Complaint #${found.ticketId || found.id} located`, { id: 'cgn-search' })
        return
      }
    }

    // Direct ward search
    const currentWards = wardsRef.current || []
    const wardMatch = currentWards.find(
      (w) => w.name && w.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    if (wardMatch && wardMatch.geojson?.coordinates) {
      const coords = wardMatch.geojson.coordinates[0][0]
      setPanTarget([coords[1], coords[0]])
      setPanTargetZoom(14)
      setSelectedWard(wardMatch)
      setShowSuggestions(false)
      toast.success(`Ward ${wardMatch.name} located`, { id: 'cgn-search' })
      return
    }

    // Geocode query on the fly
    isTypingRef.current = false
    setSearching(true)
    setSearchStatus('loading')
    try {
      const places = await searchLocations(searchQuery)
      if (places.length > 0) {
        handleSelectSuggestion(places[0])
      } else {
        toast.error(`No matching locations found for "${searchQuery}"`, { id: 'cgn-search' })
        setSearchStatus('empty')
      }
    } catch {
      toast.error('Search service unavailable. Please try again.', { id: 'cgn-search' })
      setSearchStatus('error')
    } finally {
      setSearching(false)
    }
  }

  const toggleLayer = (layerKey) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }

  const tileConfig = getTileConfig(isDark)

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-900" style={{ height }}>
      {/* ── Top GIS Command Toolbar ────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Search Bar with Autocomplete Dropdown */}
        <div ref={searchBoxRef} className="pointer-events-auto relative w-full max-w-sm sm:max-w-md">
          <form
            onSubmit={handleSearch}
            className="flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 dark:border-slate-700/90 p-1 px-3 transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500"
          >
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                isTypingRef.current = true
                setSearchQuery(e.target.value)
                setSearchStatus('typing')
                if (!showSuggestions && e.target.value.trim().length >= 2) {
                  setShowSuggestions(true)
                }
              }}
              onFocus={() => {
                if (searchSuggestions.length > 0 && searchQuery.trim().length >= 2) {
                  setShowSuggestions(true)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search location (Mohali, Chandigarh, Delhi, Area)..."
              className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none py-1.5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 mr-1 cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {searching ? (
              <Loader2 className="h-4 w-4 text-emerald-500 animate-spin shrink-0" />
            ) : (
              <button
                type="submit"
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                Go
              </button>
            )}
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 dark:bg-[#0E1B2E]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700/90 overflow-hidden z-[1200] max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
              {searching && searchSuggestions.length === 0 ? (
                <div className="px-4 py-3.5 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                  <span>Searching locations...</span>
                </div>
              ) : searchSuggestions.length > 0 ? (
                searchSuggestions.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.type === 'ticket' ? (
                          <FileText className="h-4 w-4 text-amber-500" />
                        ) : item.type === 'ward' ? (
                          <Building2 className="h-4 w-4 text-indigo-500" />
                        ) : (
                          <MapPin className="h-4 w-4 text-[#138808]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded shrink-0 ${
                              item.type === 'ticket'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : item.type === 'ward'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {item.type}
                          </span>
                        </div>
                        {(item.subtitle || item.formatted) && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.subtitle || item.formatted}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })
              ) : searchStatus === 'empty' && searchQuery.trim().length >= 3 ? (
                <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                  No matching locations found for "{searchQuery}"
                </div>
              ) : null}
            </div>
          )}
        </div>

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

        <MapPanController targetCenter={panTarget} targetZoom={panTargetZoom} />

        {/* Temporary Search Result Marker */}
        {searchMarker && (
          <Marker
            position={[searchMarker.lat, searchMarker.lng]}
            icon={createSearchLocationIcon()}
          >
            <Popup className="cgn-leaflet-popup" autoPan={true}>
              <div className="p-2 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{searchMarker.title}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {searchMarker.address}
                </p>
                <div className="pt-1 text-[10px] text-slate-400 font-medium">
                  {searchMarker.lat.toFixed(5)}, {searchMarker.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

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
            markers={displayComplaints}
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
      {showLegend && (
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
      )}

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
