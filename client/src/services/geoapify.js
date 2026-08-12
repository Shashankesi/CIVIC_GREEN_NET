// geoapify.js — compatibility shim.
// The application now uses MapTiler for geocoding.
// This file re-exports from the MapTiler service so any existing imports
// continue to work without modification.
export { searchPlaces, reverseGeocode, default } from './maptiler'
