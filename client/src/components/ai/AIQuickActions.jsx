import React from 'react';
import { Sparkles, Compass, ShieldAlert, CheckCircle2, BarChart2, MapPin, Briefcase, FileEdit, Award, Flame } from 'lucide-react';

const QUICK_ACTIONS_BY_PERSONA = {
  citizen: [
    { label: 'My Complaints', prompt: 'Show my complaints and their current status.', icon: CheckCircle2 },
    { label: 'Nearby Issues', prompt: 'Are there any active civic complaints reported near my location?', icon: MapPin },
    { label: 'SLA Guidelines', prompt: 'What are the municipal response timelines and SLA guidelines?', icon: Compass },
    { label: 'Resolved Status', prompt: 'Are any of my reported complaints resolved or updated?', icon: Sparkles }
  ],
  officer: [
    { label: 'Priority Issues', prompt: 'Show my highest-priority active complaints and explain which I should handle first.', icon: Flame },
    { label: '🚨 SLA Alerts', prompt: 'Which of my complaints are close to SLA breach or overdue?', icon: ShieldAlert },
    { label: 'Department Workload', prompt: 'What is the current workload and overdue status of my department?', icon: BarChart2 },
    { label: 'My Workload', prompt: 'Give me a summary of my current assigned workload.', icon: Briefcase },
    { label: 'My Performance', prompt: 'Show my current officer performance, resolution rate, and SLA compliance.', icon: Award },
    { label: "Today's Focus", prompt: 'What should I focus on today?', icon: Sparkles }
  ],
  admin: [
    { label: 'What Needs Attention', prompt: 'What needs attention today across municipal operations?', icon: ShieldAlert },
    { label: 'Department Snapshot', prompt: 'Which municipal departments currently have the highest active workload?', icon: BarChart2 },
    { label: 'Hotspot Clusters', prompt: 'Identify top geographic clusters or complaint hotspots.', icon: MapPin },
    { label: 'Generate Briefing', prompt: "Generate today's executive operations briefing.", icon: Sparkles }
  ]
};

export default function AIQuickActions({
  persona = 'citizen',
  onSelectAction,
  onSelect,
  customActions,
  loading = false
}) {
  const handler = onSelect || onSelectAction;
  const actions = customActions || QUICK_ACTIONS_BY_PERSONA[persona] || QUICK_ACTIONS_BY_PERSONA.citizen;

  return (
    <div className="py-2 px-3 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md overflow-x-auto scrollbar-none flex gap-2 w-full">
      {actions.map((act, idx) => {
        const Icon = act.icon || Sparkles;
        return (
          <button
            key={idx}
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (handler && typeof handler === 'function') {
                handler(act.prompt);
              }
            }}
            className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-500/50 rounded-full transition-all duration-150 shadow-sm active:scale-95 flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>{act.label}</span>
          </button>
        );
      })}
    </div>
  );
}
