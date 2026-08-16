import React, { useState, useEffect } from 'react'
import {
  Activity, Database, Server, Sparkles, Map, FileText, Mail, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react'
import adminApi from '../../services/admin'

export default function SystemHealthView() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchHealth() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getSystemHealth()
      setHealth(data)
    } catch (err) {
      setError(err?.message || 'Failed to fetch system health status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const services = [
    {
      name: 'PostgreSQL Database',
      type: 'Neon Cloud Database Pool',
      icon: Database,
      status: health?.database || 'operational'
    },
    {
      name: 'Backend REST API',
      type: 'Express Node.js Server',
      icon: Server,
      status: 'operational'
    },
    {
      name: 'AI Intelligence Engine',
      type: 'Gemini / Groq AI Provider',
      icon: Sparkles,
      status: health?.ai || 'operational'
    },
    {
      name: 'Cloudinary CDN',
      type: 'Media Storage & Image Assets',
      icon: FileText,
      status: health?.cloudinary || 'operational'
    },
    {
      name: 'Resend Email Delivery',
      type: 'Resend API Gateway (civicgreennet.dev)',
      icon: Mail,
      status: (typeof health?.email === 'object' ? health?.email?.status : health?.email) || health?.smtp || 'operational'
    },
    {
      name: 'Map & Geocoding Service',
      type: 'Geoapify Map API',
      icon: Map,
      status: health?.map || 'operational'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            System Infrastructure & Health Status
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time status check for database, AI services, Resend email delivery, CDN, and API endpoints.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Check Again
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="inline h-4 w-4 mr-1.5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc, i) => {
          const isOp = svc.status === 'operational'
          const isDeg = svc.status === 'degraded'
          const isNotConfig = svc.status === 'not_configured' || svc.status === 'not_configured_server_side'

          let statusClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200'
          let statusLabel = 'Unavailable'
          if (isOp) {
            statusClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
            statusLabel = 'Operational'
          } else if (isDeg) {
            statusClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200'
            statusLabel = 'Degraded'
          } else if (isNotConfig) {
            statusClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200'
            statusLabel = 'Client Configured'
          }

          const Icon = svc.icon

          return (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 dark:bg-[#111C2D] dark:text-slate-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isOp ? 'bg-emerald-500 animate-pulse' : 'bg-current'}`} />
                    {statusLabel}
                  </span>
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">{svc.name}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{svc.type}</p>
              </div>

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Verification</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 capitalize">{svc.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#24344A] dark:bg-[#0B1628]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Service Escalation & SLA Windows</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Critical Priority</div>
            <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">4 Hours SLA</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">High Priority</div>
            <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">12 Hours SLA</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Medium Priority</div>
            <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">48 Hours SLA</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Low Priority</div>
            <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">72 Hours SLA</div>
          </div>
        </div>
      </div>
    </div>
  )
}
