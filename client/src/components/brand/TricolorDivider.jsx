import React from 'react'

/**
 * TricolorDivider
 * 
 * Elegant, subtle 3-part horizontal line representing the Indian civic-tech identity:
 * Saffron (#FF9933) | White/Light (#FFFFFF) | Indian Green (#138808)
 */
export default function TricolorDivider({ className = '', height = 'h-[3px]' }) {
  return (
    <div
      className={`w-full flex items-center overflow-hidden ${height} ${className}`}
      aria-hidden="true"
    >
      <div className="h-full flex-1 bg-[#FF9933]" />
      <div className="h-full flex-1 bg-white/90 dark:bg-slate-300" />
      <div className="h-full flex-1 bg-[#138808]" />
    </div>
  )
}
