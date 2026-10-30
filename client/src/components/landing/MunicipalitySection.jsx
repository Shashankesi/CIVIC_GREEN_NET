import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Smartphone,
  Landmark,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  BarChart2
} from 'lucide-react'
import Button from '../../ui/Button'

export default function MunicipalitySection({ stats }) {
  const navigate = useNavigate()

  const capabilities = [
    'Complaint Management',
    'Priority Routing',
    'SLA Tracking',
    'Department Performance',
    'Heatmaps',
    'Reports'
  ]

  return (
    <section id="municipalities" className="py-16 sm:py-24 bg-[#F1F5F3] dark:bg-[#0b131c] border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Heading, Description & Portals */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase mb-3">
              <Building2 className="h-3.5 w-3.5 text-[#138808]" />
              <span>MUNICIPAL OPERATIONS</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#101828] dark:text-white leading-tight">
              Built for Faster Civic Operations
            </h2>

            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Give municipal teams the visibility they need to prioritize, dispatch and resolve civic issues.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate('/admin')}
                className="bg-[#101828] hover:bg-slate-800 text-white font-bold px-5 h-11 text-xs dark:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                <Landmark className="h-4 w-4 mr-2 text-[#FF9933]" />
                Admin Command Center
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/officer')}
                className="bg-white border-slate-300 text-slate-800 font-semibold px-5 h-11 text-xs hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              >
                <Smartphone className="h-4 w-4 mr-2 text-indigo-600" />
                Officer Portal
              </Button>
            </div>
          </div>

          {/* Right Column: Stylized Representation of Municipal Operations Interface */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-slate-300/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-5 sm:p-6">
              {/* Header simulation */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    WARD OPERATIONS TELEMETRY
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">STATUS: ACTIVE</span>
              </div>

              {/* Operations queue simulation rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                      TICKET #CGN-104 • HIGH PRIORITY
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Water Pipe Rupture & Road Flooding
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Dispatched
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                      TICKET #CGN-098 • RESOLVED
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Garbage Dump Clearing & Sanitization
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Photo Verified
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-xs border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
                      TICKET #CGN-089 • IN PROGRESS
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Streetlight Fixture Replacement
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    Ward 14 Crew
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Underneath: Simple Horizontal Capability List (No cards!) */}
        <div className="mt-12 pt-8 border-t border-slate-300/60 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
            {capabilities.map((cap, idx) => (
              <div key={cap} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
                <span>{cap}</span>
                {idx < capabilities.length - 1 && (
                  <span className="hidden md:inline-block text-slate-300 dark:text-slate-700 ml-4">•</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
