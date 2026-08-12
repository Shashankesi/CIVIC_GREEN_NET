import React from 'react'

export default function Skeleton({ className = '', lines = 1 }) {
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton h-4 rounded" style={{ width: `${100 - i * 8}%` }} />
        ))}
      </div>
    )
  }
  return <div className={`skeleton rounded ${className || 'h-4 w-full'}`} aria-hidden="true" />
}
