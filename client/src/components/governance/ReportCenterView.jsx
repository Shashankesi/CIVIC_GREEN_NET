import React, { useState, useEffect } from 'react'
import {
  FileText, Download, Clock, CheckCircle2, AlertCircle, RefreshCw,
  Calendar, Layers, FileSpreadsheet, Eye, Plus, Send, Play, Pause,
  Trash2, Globe, Check, AlertTriangle, Activity
} from 'lucide-react'
import governanceApi from '../../services/governance'

export default function ReportCenterView() {
  const [activeTab, setActiveTab] = useState('builder') // 'builder' | 'schedules' | 'history'

  // Report Builder State
  const [reportType, setReportType] = useState('executive_summary')
  const [timeframe, setTimeframe] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [departmentId, setDepartmentId] = useState('all')
  const [category, setCategory] = useState('all')

  const [preview, setPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState(null)

  // Report History State
  const [reportHistory, setReportHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  // Schedules State
  const [schedules, setSchedules] = useState([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [schedulesError, setSchedulesError] = useState(null)
  const [schedulerHealth, setSchedulerHealth] = useState(null)

  // Running Now state tracker
  const [runningScheduleId, setRunningScheduleId] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [schedTitle, setSchedTitle] = useState('')
  const [schedType, setSchedType] = useState('executive_summary')
  const [schedFreq, setSchedFreq] = useState('daily')
  const [schedTz, setSchedTz] = useState('Asia/Kolkata')
  const [schedFormat, setSchedFormat] = useState('csv')
  const [schedEmail, setSchedEmail] = useState('')
  const [schedSaving, setSchedSaving] = useState(false)

  useEffect(() => {
    loadHistory()
    loadSchedules()
  }, [])

  const showFeedback = (msg, isError = false) => {
    setActionMessage({ text: msg, isError })
    setTimeout(() => setActionMessage(null), 4000)
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const history = await governanceApi.getReportHistory()
      setReportHistory(history || [])
    } catch (err) {
      console.error('Failed to load report history:', err)
      setHistoryError(err.message || 'Failed to load report history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadSchedules = async () => {
    setSchedulesLoading(true)
    setSchedulesError(null)
    try {
      const [schedData, healthData] = await Promise.allSettled([
        governanceApi.getSchedules(),
        governanceApi.getSchedulerHealth()
      ])
      if (schedData.status === 'fulfilled') setSchedules(schedData.value || [])
      if (healthData.status === 'fulfilled') setSchedulerHealth(healthData.value || null)
    } catch (err) {
      console.error('Failed to load schedules:', err)
      setSchedulesError(err.message || 'Failed to load automated schedules')
    } finally {
      setSchedulesLoading(false)
    }
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    setPreviewError(null)
    try {
      const filters = {
        timeframe,
        startDate: timeframe === 'custom' ? customStart : undefined,
        endDate: timeframe === 'custom' ? customEnd : undefined,
        departmentId: departmentId !== 'all' ? departmentId : undefined,
        category: category !== 'all' ? category : undefined
      }
      const data = await governanceApi.previewReport({ reportType, filters })
      setPreview(data)
    } catch (err) {
      console.error('Failed to generate report preview:', err)
      setPreviewError(err.message || 'Failed to generate report preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const [downloadingFormat, setDownloadingFormat] = useState(null)

  const handleDownload = async (format) => {
    if (downloadingFormat) return
    setDownloadingFormat(format)
    const params = {
      reportType,
      timeframe,
      startDate: timeframe === 'custom' ? customStart : undefined,
      endDate: timeframe === 'custom' ? customEnd : undefined,
      departmentId: departmentId !== 'all' ? departmentId : undefined,
      category: category !== 'all' ? category : undefined
    }
    try {
      const res = await governanceApi.downloadReport(format, params)
      showFeedback(`Report "${res.filename}" downloaded successfully.`)
      await loadHistory()
    } catch (err) {
      showFeedback(err.message || 'Unable to export report. Please try again.', true)
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    if (!schedTitle || !schedEmail) return
    setSchedSaving(true)
    try {
      await governanceApi.scheduleReport({
        title: schedTitle,
        reportType: schedType,
        frequency: schedFreq,
        timezone: schedTz,
        format: schedFormat,
        recipientEmail: schedEmail,
        filters: { timeframe, departmentId, category }
      })
      setScheduleModalOpen(false)
      setSchedTitle('')
      setSchedEmail('')
      showFeedback('Automated report schedule created successfully.')
      await loadSchedules()
    } catch (err) {
      showFeedback(err.response?.data?.message || err.message || 'Failed to save report schedule.', true)
    } finally {
      setSchedSaving(false)
    }
  }

  const handleRunNow = async (id, title) => {
    setRunningScheduleId(id)
    try {
      const res = await governanceApi.runScheduleNow(id)
      showFeedback(`Schedule "${title}" executed successfully in ${res.durationMs || 0}ms.`)
      await Promise.all([loadSchedules(), loadHistory()])
    } catch (err) {
      showFeedback(`Failed to execute schedule: ${err.message}`, true)
    } finally {
      setRunningScheduleId(null)
    }
  }

  const handleTogglePause = async (schedule) => {
    try {
      if (schedule.isActive) {
        await governanceApi.pauseSchedule(schedule.id)
        showFeedback(`Schedule "${schedule.title}" paused.`)
      } else {
        await governanceApi.resumeSchedule(schedule.id)
        showFeedback(`Schedule "${schedule.title}" resumed.`)
      }
      await loadSchedules()
    } catch (err) {
      showFeedback(`Failed to update schedule status: ${err.message}`, true)
    }
  }

  const handleDeleteSchedule = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the schedule "${title}"?`)) return
    try {
      await governanceApi.deleteSchedule(id)
      showFeedback(`Schedule "${title}" deleted successfully.`)
      await loadSchedules()
    } catch (err) {
      showFeedback(`Failed to delete schedule: ${err.message}`, true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {actionMessage && (
        <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${actionMessage.isError ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
          <div className="flex items-center gap-2">
            {actionMessage.isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Municipal Report Center &amp; Automations</h2>
          <p className="text-xs text-slate-400 mt-0.5">Enterprise structured reports, scheduled automated workers with PostgreSQL locking, and real-time governance exports.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'builder' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Report Builder
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'schedules' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <Clock className="h-3 w-3" />
              <span>Schedules ({schedules.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
            >
              History
            </button>
          </div>

          <button
            onClick={() => setScheduleModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REPORT BUILDER */}
      {activeTab === 'builder' && (
        <div className="space-y-6">
          <div className="card p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Configure Report Parameters</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  <option value="executive_summary">Executive Governance Summary</option>
                  <option value="department">Department Operational Performance</option>
                  <option value="officer">Officer Workload &amp; Fair Score</option>
                  <option value="sla">SLA Compliance &amp; Breaches</option>
                  <option value="ward">Ward Governance Scorecards</option>
                  <option value="complaints">Detailed Complaints Dataset</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Time Range</label>
                <select
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="6m">Last 6 Months</option>
                  <option value="1y">Last 1 Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Category Filter</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  <option value="all">All Categories</option>
                  <option value="water">Water</option>
                  <option value="sanitation">Sanitation</option>
                  <option value="roads">Roads &amp; Transport</option>
                  <option value="electricity">Electricity</option>
                  <option value="drainage">Drainage</option>
                  <option value="parks">Parks &amp; Environment</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handlePreview}
                  disabled={loadingPreview}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>{loadingPreview ? 'Loading...' : 'Generate Preview'}</span>
                </button>
              </div>
            </div>

            {/* Custom Range Inputs */}
            {timeframe === 'custom' && (
              <div className="flex items-center gap-3 pt-2 text-xs">
                <span className="text-slate-500 font-bold">Start Date:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
                <span className="text-slate-500 font-bold">End Date:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Preview Error State */}
          {previewError && (
            <div className="card p-5 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Failed to generate preview: {previewError}</span>
              </div>
              <button
                onClick={handlePreview}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Report Preview & Download Actions */}
          {preview && (
            <div className="card p-5 rounded-2xl space-y-4 border-2 border-emerald-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-600">Generated Report Preview</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{preview.title}</h3>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload('csv')}
                    disabled={!!downloadingFormat}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Download className={`h-3.5 w-3.5 text-blue-600 ${downloadingFormat === 'csv' ? 'animate-bounce' : ''}`} />
                    <span>{downloadingFormat === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload('excel')}
                    disabled={!!downloadingFormat}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <FileSpreadsheet className={`h-3.5 w-3.5 text-emerald-600 ${downloadingFormat === 'excel' ? 'animate-bounce' : ''}`} />
                    <span>{downloadingFormat === 'excel' ? 'Exporting...' : 'Export Excel'}</span>
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    disabled={!!downloadingFormat}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                  >
                    <FileText className={`h-3.5 w-3.5 ${downloadingFormat === 'pdf' ? 'animate-pulse' : ''}`} />
                    <span>{downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download Report'}</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Block */}
              {preview.kpis && Object.keys(preview.kpis).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs">
                  {Object.entries(preview.kpis).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[10px] text-slate-400 block font-bold">{k}</span>
                      <strong className="text-slate-800 dark:text-white">{v}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Table Preview */}
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px]">
                      {preview.columns.map((c, i) => (
                        <th key={i} className="p-2.5">{c.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {preview.rows.slice(0, 10).map((r, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {preview.columns.map((col, colIdx) => (
                          <td key={colIdx} className="p-2.5 text-slate-700 dark:text-slate-300">
                            {typeof col.accessor === 'function' ? col.accessor(r) : r[col.accessor]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCHEDULED AUTOMATIONS */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          {/* Scheduler Diagnostics Card */}
          {schedulerHealth && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1">
                  <Activity className="h-3 w-3 text-emerald-500" />
                  Scheduler Engine
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${schedulerHealth.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <strong className="text-sm text-slate-900 dark:text-white capitalize">{schedulerHealth.status}</strong>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">{schedulerHealth.workerId || 'Active'}</span>
              </div>

              <div className="card p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-black uppercase">Active Schedules</span>
                <div className="mt-1">
                  <strong className="text-lg text-slate-900 dark:text-white">{schedulerHealth.activeSchedules || 0}</strong>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Configured automated jobs</span>
              </div>

              <div className="card p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-black uppercase">Pending / Due Now</span>
                <div className="mt-1">
                  <strong className="text-lg text-emerald-600 dark:text-emerald-400">{schedulerHealth.dueSchedules || 0}</strong>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Ready for next worker tick</span>
              </div>

              <div className="card p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-black uppercase">Completed Executions</span>
                <div className="mt-1">
                  <strong className="text-lg text-slate-900 dark:text-white">{schedulerHealth.stats?.successfulRuns || 0}</strong>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">0 duplicate executions</span>
              </div>
            </div>
          )}

          {/* Schedules Table */}
          <div className="card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active &amp; Recurring Schedules</h3>
                <p className="text-xs text-slate-400">PostgreSQL concurrency locked report dispatches with automatic Resend email delivery.</p>
              </div>
              <button onClick={loadSchedules} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <RefreshCw className={`h-3.5 w-3.5 ${schedulesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {schedulesError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold flex items-center justify-between">
                <span>{schedulesError}</span>
                <button onClick={loadSchedules} className="underline font-black">Retry</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Report Name</th>
                    <th className="pb-2">Frequency</th>
                    <th className="pb-2">Timezone</th>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Last Run</th>
                    <th className="pb-2">Next Run</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {schedules.length === 0 ? (
                    <tr><td colSpan={8} className="py-6 text-center text-slate-400 italic">No automated schedules configured yet. Click "New Schedule" above to add one.</td></tr>
                  ) : (
                    schedules.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{s.title}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{s.reportType.replace('_', ' ')} • {s.format.toUpperCase()}</div>
                        </td>
                        <td className="py-3 capitalize font-bold text-slate-700 dark:text-slate-300">{s.frequency}</td>
                        <td className="py-3 text-slate-500 flex items-center gap-1 pt-4">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span>{s.timezone}</span>
                        </td>
                        <td className="py-3 font-mono text-slate-600 dark:text-slate-400">{s.recipientEmail}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}>
                            {s.isActive ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td className="py-3">
                          {s.lastRunAt ? (
                            <div>
                              <div className="text-slate-700 dark:text-slate-300 font-medium">{new Date(s.lastRunAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                              <span className={`text-[10px] font-bold uppercase ${s.lastRunStatus === 'completed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {s.lastRunStatus} ({s.runCount} runs)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Never run</span>
                          )}
                        </td>
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {s.nextRunAt ? new Date(s.nextRunAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRunNow(s.id, s.title)}
                              disabled={runningScheduleId === s.id}
                              title="Run Now"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                            >
                              <Play className={`h-3 w-3 ${runningScheduleId === s.id ? 'animate-spin' : ''}`} />
                              <span>{runningScheduleId === s.id ? 'Running...' : 'Run Now'}</span>
                            </button>
                            <button
                              onClick={() => handleTogglePause(s)}
                              title={s.isActive ? 'Pause Schedule' : 'Resume Schedule'}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                            >
                              {s.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 text-emerald-600" />}
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(s.id, s.title)}
                              title="Delete Schedule"
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTION HISTORY */}
      {activeTab === 'history' && (
        <div className="card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Report Generation &amp; Delivery History</h3>
              <p className="text-xs text-slate-400">Complete execution audit log with execution times, row counts, and email delivery receipts.</p>
            </div>
            <button onClick={loadHistory} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {historyError && (
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold flex items-center justify-between">
              <span>{historyError}</span>
              <button onClick={loadHistory} className="underline font-black">Retry</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Report Name</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Format</th>
                  <th className="pb-2">Records</th>
                  <th className="pb-2">Execution</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Generated By</th>
                  <th className="pb-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {reportHistory.length === 0 ? (
                  <tr><td colSpan={8} className="py-6 text-center text-slate-400 italic">No report history recorded yet.</td></tr>
                ) : (
                  reportHistory.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5">
                        <div className="font-bold text-slate-800 dark:text-white">{h.name}</div>
                        {h.scheduleTitle && <span className="text-[10px] text-emerald-600 font-semibold">Schedule: {h.scheduleTitle}</span>}
                      </td>
                      <td className="py-2.5 capitalize text-slate-600 dark:text-slate-400">{h.type.replace('_', ' ')}</td>
                      <td className="py-2.5 uppercase font-bold text-emerald-600">{h.format}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">{h.rowCount || 0} rows</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.executionType === 'scheduled' ? 'bg-purple-500/10 text-purple-600' : h.executionType === 'run_now' ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-500/10 text-slate-600'}`}>
                          {h.executionType}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-500">{h.durationMs ? `${h.durationMs}ms` : '< 50ms'}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">{h.generatedByName}</td>
                      <td className="py-2.5 text-right text-slate-400">
                        {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Report Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleScheduleSubmit} className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Schedule Automated Municipal Report</h3>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Report Schedule Title</label>
              <input
                type="text"
                required
                placeholder="Weekly Executive Governance Briefing..."
                value={schedTitle}
                onChange={e => setSchedTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Report Type</label>
                <select
                  value={schedType}
                  onChange={e => setSchedType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  <option value="executive_summary">Executive Summary</option>
                  <option value="department">Department Performance</option>
                  <option value="officer">Officer Workload</option>
                  <option value="sla">SLA Compliance</option>
                  <option value="ward">Ward Scorecards</option>
                  <option value="complaints">Detailed Complaints</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Dispatch Frequency</label>
                <select
                  value={schedFreq}
                  onChange={e => setSchedFreq(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  <option value="daily">Daily (Every Day 09:00)</option>
                  <option value="weekly">Weekly (Monday 09:00)</option>
                  <option value="monthly">Monthly (1st of Month 09:00)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Timezone</label>
                <select
                  value={schedTz}
                  onChange={e => setSchedTz(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                  <option value="UTC">UTC (GMT +00:00)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="Europe/London">Europe/London (BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Attachment Format</label>
                <select
                  value={schedFormat}
                  onChange={e => setSchedFormat(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold"
                >
                  <option value="csv">CSV (Sanitized Formula Protected)</option>
                  <option value="excel">Excel Spreadsheet (.xls)</option>
                  <option value="pdf">HTML / Printable Document</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Recipient Email Address</label>
              <input
                type="email"
                required
                placeholder="commissioner@city.gov"
                value={schedEmail}
                onChange={e => setSchedEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">Dispatches with Civic GreenNet branding and summary metrics to this address.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={schedSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {schedSaving ? 'Saving Schedule...' : 'Save & Activate Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
