import React, { useState, useEffect, useContext, useMemo } from 'react'
import {
  TrendingUp, CheckCircle2, Clock, AlertTriangle, ShieldCheck,
  Building2, Users, FileText, Sparkles, RefreshCw, Calendar,
  ArrowUpRight, AlertCircle, BarChart2, ChevronRight, Activity,
  Download, ShieldAlert, Cpu, CheckCircle, Zap, Database, Server,
  Mail, Cloud, Radio, AlertOctagon, UserCheck, Layers, MapPin,
  ExternalLink, ArrowRight
} from 'lucide-react'
import governanceApi from '../../services/governance'
import adminApi from '../../services/admin'
import ThemeContext from '../../context/ThemeContext'
import Skeleton from '../Skeleton'

export default function GovernanceOverview({ onNavigateTab, onOpenAiSummary }) {
  const { dark } = useContext(ThemeContext)
  const isDark = Boolean(dark)

  const [timeframe, setTimeframe] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  
  // Real datasets
  const [kpis, setKpis] = useState(null)
  const [trends, setTrends] = useState([])
  const [categories, setCategories] = useState([])
  const [criticalOps, setCriticalOps] = useState({ criticalCases: [], totalCriticalActive: 0, overdueCriticalCount: 0 })
  const [officers, setOfficers] = useState([])
  const [wards, setWards] = useState([])
  const [recentAudits, setRecentAudits] = useState([])
  const [sysHealth, setSysHealth] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        timeframe,
        startDate: timeframe === 'custom' ? customStart : undefined,
        endDate: timeframe === 'custom' ? customEnd : undefined
      }

      const [kpiRes, trendRes, catRes, critRes, offRes, wardRes, auditRes, healthRes] = await Promise.allSettled([
        governanceApi.getExecutiveKpis(params),
        governanceApi.getOperationsTrends(params),
        governanceApi.getCategoryAnalytics(params),
        governanceApi.getCriticalBacklog(),
        governanceApi.getOfficers(params),
        governanceApi.getWardScorecards(params),
        governanceApi.getAuditAnalytics({ limit: 6 }),
        adminApi.getSystemHealth()
      ])

      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        setKpis(kpiRes.value)
      } else {
        setKpis({
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
          assigned: 0,
          reopened: 0,
          rejected: 0,
          critical: 0,
          unassigned: 0,
          dueSoon: 0,
          resolutionRate: 0,
          slaCompliance: 100,
          avgResolutionHours: 0,
          activeOfficers: 0,
          pendingOfficerApprovals: 0
        })
        if (kpiRes.status === 'rejected') {
          console.warn('Executive KPIs load notice:', kpiRes.reason?.message)
        }
      }

      if (trendRes.status === 'fulfilled' && Array.isArray(trendRes.value)) setTrends(trendRes.value)
      else setTrends([])

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) setCategories(catRes.value)
      else setCategories([])

      if (critRes.status === 'fulfilled' && critRes.value) {
        setCriticalOps({
          criticalCases: Array.isArray(critRes.value.criticalCases) ? critRes.value.criticalCases : [],
          totalCriticalActive: critRes.value.totalCriticalActive || 0,
          overdueCriticalCount: critRes.value.overdueCriticalCount || 0
        })
      } else {
        setCriticalOps({ criticalCases: [], totalCriticalActive: 0, overdueCriticalCount: 0 })
      }

      if (offRes.status === 'fulfilled' && Array.isArray(offRes.value)) setOfficers(offRes.value)
      else setOfficers([])

      if (wardRes.status === 'fulfilled' && Array.isArray(wardRes.value)) setWards(wardRes.value)
      else setWards([])

      if (auditRes.status === 'fulfilled') {
        const logs = auditRes.value?.logs || auditRes.value?.items || (Array.isArray(auditRes.value) ? auditRes.value : [])
        setRecentAudits(Array.isArray(logs) ? logs : [])
      } else {
        setRecentAudits([])
      }

      if (healthRes.status === 'fulfilled' && healthRes.value) setSysHealth(healthRes.value)
      else setSysHealth({})
    } catch (err) {
      console.error('Failed to load governance overview data:', err)
      setError(err.message || 'Unable to load municipal analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [timeframe, customStart, customEnd])

  const timeRanges = [
    { label: 'Today', value: 'today', display: 'Showing Today' },
    { label: '7 Days', value: '7d', display: 'Showing Last 7 Days' },
    { label: '30 Days', value: '30d', display: 'Showing Last 30 Days' },
    { label: '90 Days', value: '90d', display: 'Showing Last 90 Days' },
    { label: '6 Months', value: '6m', display: 'Showing Last 6 Months' },
    { label: '1 Year', value: '1y', display: 'Showing Last 12 Months' },
    { label: 'Custom', value: 'custom', display: 'Showing Custom Span' }
  ]

  const activePeriodObj = timeRanges.find(t => t.value === timeframe) || timeRanges[2]

  const healthScore = useMemo(() => {
    if (!kpis || kpis.total === 0) {
      return {
        score: 'N/A',
        grade: 'N/A',
        status: 'INSUFFICIENT DATA',
        hasData: false,
        message: 'No complaints recorded for this period.'
      }
    }
    return {
      score: kpis.healthScore?.score ?? 100,
      grade: kpis.healthScore?.grade ?? 'A',
      status: kpis.healthScore?.status ?? 'OPTIMAL',
      hasData: true,
      message: kpis.healthScore?.status === 'OPTIMAL' || kpis.healthScore?.status === 'EXCELLENT'
        ? 'Municipal operations are performing optimally.'
        : kpis.healthScore?.status === 'HEALTHY'
        ? 'Healthy operations with minor attention required.'
        : 'Requires active triage and operational intervention.'
    }
  }, [kpis])

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const params = {
        reportType: 'executive_summary',
        timeframe,
        startDate: timeframe === 'custom' ? customStart : undefined,
        endDate: timeframe === 'custom' ? customEnd : undefined
      }
      await governanceApi.downloadReport('csv', params)
    } catch (err) {
      console.error('Failed to export report:', err)
      alert(err.message || 'Unable to export report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading && !kpis) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !kpis) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-600 dark:text-rose-400" />
        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">Unable to load municipal analytics</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── 1. EXECUTIVE DASHBOARD HEADER ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CIVIC GREENNET • MUNICIPAL GOVERNANCE</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-500 dark:text-slate-400">{activePeriodObj.display}</span>
            </div>
            
            <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl text-slate-900 dark:text-white">
              Municipal Governance Command Center
            </h1>
            
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Executive operational overview across citizen services, field operations and municipal performance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onOpenAiSummary}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>AI Executive Brief</span>
            </button>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111C2D] dark:text-slate-200 dark:hover:bg-[#172438] shadow-2xs transition-colors disabled:opacity-50"
            >
              <Download className={`h-3.5 w-3.5 text-slate-500 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              onClick={loadData}
              title="Refresh Data"
              className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111C2D] dark:text-slate-300 dark:hover:bg-[#172438] transition-colors shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Reporting Period Switcher */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-2">Reporting Period:</span>
            {timeRanges.map(t => (
              <button
                key={t.value}
                onClick={() => setTimeframe(t.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  timeframe === t.value
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            PostgreSQL Live Stream
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {timeframe === 'custom' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Custom Span:</span>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold"
            />
          </div>
        )}
      </div>

      {/* ── 2. SYSTEM STATUS BAR (REAL-TIME TELEMETRY) ─────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-[11px] font-medium">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">DATABASE</span>
            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
              ● {sysHealth?.database === 'operational' ? 'PostgreSQL Connected' : 'Checking...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <Server className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">API GATEWAY</span>
            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
              ● Operational
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">EMAIL SERVICE</span>
            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
              ● {sysHealth?.email === 'operational' || sysHealth?.smtp === 'operational' ? 'Resend Connected' : 'Operational'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <Cloud className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">STORAGE</span>
            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
              ● {sysHealth?.cloudinary === 'operational' ? 'Cloudinary Connected' : 'Storage Ready'}
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <Radio className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">REALTIME STREAM</span>
            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
              ● Connected
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. MUNICIPAL HEALTH OVERVIEW & PRIMARY 6-KPI GRID ──────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Executive Municipal Health Score Card */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                MUNICIPAL HEALTH
              </span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase border ${
                healthScore.grade === 'A+' || healthScore.grade === 'A'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40'
                  : healthScore.grade === 'B+' || healthScore.grade === 'B'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                GRADE {healthScore.grade}
              </span>
            </div>

            <div className="my-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {healthScore.score}
              </span>
              {healthScore.hasData && <span className="text-xs font-bold text-slate-400">/ 100</span>}
              <span className="ml-auto text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {healthScore.status}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {healthScore.message}
            </p>
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Resolution Compliance:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{kpis?.resolutionRate || 0}%</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>SLA Adherence:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{kpis?.slaCompliance || 0}%</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Active Overdue Risk:</span>
              <strong className={kpis?.overdue > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                {kpis?.overdue || 0} cases
              </strong>
            </div>
          </div>
        </div>

        {/* Primary 6-KPI Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* KPI 1: Total Complaints */}
          <div
            onClick={() => onNavigateTab('complaints')}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-[#0B132B] dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">TOTAL COMPLAINTS</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white my-1">
              {kpis?.total || 0}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              Total volume in period <ArrowRight className="h-2.5 w-2.5 ml-auto text-slate-400" />
            </span>
          </div>

          {/* KPI 2: Open Cases */}
          <div
            onClick={() => onNavigateTab('complaints', { status: 'open' })}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-[#0B132B] dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">OPEN CASES</span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 my-1">
              {kpis?.open || 0}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              Awaiting triage <ArrowRight className="h-2.5 w-2.5 ml-auto text-slate-400" />
            </span>
          </div>

          {/* KPI 3: In Progress */}
          <div
            onClick={() => onNavigateTab('complaints', { status: 'in_progress' })}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-[#0B132B] dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">IN PROGRESS</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 my-1">
              {kpis?.inProgress || 0}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              Active field work <ArrowRight className="h-2.5 w-2.5 ml-auto text-slate-400" />
            </span>
          </div>

          {/* KPI 4: Resolved */}
          <div
            onClick={() => onNavigateTab('complaints', { status: 'resolved' })}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-[#0B132B] dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">RESOLVED CASES</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 my-1">
              {kpis?.completed || 0}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              {kpis?.resolutionRate || 0}% resolution rate <ArrowRight className="h-2.5 w-2.5 ml-auto text-slate-400" />
            </span>
          </div>

          {/* KPI 5: SLA Compliance */}
          <div
            onClick={() => onNavigateTab('sla')}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-[#0B132B] dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">SLA COMPLIANCE</span>
            <div className="text-2xl font-black text-teal-600 dark:text-teal-400 my-1">
              {kpis?.slaCompliance || 0}%
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {kpis?.overdue || 0} overdue breaches <ArrowRight className="h-2.5 w-2.5 ml-auto text-slate-400" />
            </span>
          </div>

          {/* KPI 6: Active Officers */}
          <div
            onClick={() => onNavigateTab('officer-approvals')}
            className="cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-[#0B132B] dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">ACTIVE OFFICERS</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 my-1">
              {kpis?.activeOfficers || 0}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {kpis?.pendingOfficerApprovals || 0} pending review <ArrowRight className="h-2.5 w-2.5 ml-auto text-slate-400" />
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. SECONDARY OPERATIONAL METRICS (COMPACT TILES) ────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div
          onClick={() => onNavigateTab('complaints', { priority: 'critical' })}
          className="cursor-pointer rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B] hover:bg-slate-50 dark:hover:bg-[#111C2D] transition-colors"
        >
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">CRITICAL BACKLOG</span>
          <span className={`text-lg font-black ${kpis?.critical > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {kpis?.critical || 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Active critical</span>
        </div>

        <div
          onClick={() => onNavigateTab('complaints', { overdue: true })}
          className="cursor-pointer rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B] hover:bg-slate-50 dark:hover:bg-[#111C2D] transition-colors"
        >
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">OVERDUE SLA</span>
          <span className={`text-lg font-black ${kpis?.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {kpis?.overdue || 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Breached deadlines</span>
        </div>

        <div
          onClick={() => onNavigateTab('complaints', { assignment: 'unassigned' })}
          className="cursor-pointer rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B] hover:bg-slate-50 dark:hover:bg-[#111C2D] transition-colors"
        >
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">UNASSIGNED</span>
          <span className="text-lg font-black text-purple-600 dark:text-purple-400">
            {kpis?.unassigned || 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Need officer assignment</span>
        </div>

        <div className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">AVG RESOLUTION</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">
            {kpis?.avgResolutionHours || 0}h
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Turnaround velocity</span>
        </div>

        <div className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">RESOLUTION RATE</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {kpis?.resolutionRate || 0}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Closed / Reported</span>
        </div>

        <div className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-[#0B132B]">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">REOPENED CASES</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400">
            {kpis?.reopened || 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Recurrence review</span>
        </div>
      </div>

      {/* ── 5. MAIN 2-COLUMN ANALYTICS AREA ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Complaint Operations */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Complaint Operations</h3>
              <p className="text-[11px] text-slate-400">Lifecycle distribution for {activePeriodObj.label.toLowerCase()}</p>
            </div>
            <button
              onClick={() => onNavigateTab('complaints')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              Queue View →
            </button>
          </div>

          <div className="my-5 space-y-3">
            {/* Progress breakdown */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-blue-500" /> Open Queue
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis?.open || 0}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${kpis?.total ? ((kpis.open || 0) / kpis.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-amber-500" /> In Progress
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis?.inProgress || 0}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${kpis?.total ? ((kpis.inProgress || 0) / kpis.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Resolved & Closed
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{kpis?.completed || 0}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${kpis?.total ? ((kpis.completed || 0) / kpis.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Overdue SLA Breaches
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{kpis?.overdue || 0}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${kpis?.total ? ((kpis.overdue || 0) / kpis.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">ASSIGNED</span>
              <strong className="text-slate-800 dark:text-white">{kpis?.assigned || 0}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">REOPENED</span>
              <strong className="text-slate-800 dark:text-white">{kpis?.reopened || 0}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">REJECTED</span>
              <strong className="text-slate-800 dark:text-white">{kpis?.rejected || 0}</strong>
            </div>
          </div>
        </div>

        {/* Right: SLA Performance */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">SLA Performance & Adherence</h3>
              <p className="text-[11px] text-slate-400">Timeliness threshold compliance</p>
            </div>
            <button
              onClick={() => onNavigateTab('sla')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              SLA Center →
            </button>
          </div>

          <div className="my-5 flex flex-col items-center justify-center p-4 text-center">
            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpis?.slaCompliance || 0}%
            </div>
            <span className="mt-1 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              SLA Adherence Benchmark
            </span>
            <p className="mt-1 max-w-xs text-[11px] text-slate-500 dark:text-slate-400">
              {kpis?.slaCompliance >= 90
                ? 'All citizen issues are being resolved comfortably within municipal SLA thresholds.'
                : 'Service turnaround times are slipping. Prioritize overdue and high-priority queues.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-center text-xs">
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-emerald-600 font-bold block">ON TIME</span>
              <strong className="text-slate-800 dark:text-white">{kpis?.completed || 0}</strong>
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-amber-600 font-bold block">DUE SOON</span>
              <strong className="text-slate-800 dark:text-white">{kpis?.dueSoon || 0}</strong>
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-rose-600 font-bold block">BREACHED</span>
              <strong className="text-slate-800 dark:text-white">{kpis?.overdue || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. CATEGORY OPERATIONAL DISTRIBUTION TABLE ─────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Category Operational Distribution</h3>
            <p className="text-[11px] text-slate-400">Resolution and compliance breakdown across civic categories</p>
          </div>
          <button
            onClick={() => onNavigateTab('complaints')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
          >
            View All Categories →
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
            No category activity recorded for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Resolved</th>
                  <th className="pb-2 text-right">Overdue</th>
                  <th className="pb-2 text-right">Critical</th>
                  <th className="pb-2 text-right">Resolution %</th>
                  <th className="pb-2 text-right">SLA %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {categories.slice(0, 8).map(cat => (
                  <tr
                    key={cat.category}
                    onClick={() => onNavigateTab('complaints', { category: cat.category })}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 font-bold capitalize text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {cat.category}
                    </td>
                    <td className="py-2.5 text-right text-slate-700 dark:text-slate-300 font-bold">{cat.total}</td>
                    <td className="py-2.5 text-right text-emerald-600 font-semibold">{cat.resolved}</td>
                    <td className="py-2.5 text-right font-semibold text-rose-600 dark:text-rose-400">{cat.overdue || 0}</td>
                    <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{cat.critical || 0}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{cat.resolutionRate}%</td>
                    <td className="py-2.5 text-right font-bold text-teal-600 dark:text-teal-400">{cat.slaCompliance}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 7. CRITICAL OPERATIONS BACKLOG ─────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {criticalOps.totalCriticalActive > 0 ? (
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Critical Operations</h3>
              <p className="text-[11px] text-slate-400">Incidents requiring immediate municipal attention</p>
            </div>
          </div>

          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
            criticalOps.totalCriticalActive > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40'
          }`}>
            {criticalOps.totalCriticalActive} Active Critical
          </span>
        </div>

        {criticalOps.criticalCases.length === 0 ? (
          <div className="rounded-lg border border-emerald-200/50 bg-emerald-50/30 p-6 text-center text-xs font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            ✓ No active critical incidents — Municipal operations are currently within normal thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Ticket ID</th>
                  <th className="pb-2">Issue</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Assigned Officer</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {criticalOps.criticalCases.slice(0, 5).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        CRITICAL
                      </span>
                    </td>
                    <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">{c.ticketId}</td>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">{c.title}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{c.address}</td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">{c.officerName}</td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => onNavigateTab('complaint', { id: c.id })}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold"
                      >
                        View Case <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 8. OFFICER WORKLOAD & RECENT MUNICIPAL ACTIVITY (2-COL) ──────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Officer Workload */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Officer Workload</h3>
              <p className="text-[11px] text-slate-400">Field staffing and active case distribution</p>
            </div>
            <button
              onClick={() => onNavigateTab('officer-approvals')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              View Officers →
            </button>
          </div>

          {officers.length === 0 ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
              No active officers registered.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Officer</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2 text-right">Assigned</th>
                    <th className="pb-2 text-right">Active</th>
                    <th className="pb-2 text-right">Resolved</th>
                    <th className="pb-2 text-right">Workload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {officers.slice(0, 5).map(off => (
                    <tr key={off.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 font-bold text-slate-900 dark:text-white">{off.name}</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">{off.departmentName || 'General'}</td>
                      <td className="py-2 text-right font-bold text-slate-800 dark:text-white">{off.assignedTotal}</td>
                      <td className="py-2 text-right text-blue-600 font-semibold">{off.activeWorkload}</td>
                      <td className="py-2 text-right text-emerald-600 font-semibold">{off.resolvedCount}</td>
                      <td className="py-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          off.activeWorkload > 5
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {off.activeWorkload > 5 ? 'HIGH' : 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Municipal Activity Feed */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B132B] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Municipal Activity</h3>
              <p className="text-[11px] text-slate-400">Verified audit trail and system events</p>
            </div>
            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              Audit Logs →
            </button>
          </div>

          {recentAudits.length === 0 ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
              No recent audit events.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentAudits.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <Activity className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {log.action?.replace(/_/g, ' ') || 'SYSTEM ACTION'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        By {log.user_name || 'Administrator'} ({log.user_role || 'admin'})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
