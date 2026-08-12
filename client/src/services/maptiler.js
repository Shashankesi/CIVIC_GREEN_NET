// MapTiler geocoding service (forward + reverse).
// Uses VITE_MAPTILER_API_KEY from the Vite environment.
// Never throws unhandled — returns normalized envelopes so UI can react cleanly.

import { hasMaptilerKey, MAPTILER_KEY } from '../config/mapConfig'

const GEOCODE_BASE = 'https://api.maptiler.com/geocoding'

// In-memory cache to avoid duplicate network calls.
const cache = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function cacheKey(prefix, query) {
  return `${prefix}:${query}`
}

function getCached(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > CACHE_TTL) { cache.delete(key); return null }
  return hit.value
}

function setCached(key, value) {
  cache.set(key, { value, ts: Date.now() })
}

// Normalize a MapTiler forward-geocode feature.
function normalizeForward(feature) {
  const props = feature.properties || {}
  const coords = feature.geometry && feature.geometry.coordinates
  const place = (feature.place_name || feature.text || '')
  const context = feature.context || []

  let city = '', state = '', country = '', postcode = ''
  for (const ctx of context) {
    const id = ctx.id || ''
    if (id.startsWith('place')) city = ctx.text || city
    if (id.startsWith('region')) state = ctx.text || state
    if (id.startsWith('country')) country = ctx.text || country
    if (id.startsWith('postcode')) postcode = ctx.text || postcode
  }

  return {
    formatted: feature.place_name || feature.text || '',
    street: feature.text || '',
    city: city || props.city || '',
    state: state || props.region || '',
    postcode: postcode || props.postcode || '',
    country: country || props.country || '',
    lat: coords ? coords[1] : null,
    lng: coords ? coords[0] : null,
    placeId: feature.id || null,
    category: (feature.place_type || []).join(',')
  }
}

// Normalize a MapTiler reverse-geocode feature.
function normalizeReverse(feature) {
  const context = feature.context || []
  let city = '', state = '', country = '', postcode = ''
  for (const ctx of context) {
    const id = ctx.id || ''
    if (id.startsWith('place')) city = ctx.text || city
    if (id.startsWith('region')) state = ctx.text || state
    if (id.startsWith('country')) country = ctx.text || country
    if (id.startsWith('postcode')) postcode = ctx.text || postcode
  }
  const coords = feature.geometry && feature.geometry.coordinates
  return {
    formatted: feature.place_name || feature.text || '',
    street: feature.text || '',
    city,
    state,
    postcode,
    country,
    lat: coords ? coords[1] : null,
    lng: coords ? coords[0] : null,
    placeId: feature.id || null
  }
}

async function fetchJson(url, signal) {
  try {
    const res = await fetch(url, signal ? { signal } : {})
    if (res.status === 429) return { status: 'error', code: 'RATE_LIMIT' }
    if (!res.ok)            return { status: 'error', code: 'API_ERROR', httpStatus: res.status }
    const data = await res.json()
    return { status: 'ok', data }
  } catch (e) {
    if (e && e.name === 'AbortError') return { status: 'aborted' }
    return { status: 'error', code: 'NETWORK_ERROR' }
  }
}

// Forward geocoding — returns list of normalized results.
export async function searchPlaces(query, { signal } = {}) {
  if (!query || !query.trim()) return { status: 'ok', results: [] }
  if (!hasMaptilerKey()) return { status: 'error', code: 'NO_KEY', results: [] }

  const key = cacheKey('fwd', query.trim().toLowerCase())
  const cached = getCached(key)
  if (cached) return { status: 'ok', results: cached }

  const url = `${GEOCODE_BASE}/${encodeURIComponent(query.trim())}.json?key=${MAPTILER_KEY}&limit=6&language=en`
  const res = await fetchJson(url, signal)
  if (res.status !== 'ok') return { status: res.status, code: res.code, results: [] }

  const features = (res.data && res.data.features) || []
  const results = features
    .map(normalizeForward)
    .filter((r) => r.lat != null && r.lng != null)
  setCached(key, results)
  return { status: 'ok', results }
}

// Reverse geocoding — returns a single normalized location or null.
export async function reverseGeocode(lat, lng, { signal } = {}) {
  if (lat == null || lng == null) return { status: 'ok', result: null }
  if (!hasMaptilerKey()) return { status: 'error', code: 'NO_KEY', result: null }

  const key = cacheKey('rev', `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`)
  const cached = getCached(key)
  if (cached) return { status: 'ok', result: cached }

  // MapTiler reverse geocode endpoint: /geocoding/lng,lat.json
  const url = `${GEOCODE_BASE}/${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}.json?key=${MAPTILER_KEY}&language=en`
  const res = await fetchJson(url, signal)
  if (res.status !== 'ok') return { status: res.status, code: res.code, result: null }

  const features = (res.data && res.data.features) || []
  const result = features.length ? normalizeReverse(features[0]) : null
  setCached(key, result)
  return { status: 'ok', result }
}

export default { searchPlaces, reverseGeocode }
