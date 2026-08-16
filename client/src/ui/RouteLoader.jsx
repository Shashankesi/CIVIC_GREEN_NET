import React from 'react'
import { Sparkles, Activity, MapPin, Users, Building2 } from 'lucide-react'
import { CivicGreenNetSymbol } from '../components/brand/CivicGreenNetLogo'

// Premium Civic GreenNet Global Route Loader
export default function RouteLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Preparing civic command center"
      className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-[#0A1322] dark:to-[#050B14] text-slate-900 dark:text-white px-4 transition-colors"
    >
      <div className="relative flex flex-col items-center max-w-sm text-center">
        
        {/* Central Graphic Container with Orbiting Civic Nodes */}
        <div className="relative flex h-32 w-32 items-center justify-center mb-6">
          
          {/* Subtle Background Glow */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 blur-xl animate-pulse" />

          {/* Outer Orbit Line */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 dark:border-emerald-400/20 animate-[spin_10s_linear_infinite]" />

          {/* Connected Civic Telemetry Nodes */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg border border-emerald-400/30">
            <Activity className="h-3 w-3" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-cyan-600 text-white p-1.5 rounded-full shadow-lg border border-cyan-400/30">
            <MapPin className="h-3 w-3" />
          </div>
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 flex items-center gap-1 bg-purple-600 text-white p-1.5 rounded-full shadow-lg border border-purple-400/30">
            <Users className="h-3 w-3" />
          </div>
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 flex items-center gap-1 bg-amber-600 text-white p-1.5 rounded-full shadow-lg border border-amber-400/30">
            <Building2 className="h-3 w-3" />
          </div>

          {/* Inner Counter-Spinning Border */}
          <div className="absolute inset-3 rounded-full border-2 border-emerald-500/15 border-t-emerald-500 dark:border-emerald-400/20 dark:border-t-emerald-400 animate-[spin_1.5s_linear_infinite_reverse]" />

          {/* Central Glass Card Icon Container */}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-900/90 shadow-xl border border-emerald-500/30 backdrop-blur-md">
            <CivicGreenNetSymbol size={36} className="animate-pulse" />
          </div>
        </div>

        {/* Branding & Loading Copy */}
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 font-mono">
            <Sparkles className="h-3 w-3" />
            <span>CIVIC GREENNET</span>
          </div>
          <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
            SMART CITY GOVERNANCE PLATFORM
          </h2>
        </div>

        {/* Dynamic Status Copy */}
        <div className="mt-4 space-y-1">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Preparing your civic command center
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Securely connecting services and live city data
          </p>
        </div>

        {/* Sweeping Indeterminate Progress Bar (No fake percentages) */}
        <div className="relative mt-5 h-1 w-44 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-600 animate-[sweep_1.8s_ease-in-out_infinite]" />
        </div>

      </div>

      <style>{`
        @keyframes sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
