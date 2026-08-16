import React, { useContext, useState, useEffect, useCallback } from 'react'
import {
  User, Mail, ShieldCheck, Camera, FileText, Phone, MapPin,
  Calendar, CheckCircle2, Bookmark, ThumbsUp, MessageSquare,
  Clock, ArrowRight, Settings as SettingsIcon, Bell, RefreshCw, Sparkles, Check,
  Award, Globe, Eye, EyeOff, Lock
} from 'lucide-react'
import AuthContext from '../context/AuthContext'
import citizenApi from '../services/citizen'
import api, { updateProfile, unwrapResponse } from '../services/api'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Skeleton from '../components/Skeleton'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useTranslation } from '../utils/i18n'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Personal Info' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'contribution', label: 'Badges & Contribution' },
  { id: 'privacy', label: 'Privacy Center' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'language', label: 'Language' }
]

export default function Profile() {
  const { user, setUser } = useContext(AuthContext)
  const { t, lang, setLanguage } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile data from backend
  const [profileData, setProfileData] = useState(null)
  const [contributionData, setContributionData] = useState(null)
  const [activityLogs, setActivityLogs] = useState([])
  const [followedItems, setFollowedItems] = useState([])

  // Form fields
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')

  // Privacy Settings
  const [publicNickname, setPublicNickname] = useState('')
  const [anonymousLeaderboard, setAnonymousLeaderboard] = useState(false)
  const [hideCommunityActivity, setHideCommunityActivity] = useState(false)

  // Notification Preferences
  const [notifPrefs, setNotifPrefs] = useState({
    email_complaint_updates: true,
    email_followed_updates: true,
    email_community_activity: true,
    in_app_complaint_updates: true,
    in_app_followed_updates: true,
    in_app_community_activity: true
  })

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes, aRes, fRes, prefRes] = await Promise.allSettled([
        citizenApi.getProfile(),
        citizenApi.getContribution(),
        citizenApi.getActivity({ limit: 20 }),
        citizenApi.getFollowed({ limit: 10 }),
        citizenApi.getPreferences()
      ])

      if (pRes.status === 'fulfilled' && pRes.value) {
        const p = pRes.value
        setProfileData(p)
        setName(p.user?.name || user?.name || '')
        const s = typeof p.user?.settings === 'string' ? JSON.parse(p.user.settings) : (p.user?.settings || {})
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setCity(s.city || 'Chandigarh')
        setState(s.state || 'Chandigarh (UT)')
        setPincode(s.pincode || '')
      }

      if (cRes.status === 'fulfilled' && cRes.value) {
        setContributionData(cRes.value)
      }

      if (aRes.status === 'fulfilled') {
        setActivityLogs(aRes.value || [])
      }

      if (fRes.status === 'fulfilled') {
        setFollowedItems(fRes.value?.items || [])
      }

      if (prefRes.status === 'fulfilled' && prefRes.value) {
        const pr = prefRes.value
        if (pr.notifications) setNotifPrefs(pr.notifications)
        if (pr.privacy) {
          setPublicNickname(pr.privacy.publicNickname || '')
          setAnonymousLeaderboard(!!pr.privacy.anonymousLeaderboard)
          setHideCommunityActivity(!!pr.privacy.hideCommunityActivity)
        }
      }
    } catch (e) {
      console.error('Failed to load profile details:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  async function handleSaveDetails(e) {
    if (e) e.preventDefault()
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const res = await citizenApi.updateProfile({
        name,
        phone,
        address,
        city,
        state,
        pincode
      })
      if (res) {
        toast.success('Personal details saved successfully!')
        if (setUser) setUser(prev => ({ ...prev, name }))
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePreferences(e) {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      await citizenApi.updatePreferences({
        notifications: notifPrefs,
        privacy: {
          publicNickname,
          anonymousLeaderboard,
          hideCommunityActivity
        },
        language: lang
      })
      toast.success('Preferences saved successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update preferences')
    } finally {
      setSaving(false)
    }
  }

  const metrics = profileData?.metrics || {
    totalReports: 0,
    openReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    issuesSupported: 0,
    issuesFollowed: 0
  }

  const contribution = contributionData || profileData?.contribution || {
    totalPoints: 0,
    currentLevel: { name: 'New Contributor', badgeIcon: '🌱', minPoints: 0, maxPoints: 20 },
    streak: 1,
    earnedBadges: []
  }

  return (
    <AppShell title={t('profile')}>
      <div className="space-y-6">
        {/* Profile Header Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs dark:border-slate-800 dark:bg-[#0B1628]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white text-2xl font-black shadow-lg">
                  {user?.name?.slice(0, 2)?.toUpperCase() || 'CG'}
                </div>
                {user?.is_verified && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white dark:ring-[#0B1628]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white">{user?.name || 'Citizen'}</h1>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Citizen
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{user?.email}</span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                  <span>{contribution.currentLevel?.badgeIcon} {contribution.currentLevel?.name || 'New Contributor'}</span>
                  <span>•</span>
                  <span>{contribution.totalPoints || 0} pts</span>
                  <span>•</span>
                  <span>{contribution.streak || 1} {t('days_active')}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('details')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setActiveTab('contribution')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
              >
                View Badges
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 dark:border-slate-800 mt-6 pt-4 text-xs font-bold">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Reports', value: metrics.totalReports, icon: FileText, color: 'text-emerald-600' },
                { label: 'Open', value: metrics.openReports, icon: Clock, color: 'text-blue-600' },
                { label: 'In Progress', value: metrics.inProgressReports, icon: RefreshCw, color: 'text-amber-600' },
                { label: 'Resolved', value: metrics.resolvedReports, icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Supported', value: metrics.issuesSupported, icon: ThumbsUp, color: 'text-teal-600' },
                { label: 'Followed', value: metrics.issuesFollowed, icon: Bookmark, color: 'text-purple-600' }
              ].map((kpi, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#0B1628] shadow-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold">{kpi.label}</span>
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Badges Preview */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-amber-500" />
                  {t('badges_earned')} ({contribution.earnedBadges?.length || 0})
                </h3>
                <button
                  onClick={() => setActiveTab('contribution')}
                  className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {t('view_all')} →
                </button>
              </div>

              {!contribution.earnedBadges?.length ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Submit reports, verify resolutions, and support neighborhood issues to unlock achievement badges!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {contribution.earnedBadges.slice(0, 3).map((b) => (
                    <div key={b.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 text-lg">
                        🏆
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{b.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL INFORMATION */}
        {activeTab === 'details' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Personal Contact Details</h3>
              <p className="text-xs text-slate-400 mt-0.5">Used by municipal teams when following up on your reports.</p>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Sector 17, Main Market"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" loading={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6">
                  Save Personal Details
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: ACTIVITY LOG */}
        {activeTab === 'activity' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Chronological Civic Activity Log</h3>
            <p className="text-xs text-slate-400">Complete audit timeline of your reports, community upvotes, and comments.</p>

            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No activity records found.</p>
            ) : (
              <div className="space-y-3 pt-2">
                {activityLogs.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      {act.action_type === 'complaint_created' ? '📝' : act.action_type === 'complaint_voted' ? '👍' : act.action_type === 'resolution_verified' ? '✓' : '💬'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {act.action_type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(act.created_at).toLocaleString()}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">{act.title}</h4>
                      {act.meta && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{act.meta}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BADGES & CONTRIBUTION */}
        {activeTab === 'contribution' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Civic Contribution &amp; Achievements
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Points are earned strictly through real, verified municipal participation.</p>
            </div>

            {/* Score Breakdown Matrix */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Explainable Scoring Formula
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">Verified Issue Report</span>
                  <span className="font-bold text-emerald-600">+10 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">Resolution Confirmed</span>
                  <span className="font-bold text-emerald-600">+5 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">Photo / Evidence Upload</span>
                  <span className="font-bold text-emerald-600">+5 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">Community Support Given/Received</span>
                  <span className="font-bold text-emerald-600">+1 pt</span>
                </div>
              </div>
            </div>

            {/* Full Badges Catalog */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Achievement Badges Catalog
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(contributionData?.badgeCatalog || []).map((b) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      b.isEarned
                        ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                        : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{b.isEarned ? '🏆' : '🔒'}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        b.isEarned ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {b.isEarned ? 'Earned' : `${b.criteria_points} pts`}
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">{b.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{b.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRIVACY CENTER */}
        {activeTab === 'privacy' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                Citizen Privacy &amp; Visibility Controls
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Control how your identity appears on public reports and community leaderboards.</p>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Public Display Nickname</label>
                <input
                  type="text"
                  value={publicNickname}
                  onChange={(e) => setPublicNickname(e.target.value)}
                  placeholder="e.g. CivicVoice_CHD or Ananya S."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">If set, this nickname will be displayed on comments and public leaderboards instead of your legal name.</p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymousLeaderboard}
                    onChange={(e) => setAnonymousLeaderboard(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Anonymous Leaderboard Display</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Mask your identity as "Citizen #ID" on the community leaderboard.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideCommunityActivity}
                    onChange={(e) => setHideCommunityActivity(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Hide Public Activity from Profile</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Do not display your public votes and comments to other citizens.</div>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" loading={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6">
                  Save Privacy Settings
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Notification Alert Preferences</h3>
              <p className="text-xs text-slate-400 mt-0.5">Fine-tune email and in-app notifications according to your preferences.</p>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4 max-w-xl">
              {[
                { id: 'email_complaint_updates', label: 'Email: Complaint Status Updates', desc: 'Receive emails when your complaints are assigned, in progress, or resolved' },
                { id: 'email_followed_updates', label: 'Email: Followed Issue Updates', desc: 'Receive emails when issues you bookmarked change status' },
                { id: 'email_community_activity', label: 'Email: Community Support & Comments', desc: 'Receive emails when fellow citizens support your complaints' },
                { id: 'in_app_complaint_updates', label: 'In-App: Real-Time Complaint Badges', desc: 'Receive live in-app notifications on complaint milestones' }
              ].map((pref) => (
                <label key={pref.id} className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifPrefs[pref.id] ?? true}
                    onChange={(e) => setNotifPrefs(prev => ({ ...prev, [pref.id]: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{pref.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{pref.desc}</div>
                  </div>
                </label>
              ))}

              <div className="pt-2">
                <Button type="submit" loading={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6">
                  Save Notification Preferences
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 7: LANGUAGE */}
        {activeTab === 'language' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-[#0B1628] space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                Language &amp; Localization Preference
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Select your preferred platform language.</p>
            </div>

            <div className="space-y-3 max-w-md">
              <button
                type="button"
                onClick={() => {
                  setLanguage('en')
                  citizenApi.updatePreferences({ language: 'en' }).catch(() => {})
                  toast.success('Language changed to English')
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  lang === 'en'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">English</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Default platform language</div>
                </div>
                {lang === 'en' && <Check className="h-4 w-4 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLanguage('hi')
                  citizenApi.updatePreferences({ language: 'hi' }).catch(() => {})
                  toast.success('भाषा हिन्दी में बदल दी गई है')
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  lang === 'hi'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">हिन्दी (Hindi)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">नागरिक इंटरफेस हिन्दी में</div>
                </div>
                {lang === 'hi' && <Check className="h-4 w-4 text-emerald-600" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
