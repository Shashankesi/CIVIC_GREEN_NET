/**
 * Civic GreenNet — Centralized Brand Configuration
 * Single source of truth for branding tokens, taglines, descriptors, and metadata.
 */

export const BRAND = {
  name: 'Civic GreenNet',
  shortName: 'GreenNet',
  acronym: 'CGN',
  tagline: 'Intelligent Civic Issue Management & Smart Governance',
  descriptor: 'Civic Technology Platform',
  copyright: `© ${new Date().getFullYear()} Civic GreenNet. All rights reserved.`,

  portals: {
    citizen: {
      name: 'Citizen Portal',
      descriptor: 'CITIZEN PORTAL',
      badge: 'Community Active'
    },
    officer: {
      name: 'Officer Operations',
      descriptor: 'OFFICER OPERATIONS',
      badge: 'Municipal Field Ops'
    },
    admin: {
      name: 'Smart City Governance',
      descriptor: 'SMART CITY GOVERNANCE',
      badge: 'Executive Command'
    }
  },

  ai: {
    assistant: 'Civic AI',
    copilot: 'Officer Copilot',
    governance: 'Governance Copilot'
  },

  colors: {
    primary: '#059669', // Emerald 600
    primaryLight: '#10B981', // Emerald 500
    primaryDark: '#047857', // Emerald 700
    mint: '#6EE7B7', // Mint 300
    navy: '#0F172A', // Slate 900
    navySurface: '#07111F', // Deep Night Slate
    tealAccent: '#0D9488', // Teal 600
    cyanAccent: '#06B6D4' // Cyan 500
  }
}

export default BRAND
