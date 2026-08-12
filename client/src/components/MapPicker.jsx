import React, { useState, useRef, useCallback, useEffect, useContext } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { LocateFixed, Search, X, Loader2, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react'
import maptiler from '../services/maptiler'
import { getTileConfig } from '../config/mapConfig'
import ThemeContext from '../context/ThemeContext'

// ── Draggable marker ──────────────────────────────────────────────────────────
function DraggableMarker({ position, onMove }) {
  const markerRef = useRef(null)
  useEffect(() => {
    if (markerRef.current && position) markerRef.current.setLatLng(position)
  }, [position])
  if (!position) return null
  return (
    <Marker
      ref={markerRef}
      position={position}
      draggable
      icon={L.divIcon({
        className: 'cgn-marker-icon',
        html: '<div class="cgn-pin cgn-pin-selected"><div class="cgn-pin-inner" style="background:#6366f1;font-size:14px;"><span class="cgn-pin-icon">📍</span></div></div>',
        iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
      })}
      eventHandlers={{
        dragend: (e) => {
          const ll = e.target.getLatLng()
          onMove && onMove([ll.lat, ll.lng])
        }
      }}
    />
  )
}

// ── Click-to-select ───────────────────────────────────────────────────────────
function ClickHandler({ onPick, enabled }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick && onPick([e.latlng.lat, e.latlng.lng])
    }
  })
  return null
}

// ── Fly-to on search result ───────────────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom || Math.max(map.getZoom(), 15), { animate: true, duration: 1 })
  }, [center, map, zoom])
  return null
}

// ── Map ref setter ────────────────────────────────────────────────────────────
function MapRefSetter({ mapRef }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    requestAnimationFrame(() => map.invalidateSize({ pan: false, animate: false }))
    setTimeout(() => map.invalidateSize({ pan: false, animate: false }), 300)
  }, [map, mapRef])
  return null
}

// ── MapPicker ─────────────────────────────────────────────────────────────────
export default function MapPicker({ value, onChange }) {
  const { dark } = useContext(ThemeContext)
  const tileConfig = getTileConfig(dark)
  const [pos, setPos] = useState(value?.lat != null ? [value.lat, value.lng] : null)
  const [address, setAddress] = useState(value?.formatted || '')
  const [reverseStatus, setReverseStatus] = useState('idle') // idle|loading|done|error
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchOpen, setSearchOpen] = useState(false)
  const [locStatus, setLocStatus] = useState('idle')         // idle|locating|done|denied|error
  const [accuracy, setAccuracy] = useState(null)
  const [flyTo, setFlyTo] = useState(null)
  const [tileError, setTileError] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const mapRef = useRef(null)
  const abortRef = useRef(null)

  // Emit normalized { lat, lng, formatted } on change.
  const emit = useCallback((lat, lng, formatted) => {
    onChange && onChange({ lat, lng, ...(formatted ? { formatted } : {}) })
  }, [onChange])

  // Reverse geocode a coordinate.
  const doReverse = useCallback(async (lat, lng) => {
    setReverseStatus('loading')
    setConfirmed(false)
    try {
      const r = await maptiler.reverseGeocode(lat, lng)
      if (r.status === 'ok' && r.result) {
        setAddress(r.result.formatted || '')
        emit(lat, lng, r.result.formatted)
        setReverseStatus('done')
      } else {
        setAddress('')
        emit(lat, lng)
        setReverseStatus('done')
      }
    } catch {
      setAddress('')
      emit(lat, lng)
      setReverseStatus('error')
    }
  }, [emit])

  const handlePick = useCallback((ll) => {
    setPos(ll)
    setAccuracy(null)
    setLocStatus('idle')
    setConfirmed(false)
    doReverse(ll[0], ll[1])
  }, [doReverse])

  const handleMove = useCallback((ll) => {
    setPos(ll)
    setAccuracy(null)
    setConfirmed(false)
    doReverse(ll[0], ll[1])
  }, [doReverse])

  // Debounced address search
  useEffect(() => {
    if (!searchTerm || !searchTerm.trim()) { setSearchResults([]); setSearchStatus('idle'); return }
    setSearchStatus('loading')
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const t = setTimeout(async () => {
      const r = await maptiler.searchPlaces(searchTerm.trim(), { signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      setSearchStatus(r.status === 'ok' ? (r.results.length ? 'done' : 'empty') : 'error')
      setSearchResults(r.results || [])
    }, 450)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [searchTerm])

  function selectResult(r) {
    if (!r || r.lat == null || r.lng == null) return
    const ll = [r.lat, r.lng]
    setPos(ll)
    setSearchTerm(r.formatted || '')
    setSearchResults([])
    setSearchOpen(false)
    setAddress(r.formatted || '')
    setConfirmed(false)
    emit(r.lat, r.lng, r.formatted)
    setFlyTo(ll)
  }

  function locateMe() {
    if (!navigator.geolocation) { setLocStatus('error'); return }
    setLocStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude
        const lng = p.coords.longitude
        const acc = p.coords.accuracy
        setPos([lat, lng])
        setAccuracy(acc || null)
        setLocStatus('done')
        setFlyTo([lat, lng])
        setConfirmed(false)
        doReverse(lat, lng)
      },
      (err) => setLocStatus(err && err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  function reset() {
    setPos(null)
    setAddress('')
    setSearchTerm('')
    setSearchResults([])
    setAccuracy(null)
    setLocStatus('idle')
    setConfirmed(false)
    onChange && onChange(null)
  }

  function confirmLocation() {
    if (!pos) return
    setConfirmed(true)
    emit(pos[0], pos[1], address || undefined)
  }

  const inputCls = 'w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100'

  return (
    <div className="relative space-y-3">
      {/* ── Search bar (outside/above map) ── */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 160)}
            placeholder="Search address, landmark, sector…"
            aria-label="Search location"
            className={inputCls}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setSearchResults([]); setSearchStatus('idle') }}
              aria-label="Clear search"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {searchOpen && searchTerm && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {searchStatus === 'loading' && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            )}
            {searchStatus === 'empty' && (
              <div className="px-3 py-2.5 text-xs text-slate-400">No results found</div>
            )}
            {searchStatus === 'error' && (
              <div className="px-3 py-2.5 text-xs text-red-500">Search unavailable. Check connection.</div>
            )}
            {searchResults.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => selectResult(r)}
                className="block w-full px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
                  <span className="truncate">{r.formatted}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Use My Location button ── */}
      <button
        type="button"
        onClick={locateMe}
        disabled={locStatus === 'locating'}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
      >
        {locStatus === 'locating'
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <LocateFixed className="h-4 w-4" />
        }
        {locStatus === 'locating' ? 'Detecting your location…' : '📍 Use my current location'}
      </button>

      {/* ── Map ── */}
      <div className="relative h-80 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <MapContainer
          center={pos || [20.5937, 78.9629]}
          zoom={pos ? 15 : 5}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <MapRefSetter mapRef={mapRef} />
          <ClickHandler onPick={handlePick} enabled={!locStatus.includes('locating')} />
          <DraggableMarker position={pos} onMove={handleMove} />
          {pos && accuracy && (
            <Circle
              center={pos}
              radius={accuracy}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1, weight: 2, dashArray: '4 4' }}
            />
          )}
          {flyTo && <FlyTo center={flyTo} zoom={16} key={`${flyTo[0]},${flyTo[1]}`} />}
          <TileLayer
            key={dark ? 'dark' : 'light'}
            url={tileError ? tileConfig.fallback : tileConfig.url}
            attribution={tileConfig.attribution}
            maxZoom={tileConfig.maxZoom}
            eventHandlers={{
              tileerror: () => setTileError(true),
              load: () => setTileError(false)
            }}
          />
        </MapContainer>

        {/* Tap hint */}
        {!pos && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-50">
            <div className="glass rounded-xl px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow">
              Tap anywhere on the map to place a marker
            </div>
          </div>
        )}
      </div>

      {/* ── Address / status feedback ── */}
      {reverseStatus === 'loading' && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving address…
        </div>
      )}

      {pos && reverseStatus === 'done' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50 space-y-1.5">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Selected Location</div>
              {address ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{address}</div>
              ) : (
                <div className="text-xs text-slate-400 mt-0.5">Address unavailable</div>
              )}
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
              </div>
              {accuracy && locStatus === 'done' && (
                <div className="text-[10px] text-slate-400">Accuracy: ±{Math.round(accuracy)} m</div>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {!confirmed ? (
              <button
                type="button"
                onClick={confirmLocation}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Location
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Location confirmed
              </div>
            )}
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Error states */}
      {locStatus === 'denied' && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-600 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Location permission denied. Please search manually or tap the map.
        </div>
      )}
      {locStatus === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Could not determine your location. Please search or click the map.
          <button onClick={locateMe} className="ml-auto underline font-semibold shrink-0">Retry</button>
        </div>
      )}
      {reverseStatus === 'error' && pos && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Could not resolve address. Location coordinates are still saved.
        </div>
      )}
    </div>
  )
}
