import React from 'react'
import { Sparkles } from 'lucide-react'

export default function AIBadge({ children = 'AI', confidence, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-ai/10 px-2.5 py-0.5 text-xs font-medium text-ai capitalize ${className}`}>
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {children}
      {typeof confidence === 'number' && (
        <span className="font-semibold">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  )
}
