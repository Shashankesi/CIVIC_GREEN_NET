import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const USER_FRIENDLY_STATUSES = [
  'Analyzing your request...',
  'Checking your current workload...',
  'Reviewing SLA status & priorities...',
  'Synthesizing operational response...'
];

export default function AITypingIndicator({ accentColor = 'emerald' }) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % USER_FRIENDLY_STATUSES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const dotColorClass = {
    emerald: 'bg-emerald-400',
    brand: 'bg-cyan-400',
    indigo: 'bg-indigo-400'
  }[accentColor] || 'bg-emerald-400';

  return (
    <div className="flex items-center gap-2.5 p-3 text-slate-300 text-xs bg-slate-900/80 rounded-2xl border border-slate-800 w-fit max-w-[85%] my-2 shadow-sm">
      <div className="flex items-center justify-center p-1.5 rounded-full bg-slate-800 text-cyan-400">
        <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <span className="font-medium text-slate-300 tracking-tight">{USER_FRIENDLY_STATUSES[statusIndex]}</span>
      <div className="flex items-center gap-1 ml-1">
        <motion.span
          animate={{ scale: [0.6, 1.2, 0.6] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
          className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`}
        />
        <motion.span
          animate={{ scale: [0.6, 1.2, 0.6] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
          className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`}
        />
        <motion.span
          animate={{ scale: [0.6, 1.2, 0.6] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
          className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`}
        />
      </div>
    </div>
  );
}
