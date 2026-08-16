import React from 'react'
import { MapPin, ShieldCheck, User } from 'lucide-react'

/**
 * Enterprise operational header for the Officer operations center.
 * Shows greeting, officer identity, employee ID, and availability selector.
 * All data comes from backend props — zero hardcoded fake metrics.
 */
export default function OfficerHero({ profile, getGreeting, updatingAvailability, onAvailabilityChange, Loader2Icon }) {
  const isAvailable = profile.availability === 'AVAILABLE' || !profile.availability
  const isBusy = profile.availability === 'BUSY'
  const isOnField = profile.availability === 'ON_FIELD'
  const isOffline = profile.availability === 'OFFLINE'

  return (
    <div className="officer-hero rounded-2xl p-5 sm:p-6 text-white relative">
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Officer Identity */}
        <div className="flex items-start sm:items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name || 'Officer'}
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover ring-2 ring-white/20 shadow-md shrink-0"
            />
          ) : (
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-white font-black text-xl ring-2 ring-white/20 shadow-md shrink-0">
              {profile.name?.charAt(0).toUpperCase() || <User className="h-7 w-7" />}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {getGreeting()}, {profile.name?.split(' ')[0] || 'Officer'}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-emerald-200 border border-white/20">
                <ShieldCheck className="h-3 w-3 text-emerald-300" />
                Verified Field Officer
              </span>
            </div>

            <p className="text-xs sm:text-sm text-white/90 font-medium">
              {profile.designation || 'Municipal Officer'} • <span className="text-white font-bold">{profile.department?.name || 'Municipal Operations'}</span>
            </p>

            <div className="text-[11px] text-white/70 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-300 shrink-0" />
                <span>{profile.municipality?.name || 'Municipal Corporation'}</span>
              </span>
              {profile.zone?.name && <span>• Zone: {profile.zone.name}</span>}
              {profile.ward?.name && <span>• Ward: {profile.ward.name}</span>}
            </div>
          </div>
        </div>

        {/* Right: Employee ID & Availability Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="bg-black/20 backdrop-blur-sm border border-white/15 px-4 py-2.5 rounded-xl text-left min-w-[130px]">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-white/60">Employee ID</span>
            <span className="text-xs font-mono font-bold text-white tracking-wider">{profile.employee_id || 'CGN-OFFICER'}</span>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-xl min-w-[150px]">
            <span className="block text-[9px] font-extrabold uppercase tracking-wider text-white/60 mb-1">Operational Status</span>
            <div className="relative">
              <select
                value={profile.availability || 'AVAILABLE'}
                disabled={updatingAvailability}
                onChange={(e) => onAvailabilityChange(e.target.value)}
                className={`w-full rounded-lg border border-white/25 px-2.5 py-1 text-xs font-bold text-white bg-white/10 backdrop-blur-sm focus:outline-none focus:border-emerald-300 appearance-none cursor-pointer ${
                  updatingAvailability ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{ colorScheme: 'dark' }}
              >
                <option value="AVAILABLE" className="bg-emerald-900 text-white">● Available</option>
                <option value="BUSY" className="bg-emerald-900 text-white">● Busy</option>
                <option value="ON_FIELD" className="bg-emerald-900 text-white">● On Field</option>
                <option value="OFFLINE" className="bg-emerald-900 text-white">● Offline</option>
              </select>
              {updatingAvailability && (
                <Loader2Icon className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-white/70" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
