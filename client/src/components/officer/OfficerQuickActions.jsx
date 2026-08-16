import React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, MapPin, Map, Cpu, ChevronRight } from 'lucide-react'

/**
 * Quick Actions dashboard for the Officer portal.
 * Four semantic-colored action cards that link to existing routes.
 */

const ACTIONS = [
  {
    to: '/officer/assignments',
    label: 'Workload Queue',
    desc: 'Review and manage assigned tasks',
    icon: ClipboardList,
    colorClass: 'officer-qa-green',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15'
  },
  {
    to: '/officer/nearby',
    label: 'Nearby Issues',
    desc: 'View issues in your vicinity',
    icon: MapPin,
    colorClass: 'officer-qa-blue',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15'
  },
  {
    to: '/officer/map',
    label: 'Operations Map',
    desc: 'Geographic command overview',
    icon: Map,
    colorClass: 'officer-qa-orange',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15'
  },
  {
    to: '/officer/ai',
    label: 'AI Copilot Assistant',
    desc: 'Intelligent operations support',
    icon: Cpu,
    colorClass: 'officer-qa-purple',
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-500/15'
  }
]

export default function OfficerQuickActions() {
  return (
    <div className="officer-card p-6">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
          <Cpu className="h-4 w-4 text-blue-500" />
        </div>
        Quick Actions Dashboard
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.to}
              to={action.to}
              className={`officer-qa-card ${action.colorClass}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.iconBg} shrink-0`}>
                <Icon className={`h-4 w-4 ${action.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{action.label}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{action.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
