import React, { useEffect, useState, useContext, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, Clock, RefreshCw, CheckCircle2, PlusCircle, Ticket, Map, ArrowRight,
  Sparkles, AlertCircle, Bookmark, MessageSquare, ThumbsUp, MapPin, Zap, Award,
  ShieldCheck, ArrowUpRight, Globe, Download, Check
} from 'lucide-react'
import AuthContext from '../context/AuthContext'
import RealtimeContext from '../context/RealtimeContext'
import citizenApi from '../services/citizen'
import complaintsApi from '../services/complaints'
import AppShell from '../components/AppShell'
import MapView from '../components/MapView'
import StatusBadge from '../ui/StatusBadge'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import { useTranslation } from '../utils/i18n'

const CATEGORY_SHORTCUTS = [
  { id: 'Roads', name: 'Roads & Potholes', icon: '🛣️', desc: 'Potholes, cracks, hazards' },
  { id: 'Sanitation', name: 'Garbage & Waste', icon: '🗑️', desc: 'Uncollected trash, dumping' },
  { id: 'Electricity', name: 'Streetlights & Power', icon: '💡', desc: 'Broken lamps, wire faults' },
  { id: 'Water', name: 'Water Supply', icon: '🚰', desc: 'Leakages, contamination' },
  { id: 'Drainage', name: 'Drainage & Sewage', icon: '🌊', desc: 'Waterlogging, blockage' },
  { id: 'Public Safety', name: 'Public Safety', icon: '🛡️', desc: 'Obstructions, encroachments' },
  { id: 'Parks', name: 'Parks & Greenery', icon: '🌳', desc: 'Overgrowth, park damage' },
  { id: 'Other', name: 'General Municipal', icon: '📋', desc: 'Other civic concerns' }
]

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  const { lastEvent } = useContext(RealtimeContext) || {}
  const { t, lang, setLanguage } = useTranslation()
  const navigate = useNavigate()

  const [dashboardData, setDashboardData] = useState(null)
  const [pulseData, setPulseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [offlineDraft, setOfflineDraft] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  // Check for offline draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cgn_offline_complaint_draft')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.title || parsed?.description) {
          setOfflineDraft(parsed)
        }
      }
    } catch (e) {}

    // PWA Install prompt listener
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashRes, pulseRes] = await Promise.allSettled([
        citizenApi.getDashboard(),
        citizenApi.getCommunityPulse({ limit: 4, timeframe: 30 })
      ])

      if (dashRes.status === 'fulfilled' && dashRes.value) {
        setDashboardData(dashRes.value)
      } else {
        const statsRes = await complaintsApi.listComplaints({ mine: true, limit: 6 })
        setDashboardData({
          stats: { total: statsRes?.items?.length || 0, open: 0, in_progress: 0, resolved: 0, reopened: 0 },
          recentComplaints: statsRes?.items || [],
          activeAlert: null,
          followedComplaints: [],
          contribution: { totalPoints: 0, currentLevel: { name: 'New Contributor', badgeIcon: '🌱' } }
        })
      }

      if (pulseRes.status === 'fulfilled' && pulseRes.value) {
        setPulseData(pulseRes.value)
      }
    } catch (e) {
      console.error('Citizen Dashboard Load Error:', e)
      setError('Unable to load your citizen dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Real-time synchronization when SSE event arrives
  useEffect(() => {
    if (!lastEvent) return
    if (
      lastEvent.type === 'COMPLAINT_STATUS_CHANGED' ||
      lastEvent.type === 'COMPLAINT_CREATED' ||
      lastEvent.type === 'RESOLUTION_VERIFIED' ||
      lastEvent.type === 'COMPLAINT_REOPENED' ||
      lastEvent.type === 'COMPLAINT_VOTED'
    ) {
      loadDashboard()
    }
  }, [lastEvent, loadDashboard])

  const stats = dashboardData?.stats || { total: 0, open: 0, in_progress: 0, resolved: 0, reopened: 0, upvotesReceived: 0, followedCount: 0 }
  const recentComplaints = dashboardData?.recentComplaints || []
  const activeAlert = dashboardData?.activeAlert || null
  const followedComplaints = dashboardData?.followedComplaints || []
  const contribution = dashboardData?.contribution || {
    totalPoints: 0,
    currentLevel: { name: 'New Contributor', badgeIcon: '🌱', progressPercent: 0 },
    streak: 1
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('good_morning')
    if (h < 18) return t('good_afternoon')
    return t('good_evening')
  }

  const firstName = user?.name?.split(' ')[0] || 'Citizen'

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  return (
    <AppShell title={t('dashboard')}>
      <div className="space-y-6">
        {/* ── 0. LANGUAGE & PWA HEADER BAR ───────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
              <Globe className="h-3.5 w-3.5" /> Language:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-md px-2.5 py-1 font-bold transition-all ${
                  lang === 'en' ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`rounded-md px-2.5 py-1 font-bold transition-all ${
                  lang === 'hi' ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          {deferredPrompt && (
            <button
              onClick={handleInstallPWA}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> {t('install_btn')}
            </button>
          )}
        </div>

        {/* ── 0.1 OFFLINE DRAFT BANNER ───────────────────────────────────── */}
        {offlineDraft && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  {t('offline_draft_notice')}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate max-w-md">
                  "{offlineDraft.title || 'Untitled Draft'}" ({offlineDraft.category || 'General'})
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/complaints/new?restoreDraft=true')}
                className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs"
              >
                {t('restore_draft')}
              </button>
              <button
                onClick={() => {
                  try { localStorage.removeItem('cgn_offline_complaint_draft') } catch (e) {}
                  setOfflineDraft(null)
                }}
                className="rounded-xl bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
              >
                {t('dismiss')}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── 1. WELCOME HERO & CIVIC COMMAND CENTER ───────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 md:p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-emerald-100 backdrop-blur-md border border-white/10">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                  <span>{t('tagline')}</span>
                </div>
                {user?.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold">
                    <ShieldCheck className="h-3 w-3" /> Verified Citizen
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                {greeting()}, {firstName} 👋
              </h1>
              <p className="text-sm text-emerald-100/90 leading-relaxed">
                {stats.total === 0
                  ? t('welcome_citizen')
                  : `You have submitted ${stats.total} civic report${stats.total !== 1 ? 's' : ''} with ${stats.in_progress} actively being resolved by municipal teams.`}
              </p>

              {/* Gamification Level & Contribution Score Ribbon */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2 backdrop-blur-md border border-white/10">
                  <span className="text-xl">{contribution.currentLevel?.badgeIcon || '🌱'}</span>
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-200">
                      {t('civic_level')}
                    </div>
                    <div className="text-xs font-black text-white">
                      {contribution.currentLevel?.name || 'New Contributor'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2 backdrop-blur-md border border-white/10">
                  <Award className="h-4 w-4 text-amber-300" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-200">
                      {t('civic_score')}
                    </div>
                    <div className="text-xs font-black text-white">
                      {contribution.totalPoints || 0} pts
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2 backdrop-blur-md border border-white/10">
                  <Zap className="h-4 w-4 text-orange-300" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-200">
                      {t('civic_streak')}
                    </div>
                    <div className="text-xs font-black text-white">
                      {contribution.streak || 1} {t('days_active')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                onClick={() => navigate('/complaints/new')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-emerald-900 shadow-lg hover:bg-emerald-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <PlusCircle className="h-5 w-5 text-emerald-600" />
                {t('report_issue')}
              </button>

              <button
                onClick={() => navigate('/complaints?view=mine')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-all"
              >
                <Ticket className="h-4 w-4" />
                {t('track_reports')}
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. ACTIVE STATUS ATTENTION BANNER ─────────────────────────────── */}
        {activeAlert && ['in_progress', 'resolved', 'assigned', 'accepted', 'reopened'].includes(activeAlert.status) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border ${
              activeAlert.status === 'resolved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
                : activeAlert.status === 'reopened'
                ? 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
                : 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                activeAlert.status === 'resolved' 
                  ? 'bg-emerald-600 text-white' 
                  : activeAlert.status === 'reopened'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {activeAlert.status === 'resolved' ? <CheckCircle2 className="h-5 w-5" /> : <RefreshCw className="h-5 w-5 animate-spin" />}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {activeAlert.status === 'resolved'
                      ? t('resolution_ready')
                      : activeAlert.status === 'reopened'
                      ? t('reopened_notice')
                      : t('officer_working')}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    #CGN-{String(activeAlert.id).padStart(5, '0')}
                  </span>
                </div>
                <p className="text-xs font-bold mt-0.5 line-clamp-1">{activeAlert.title}</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {activeAlert.status_note || (activeAlert.status === 'resolved' ? 'Resolution proof submitted. Click below to verify and close or request reopening.' : 'Assigned officer is actively addressing your issue.')}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/complaints/${activeAlert.id}`)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 text-xs font-bold hover:opacity-90 shrink-0 transition-opacity"
            >
              {activeAlert.status === 'resolved' ? t('verify_resolution_btn') : t('view_update_btn')} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {/* ── 3. CITIZEN KPI CARDS (Real PostgreSQL counts) ───────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate('/complaints?view=mine')}
            className="group rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-[#0B1628]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t('total_reports')}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {t('view_all')} <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate('/complaints?view=mine&status=in_progress')}
            className="group rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all hover:border-amber-500 hover:shadow-md dark:border-slate-800 dark:bg-[#0B1628]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">{t('in_progress')}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <RefreshCw className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{stats.in_progress}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Being resolved <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate('/complaints?view=mine&status=resolved')}
            className="group rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-[#0B1628]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t('resolved')}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.resolved}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Verified &amp; closed <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate('/complaints?view=followed')}
            className="group rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all hover:border-purple-500 hover:shadow-md dark:border-slate-800 dark:bg-[#0B1628]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">{t('followed_issues')}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <Bookmark className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">{stats.followedCount || 0}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              {stats.upvotesReceived || 0} upvotes received <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        {/* ── 4. QUICK REPORT SHORTCUTS ────────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="h-4.5 w-4.5 text-amber-500" />
                {t('quick_shortcuts')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{t('quick_shortcuts_sub')}</p>
            </div>
            <Link
              to="/complaints/new"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              Full 7-Step Wizard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {CATEGORY_SHORTCUTS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/complaints/new?category=${encodeURIComponent(cat.id)}`)}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-[#0E1B2E] dark:hover:bg-[#11223A]"
              >
                <div>
                  <span className="text-2xl block mb-1.5">{cat.icon}</span>
                  <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {cat.name}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{cat.desc}</div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Report</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. MAIN SPLIT: MY REPORTS & COMMUNITY PULSE ──────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Columns: Citizen's Live Reports */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  {t('my_reports')}
                </h3>
                <p className="text-xs text-slate-400">Live progress tracking for issues you submitted.</p>
              </div>
              <Link
                to="/complaints?view=mine"
                className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400 flex items-center gap-1"
              >
                {t('view_all')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
            ) : error ? (
              <ErrorState title="Unable to load reports" message={error} onRetry={loadDashboard} />
            ) : recentComplaints.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#0B1628]">
                <span className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-3">
                  <PlusCircle className="h-6 w-6" />
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">You haven't reported an issue yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Spot a broken streetlight, pothole, or uncollected garbage? Report it now and earn civic contribution points.
                </p>
                <button
                  onClick={() => navigate('/complaints/new')}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                >
                  <PlusCircle className="h-4 w-4" /> {t('report_issue')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentComplaints.map((c) => {
                  const numId = String(c.id).padStart(5, '0')
                  const imgUrl = c.images?.[0]?.url

                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-[#0B1628] transition-all"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt="Thumbnail"
                              className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs">
                              {c.category?.slice(0, 2)?.toUpperCase() || 'CG'}
                            </span>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-400">#CGN-{numId}</span>
                              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-300">
                                {c.category || 'General'}
                              </span>
                              <StatusBadge status={c.status} />
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {c.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                              {c.address && (
                                <span className="flex items-center gap-1 truncate max-w-[200px]">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {c.address}
                                </span>
                              )}
                              <span>•</span>
                              <span>{new Date(c.created_at).toLocaleDateString()}</span>
                              {c.department_name && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{c.department_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {c.vote_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              <ThumbsUp className="h-3 w-3" /> {c.vote_count}
                            </span>
                          )}
                          <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors">
                            {t('details')} →
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Community Pulse & City Issues Map */}
          <div className="space-y-6">
            {/* Map Preview Card */}
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Map className="h-4 w-4 text-emerald-600" />
                    {t('city_map')}
                  </h3>
                  <p className="text-[11px] text-slate-400">Live civic density &amp; local reports</p>
                </div>
                <Link
                  to="/map"
                  className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400 flex items-center gap-1"
                >
                  Full Map <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="p-3">
                <MapView height={200} preview showLegend={false} showControls={false} />
              </div>
            </div>

            {/* Community Pulse Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-emerald-600" />
                  {t('most_supported')}
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">Top 30d</span>
              </div>

              {!pulseData?.mostSupported?.length ? (
                <p className="text-xs text-slate-400 py-2 text-center">No community supported issues yet.</p>
              ) : (
                <div className="space-y-2">
                  {pulseData.mostSupported.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/complaints/${item.id}`)}
                      className="cursor-pointer rounded-xl border border-slate-100 dark:border-slate-800 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-400">#CGN-{String(item.id).padStart(5, '0')}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <ThumbsUp className="h-3 w-3" /> {item.support_count} supports
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-1">{item.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* City Transparency Mini-Card */}
            {pulseData?.transparency && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-[#0E1B2E] p-4 space-y-2.5">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('pulse_title')}
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-2 border border-slate-100 dark:border-slate-700">
                    <div className="text-lg font-black text-emerald-600">{pulseData.transparency.resolutionRate || 0}%</div>
                    <div className="text-[10px] font-bold text-slate-400">{t('resolution_rate')}</div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-2 border border-slate-100 dark:border-slate-700">
                    <div className="text-lg font-black text-blue-600">{pulseData.transparency.avg_resolution_hours || '24'}h</div>
                    <div className="text-[10px] font-bold text-slate-400">{t('avg_resolution_time')}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
