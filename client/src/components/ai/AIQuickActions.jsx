import React from 'react';
import { Sparkles, Compass, ShieldAlert, CheckCircle2, BarChart2, MapPin, Briefcase, FileEdit } from 'lucide-react';

const QUICK_ACTIONS_BY_PERSONA = {
  citizen: [
    { label: 'My Complaints', prompt: 'Show my complaints and their current status.', icon: CheckCircle2 },
    { label: 'Nearby Issues', prompt: 'Are there any active civic complaints reported near my location?', icon: MapPin },
    { label: 'SLA Guidelines', prompt: 'What are the municipal response timelines and SLA guidelines?', icon: Compass },
    { label: 'Resolved Status', prompt: 'Are any of my reported complaints resolved or updated?', icon: Sparkles }
  ],
  officer: [
    { label: 'My Work', prompt: 'Show my currently assigned complaints grouped by priority.', icon: Briefcase },
    { label: 'Priority Issues', prompt: 'Show my highest-priority active complaints and explain which should be handled first.', icon: ShieldAlert },
    { label: 'SLA Alerts', prompt: 'Show complaints assigned to me that are approaching or have breached their SLA.', icon: ShieldAlert },
    { label: 'Department Workload', prompt: 'Summarize the current workload of my department.', icon: BarChart2 },
    { label: 'Draft Update', prompt: 'Draft a polite resolution update note for my active complaint.', icon: FileEdit }
  ],
  admin: [
    { label: 'What Needs Attention', prompt: 'What needs attention today across municipal operations?', icon: ShieldAlert },
    { label: 'Department Snapshot', prompt: 'Which municipal departments currently have the highest active workload?', icon: BarChart2 },
    { label: 'Hotspot Clusters', prompt: 'Identify top geographic clusters or complaint hotspots.', icon: MapPin },
    { label: 'Generate Briefing', prompt: 'Generate today\'s executive operations briefing.', icon: Sparkles }
  ]
};

export default function AIQuickActions({ persona = 'citizen', onSelectAction }) {
  const actions = QUICK_ACTIONS_BY_PERSONA[persona] || QUICK_ACTIONS_BY_PERSONA.citizen;

  return (
    <div className="py-2 px-3 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md overflow-x-auto scrollbar-none flex gap-2">
      {actions.map((act, idx) => {
        const Icon = act.icon || Sparkles;
        return (
          <button
            key={idx}
            onClick={() => onSelectAction(act.prompt)}
            className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 rounded-full transition-all duration-150 shadow-sm active:scale-95 flex-shrink-0"
          >
            <Icon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{act.label}</span>
          </button>
        );
      })}
    </div>
  );
}
