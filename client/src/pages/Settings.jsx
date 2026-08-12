import React, { useContext, useState, useEffect } from 'react'
import { Sun, Moon, Bell, ShieldCheck, Monitor } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import ThemeContext from '../context/ThemeContext'
import settingsApi from '../services/settings'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import toast from 'react-hot-toast'

export default function Settings() {
  const { dark, setDark } = useContext(ThemeContext)
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState({
    complaint_submitted: true,
    status_changes: true,
    assignment_updates: true,
    resolution: true,
    reopened: true,
    sla_alerts: true
  })
  const [privacy, setPrivacy] = useState({
    show_name_public: false,
    show_location_public: true
  })

  useEffect(() => {
    settingsApi.getSettings()
      .then((s) => {
        const n = s?.notification_preferences || {}
        const p = s?.privacy_preferences || {}
        setPrefs({
          complaint_submitted: n.complaint_submitted ?? true,
          status_changes: n.status_changes ?? true,
          assignment_updates: n.assignment_updates ?? true,
          resolution: n.resolution ?? true,
          reopened: n.reopened ?? true,
          sla_alerts: n.sla_alerts ?? true
        })
        setPrivacy({
          show_name_public: p.show_name_public ?? false,
          show_location_public: p.show_location_public ?? true
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await settingsApi.updateSettings({
        theme: dark ? 'dark' : 'light',
        notification_preferences: prefs,
        privacy_preferences: privacy
      })
      toast.success('Settings saved')
    } catch (e) {
      toast.error('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  function Toggle({ checked, onChange, label }) {
    return (
      <label className="flex cursor-pointer items-center justify-between py-2.5">
        <span className="pr-4 text-sm text-slate-700 dark:text-slate-300">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={onChange}
          aria-label={label}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </label>
    )
  }

  return (
    <AppShell title="Settings">
      <PageHeader title="Settings" subtitle="Manage your appearance, notifications, and privacy preferences." />

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner label="Loading settings…" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Appearance */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sun className="h-4 w-4 text-brand-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</h3>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Choose how Civic GreenNet looks on your device.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDark(false)}
                aria-pressed={!dark}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  !dark ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="h-5 w-5" aria-hidden="true" /> Light
              </button>
              <button
                onClick={() => setDark(true)}
                aria-pressed={dark}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  dark ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="h-5 w-5" aria-hidden="true" /> Dark
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" /> Theme preference is persisted on this device.
            </div>
          </div>

          {/* Notifications */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <Toggle checked={prefs.complaint_submitted} onChange={() => setPrefs({ ...prefs, complaint_submitted: !prefs.complaint_submitted })} label="Complaint submission confirmation" />
              <Toggle checked={prefs.status_changes} onChange={() => setPrefs({ ...prefs, status_changes: !prefs.status_changes })} label="Status updates" />
              <Toggle checked={prefs.assignment_updates} onChange={() => setPrefs({ ...prefs, assignment_updates: !prefs.assignment_updates })} label="Assignments & updates" />
              <Toggle checked={prefs.resolution} onChange={() => setPrefs({ ...prefs, resolution: !prefs.resolution })} label="Resolutions" />
              <Toggle checked={prefs.reopened} onChange={() => setPrefs({ ...prefs, reopened: !prefs.reopened })} label="Reopened alerts" />
              <Toggle checked={prefs.sla_alerts} onChange={() => setPrefs({ ...prefs, sla_alerts: !prefs.sla_alerts })} label="SLA alerts (Warnings & Breaches)" />
            </div>
          </div>

          {/* Privacy */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Privacy</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <Toggle checked={privacy.show_name_public} onChange={() => setPrivacy({ ...privacy, show_name_public: !privacy.show_name_public })} label="Show my name publicly" />
              <Toggle checked={privacy.show_location_public} onChange={() => setPrivacy({ ...privacy, show_location_public: !privacy.show_location_public })} label="Show my report location" />
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} loading={saving}>Save Settings</Button>
        </div>
      )}
    </AppShell>
  )
}
