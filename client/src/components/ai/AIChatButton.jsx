import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Cpu, BarChart2 } from 'lucide-react';
import AIChatPanel from './AIChatPanel';

const PERSONA_CONFIGS = {
  citizen: {
    title: 'Civic GreenNet Assistant',
    subtitle: 'Track complaints & municipal guidance',
    label: 'Ask Civic AI',
    icon: Sparkles,
    accentColor: 'emerald',
    badgeBg: 'bg-emerald-600 hover:bg-emerald-500',
    glowColor: 'shadow-emerald-500/25',
    useOfficerStyle: false
  },
  officer: {
    title: 'Officer Copilot',
    subtitle: 'Assigned tasks & SLA operations',
    label: 'Officer Copilot',
    icon: Cpu,
    accentColor: 'brand',
    badgeBg: '',
    glowColor: '',
    useOfficerStyle: true
  },
  admin: {
    title: 'Governance Copilot',
    subtitle: 'City operations & SLA intelligence',
    label: 'Governance Copilot',
    icon: Sparkles,
    accentColor: 'emerald',
    badgeBg: 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700/80 shadow-md dark:bg-[#0B1628] dark:hover:bg-[#111C2D] dark:border-emerald-600/40',
    glowColor: '',
    useOfficerStyle: false
  }
};

export default function AIChatButton({ persona = 'citizen', complaintId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const cfg = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.citizen;
  const Icon = cfg.icon;

  return (
    <>
      {/* Floating Trigger Button with Top Z-Index Layer */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            style={{ zIndex: 9999 }}
            className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2.5 px-4 py-3 rounded-full text-white font-medium text-xs sm:text-sm shadow-2xl border border-white/20 backdrop-blur-md cursor-pointer transition-all duration-200 ${
              cfg.useOfficerStyle
                ? 'officer-copilot-btn'
                : `${cfg.badgeBg} ${cfg.glowColor}`
            }`}
          >
            <Icon className={`w-4 h-4 ${cfg.useOfficerStyle ? 'animate-officer-float' : 'animate-pulse'}`} />
            <span className="font-bold tracking-wide">{cfg.label}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <AIChatPanel
          persona={persona}
          title={cfg.title}
          subtitle={cfg.subtitle}
          accentColor={cfg.accentColor}
          complaintId={complaintId}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
