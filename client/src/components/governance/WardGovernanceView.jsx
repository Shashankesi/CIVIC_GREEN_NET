import React, { useState, useEffect } from 'react'
import { MapPin, ArrowUpRight, Flame, Repeat, ShieldCheck, CheckCircle2 } from 'lucide-react'
import governanceApi from '../../services/governance'

export default function WardGovernanceView({ onNavigateToMap }) {
  const [timeframe, setTimeframe] = useState('30d')
  const [wards, setWards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWards()
  }, [timeframe])

  const loadWards = async () => {
    setLoading(true)
    try {
      const data = await governanceApi.getWardScorecards({ timeframe })
      setWards(data)
    } catch (err) {
      console.error('Failed to load ward scorecards:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Municipal Ward &amp; Zone Scorecards</h2>
          <p className="text-xs text-slate-400 mt-0.5">PostGIS boundary analytics, local resolution rates, recurring defect zones, and AI hotspots.</p>
        </div>
      </div>

      {/* Ward Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wards.map(w => (
          <div key={w.id} className="card p-5 rounded-2xl space-y-3.5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  WARD {w.wardNumber}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{w.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{w.resolutionRate}%</span>
                <span className="text-[10px] text-slate-400 block">Resolution</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">TOTAL</span>
                <strong className="text-slate-800 dark:text-white text-sm">{w.totalComplaints}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">RESOLVED</span>
                <strong className="text-emerald-600 text-sm">{w.resolved}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">SLA</span>
                <strong className="text-teal-600 text-sm">{w.slaCompliance}%</strong>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Top Defect Category:</span>
                <strong className="capitalize text-slate-800 dark:text-white">{w.topCategory}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active AI Hotspots:</span>
                <strong className={w.hotspotCount > 0 ? 'text-amber-600 font-bold' : ''}>{w.hotspotCount}</strong>
              </div>
            </div>

            {onNavigateToMap && (
              <button
                onClick={onNavigateToMap}
                className="w-full py-2 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Inspect on GIS Map</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
