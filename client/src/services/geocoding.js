/**
 * CivicGreenNet — Geocoding & Location Search Service
 * High-precision Indian and Global smart-city geocoding.
 * Supports MapTiler geocoding with automatic Nominatim (OpenStreetMap) fallback,
 * in-memory TTL caching, duplicate suppression, and ticket ID detection.
 */

import maptiler from './maptiler.js'
import complaintsApi from './complaints.js'

const cache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function getCache(key) {
  const item = cache.get(key)
  if (!item) return null
  if (Date.now() - item.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return item.data
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

/**
 * Fallback to OpenStreetMap Nominatim for detailed geocoding
 */
async function searchNominatim(query, { signal } = {}) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&limit=10&addressdetails=1`

    const res = await fetch(url, {
      signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CivicGreenNet-CivicTech/1.0'
      }
    })

    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    const seen = new Set()
    const results = []

    for (const item of data) {
      const addr = item.address || {}
      const name =
        item.name ||
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.municipality ||
        item.display_name.split(',')[0].trim()

      const district = addr.state_district || addr.county || addr.district || ''
      const state = addr.state || ''
      const country = addr.country || ''
      const isIndia = addr.country_code === 'in'

      // Construct clean, readable subtitle without redundant words
      const subParts = []
      if (district && district.toLowerCase() !== name.toLowerCase()) {
        subParts.push(district)
      }
      if (
        state &&
        state.toLowerCase() !== name.toLowerCase() &&
        state.toLowerCase() !== district.toLowerCase()
      ) {
        subParts.push(state)
      }
      if (country) {
        subParts.push(country)
      }
      const subtitle = subParts.join(', ')

      // Deduplicate key based on normalized name and subtitle
      const dedupKey = `${name.toLowerCase()}|${subtitle.toLowerCase()}`
      if (seen.has(dedupKey)) continue
      seen.add(dedupKey)

      const lat = parseFloat(item.lat)
      const lng = parseFloat(item.lon)
      if (isNaN(lat) || isNaN(lng)) continue

      // Calculate appropriate zoom level
      let zoom = 14
      if (item.type === 'city' || item.class === 'boundary') {
        zoom = 13
      } else if (item.type === 'administrative') {
        zoom = 12
      } else if (item.type === 'suburb' || item.type === 'neighbourhood') {
        zoom = 15
      } else if (item.class === 'building' || item.class === 'amenity' || item.class === 'highway') {
        zoom = 16
      }

      // Ranking weight: prioritize India, major cities, and high Nominatim importance
      let priority = isIndia ? 100 : 0
      if (item.type === 'city') priority += 50
      else if (item.type === 'town') priority += 40
      else if (item.type === 'administrative') priority += 30
      else if (item.type === 'suburb') priority += 25
      priority += (item.importance || 0) * 20

      results.push({
        id: `osm-${item.place_id}`,
        name,
        subtitle: subtitle || country || 'Location',
        formatted: [name, subtitle].filter(Boolean).join(', '),
        district,
        state,
        country,
        lat,
        lng,
        zoom,
        priority,
        type: 'location',
        source: 'OpenStreetMap'
      })
    }

    // Sort by priority descending
    results.sort((a, b) => b.priority - a.priority)
    return results.slice(0, 6)
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Nominatim geocoding error:', err)
    }
    return []
  }
}

/**
 * Searches locations across MapTiler and Nominatim
 */
export async function searchLocations(query, { signal } = {}) {
  const trimmed = (query || '').trim()
  if (!trimmed || trimmed.length < 2) return []

  const cacheKey = `loc:${trimmed.toLowerCase()}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  let results = []

  // 1. Try MapTiler
  try {
    const mtRes = await maptiler.searchPlaces(trimmed, { signal })
    if (mtRes && mtRes.status === 'ok' && Array.isArray(mtRes.results) && mtRes.results.length > 0) {
      results = mtRes.results.map((r) => {
        const name = r.street || r.city || r.formatted.split(',')[0].trim()
        const subParts = [r.city, r.state, r.country].filter(
          (p, i, arr) => p && arr.indexOf(p) === i && p.toLowerCase() !== name.toLowerCase()
        )
        const subtitle = subParts.join(', ')

        return {
          id: r.placeId || `mt-${r.lat}-${r.lng}`,
          name,
          subtitle: subtitle || r.formatted,
          formatted: r.formatted,
          district: r.city || '',
          state: r.state || '',
          country: r.country || 'India',
          lat: r.lat,
          lng: r.lng,
          zoom: r.category?.includes('city') ? 13 : 15,
          type: 'location',
          source: 'MapTiler'
        }
      })
    }
  } catch (err) {
    console.warn('MapTiler search attempt failed, trying fallback:', err)
  }

  // 2. Fallback to Nominatim if MapTiler returned no results
  if (results.length === 0) {
    results = await searchNominatim(trimmed, { signal })
  }

  if (results.length > 0) {
    setCache(cacheKey, results)
  }

  return results
}

/**
 * Check if query looks like a CivicGreenNet Ticket ID (e.g. CGN-00123 or numeric)
 */
export function isTicketQuery(query) {
  const q = (query || '').trim().toUpperCase()
  return q.startsWith('CGN-') || /^\d+$/.test(q) || (q.length >= 3 && q.includes('-') && !q.includes(' '))
}

/**
 * Search complaint by ticket ID or search query
 */
export async function searchTicketComplaint(query) {
  const trimmed = (query || '').trim()
  if (!trimmed) return null

  // 1. If numeric or CGN ticket
  try {
    const rawId = trimmed.replace(/^CGN-0*/i, '')
    if (/^\d+$/.test(rawId)) {
      const comp = await complaintsApi.getComplaint(rawId)
      if (comp && comp.lat && comp.lng) {
        return comp
      }
    }
  } catch (err) {
    // getComplaint threw 404 or similar, continue to generic search
  }

  try {
    const searchRes = await complaintsApi.searchComplaints({ q: trimmed, limit: 5 })
    const list = Array.isArray(searchRes) ? searchRes : searchRes?.complaints || []
    const match = list.find(
      (c) =>
        String(c.id) === trimmed ||
        c.ticketId?.toLowerCase() === trimmed.toLowerCase() ||
        c.title?.toLowerCase().includes(trimmed.toLowerCase())
    )
    if (match && match.lat && match.lng) {
      return match
    }
  } catch (err) {
    console.warn('Complaint search error:', err)
  }

  return null
}

export default {
  searchLocations,
  searchTicketComplaint,
  isTicketQuery
}
