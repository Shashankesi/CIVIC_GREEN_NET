import React, { useState, useEffect } from 'react'
import { ShieldAlert, AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw, Activity, Layers } from 'lucide-react'
import governanceApi from '../../services/governance'

export default function DataQualityAlertsView() {
  const [dataQuality, setDataQuality] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dq, alt] = await Promise.all([
        governanceApi.getDataQuality(),
        governanceApi.getGovernanceAlerts()
      ])
      setDataQuality(dq)
      setAlerts(alt)
    } catch (err) {
      console.error('Failed to load data quality & alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const dq = dataQuality || {
    integrityScore: 100,
    status: 'OPTIMAL',
    totalComplaints: 0,
    anomalies: {},
    completenessRate: {}
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Data Quality &amp; Governance Alerts</h2>
          <p className="text-xs text-slate-400 mt-0.5">Automated database integrity verification, missing field detection, and rule-based governance alerts.</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quality Score and Completeness Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Integrity Score */}
        <div className="card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">DATA INTEGRITY SCORE</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {dq.status}
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">{dq.integrityScore}</span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {dq.totalComplaints} complaints in PostgreSQL.
          </span>
        </div>

        {/* Anomaly Counters */}
        <div className="md:col-span-2 card p-5 rounded-2xl space-y-3">
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase">Field Completeness &amp; Data Gaps</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">COORDINATES</span>
              <strong className="text-slate-800 dark:text-white text-sm">{dq.completenessRate?.location || 100}%</strong>
              <span className="text-[10px] text-slate-400 block">{dq.anomalies?.missingLocation || 0} missing</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">DEPARTMENT</span>
              <strong className="text-slate-800 dark:text-white text-sm">{dq.completenessRate?.department || 100}%</strong>
              <span className="text-[10px] text-slate-400 block">{dq.anomalies?.missingDepartment || 0} missing</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">SLA DEADLINE</span>
              <strong className="text-slate-800 dark:text-white text-sm">{dq.completenessRate?.sla || 100}%</strong>
              <span className="text-[10px] text-slate-400 block">{dq.anomalies?.missingSla || 0} missing</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">UNASSIGNED ACTIVE</span>
              <strong className="text-amber-600 text-sm">{dq.anomalies?.unassignedActive || 0}</strong>
              <span className="text-[10px] text-slate-400 block">tickets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Governance Rule Alerts */}
      <div className="card p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Rule-Based Governance Alerts</h3>

        {(!Array.isArray(alerts) || alerts.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-400 font-semibold">
            ✓ No active operational alerts. All governance indicators within normal thresholds.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <div
                key={a.id || i}
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs ${
                  a.severity === 'critical'
                    ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : a.severity === 'high'
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 shadow-xs">
                      {a.severity || 'INFO'}
                    </span>
                    <strong className="text-sm">{a.title || 'System Alert'}</strong>
                  </div>
                  <p className="mt-1 text-xs opacity-90 leading-relaxed">{a.description || ''}</p>
                </div>
                <div className="shrink-0 text-right font-black">
                  <span className="text-lg">{a.metricValue != null ? a.metricValue : '—'}</span>
                  {a.thresholdValue != null && (
                    <span className="text-[10px] opacity-75 block">Threshold: {a.thresholdValue}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
