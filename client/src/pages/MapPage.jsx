import React, { useState, useContext, useCallback, useRef } from 'react'
import {
  MapIcon, SlidersHorizontal, X, RotateCcw, Navigation2, Target,
  Loader2, AlertCircle, LocateFixed, ChevronDown, ArrowUpRight, Radio
} from 'lucide-react'
import AppShell from '../components/AppShell'
import MapView from '../components/MapView'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORY_OPTIONS, RADIUS_OPTIONS } from '../config/mapConfig'
import AuthContext from '../context/AuthContext'
import maptiler from '../services/maptiler'
import complaintsApi from '../services/complaints'

export default function MapPage() {
  const { user } = useContext(AuthContext)
  const [filters, setFilters] = useState({})
  const [markerCount, setMarkerCount] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [locStatus, setLocStatus] = useState('idle')  // idle|locating|done|denied|error
  const [userLocation, setUserLocation] = useState(null)
  const [locAddress, setLocAddress] = useState('')
  const [accuracy, setAccuracy] = useState(null)
  const [nearbyCount, setNearbyCount] = useState(null)
  const [radius, setRadius] = useState(5000)
  const geoAbortRef = useRef(null)

  function update(key, value) {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }
  function resetFilters() { setFilters({}) }

  // "Complaints Around Me"
  const handleLocateMe = useCallback(async () => {
    if (!navigator.geolocation) { setLocStatus('error'); return }
    setLocStatus('locating')
    setUserLocation(null)
    setLocAddress('')
    setAccuracy(null)
    setNearbyCount(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = pos.coords.accuracy
        setUserLocation({ lat, lng })
        setAccuracy(acc)
        setLocStatus('done')
        // Reverse geocode for display
        try {
          const r = await maptiler.reverseGeocode(lat, lng)
          if (r.status === 'ok' && r.result) setLocAddress(r.result.formatted || '')
        } catch {}
        // Nearby count
        try {
          const rows = await complaintsApi.nearby({ lat, lng, radius, limit: 1 })
          // We need total count — just show from the actual rows loaded in MapView sidebar
          setNearbyCount(null)
        } catch {}
      },
      (err) => {
        setLocStatus(err && err.code === 1 ? 'denied' : 'error')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }, [radius])

  const selectCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
  const hasFilters = Object.values(filters).some(Boolean)

  const filterControls = (
    <>
      <div>
        <label htmlFor="map-status" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
        <select id="map-status" value={filters.status || ''} onChange={e => update('status', e.target.value)} className={selectCls}>
          {STATUS_OPTIONS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="map-cat" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Category</label>
        <select id="map-cat" value={filters.category || ''} onChange={e => update('category', e.target.value)} className={selectCls}>
          {CATEGORY_OPTIONS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="map-prio" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Priority</label>
        <select id="map-prio" value={filters.priority || ''} onChange={e => update('priority', e.target.value)} className={selectCls}>
          {PRIORITY_OPTIONS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <button
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 w-full justify-center"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>
    </>
  )

  return (
    <AppShell title="Civic Map">
      {/* ── Page header ── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
            <MapIcon className="h-5 w-5 text-emerald-500" />
            Civic Issue Map
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Real-time civic complaints from the database · {markerCount > 0 ? `${markerCount} in view` : 'pan to load'}
          </p>
        </div>

        {/* Complaints Around Me */}
        <button
          onClick={handleLocateMe}
          disabled={locStatus === 'locating'}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 disabled:opacity-60 disabled:scale-100"
        >
          {locStatus === 'locating'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Target className="h-4 w-4" />
          }
          {locStatus === 'locating' ? 'Locating…' : 'Complaints Around Me'}
        </button>
      </div>

      {/* Location status bar */}
      {locStatus === 'done' && userLocation && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm dark:border-emerald-700/40 dark:bg-emerald-900/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="font-semibold">You are here</span>
          </div>
          {locAddress && <span className="text-emerald-600 dark:text-emerald-400 text-xs truncate max-w-xs">{locAddress}</span>}
          <span className="text-emerald-500/70 text-xs">{userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</span>
          {accuracy && <span className="text-emerald-500/70 text-xs">±{Math.round(accuracy)} m</span>}
          {/* Radius selector */}
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Radius:</span>
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRadius(opt.value)}
                className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                  radius === opt.value
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {locStatus === 'denied' && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Location permission denied. You can still search and explore the map manually.
        </div>
      )}
      {locStatus === 'error' && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Unable to determine your location.
          <button onClick={handleLocateMe} className="ml-2 font-semibold underline">Try again</button>
        </div>
      )}

      {/* ── Filter bar — desktop ── */}
      <div className="mb-4 hidden md:flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="grid flex-1 grid-cols-4 gap-3">
          {filterControls}
        </div>
        {hasFilters && (
          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
            {Object.values(filters).filter(Boolean).length}
          </span>
        )}
      </div>

      {/* ── Mobile filter toggle ── */}
      <div className="mb-3 md:hidden">
        <button
          onClick={() => setFilterOpen(v => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-expanded={filterOpen}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white font-bold">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
        </button>
        {filterOpen && (
          <div className="fixed inset-x-0 bottom-0 z-[9000] rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Map Filters</span>
              <button onClick={() => setFilterOpen(false)} aria-label="Close">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">{filterControls}</div>
          </div>
        )}
      </div>

      {/* ── Map with sidebar ── */}
      <MapView
        center={userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629]}
        zoom={userLocation ? 13 : 5}
        filters={filters}
        height={620}
        onLoaded={setMarkerCount}
        showLegend={true}
        showControls={true}
        showSidebar={true}
        clustered={true}
        initialRadius={radius}
      />

      {/* ── Tip below map ── */}
      <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-600">
        All data comes from the live Neon/PostGIS database. Pan and zoom to load complaints in your area.
      </p>
    </AppShell>
  )
}
