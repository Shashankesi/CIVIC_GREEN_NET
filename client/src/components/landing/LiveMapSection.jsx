import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  ArrowUpRight,
  ShieldCheck,
  Flame,
  Layers,
  Activity
} from 'lucide-react'
import MapView from '../MapView'
import { PUBLIC_MAP_CATEGORY_OPTIONS, PUBLIC_MAP_STATUS_OPTIONS } from '../../config/categories'

export default function LiveMapSection({ stats, secondsAgo }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const total = stats?.totalReports ?? 0
  const openCount = stats?.openReports ?? 0
  const inProgressCount = stats?.inProgressReports ?? 0
  const resolvedCount = stats?.resolvedReports ?? 0

  return (
    <section id="live-map" className="relative py-16 sm:py-24 bg-[#F3F8F5] dark:bg-[#0A1219] border-b border-slate-200/80 dark:border-slate-800 overflow-hidden">
      {/* Top Indian Tricolour Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex z-10">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* Subtle saffron and green ambient radial gradients */}
      <div className="absolute -top-24 left-1/4 w-[520px] h-[520px] bg-[#FF9933]/[0.07] rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[520px] h-[520px] bg-[#138808]/[0.07] rounded-full blur-[110px] pointer-events-none" />

      {/* City Grid Texture */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #111827 1px, transparent 1px),
            linear-gradient(to bottom, #111827 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Subtle Topographic Contour Vector Overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="cgn-topo-contours" width="600" height="400" patternUnits="userSpaceOnUse">
            <path
              d="M0,80 Q150,20 300,90 T600,60 M0,160 Q200,90 350,170 T600,140 M0,240 Q180,180 320,250 T600,220 M0,320 Q220,270 380,330 T600,300 M50,0 Q120,150 70,300 T90,400 M250,0 Q320,150 280,300 T300,400 M450,0 Q520,150 470,300 T500,400"
              fill="none"
              stroke="#138808"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cgn-topo-contours)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            {/* Eyebrow Label with saffron accent & animated green indicator */}
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-widest text-[#138808] dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/25 mb-3 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#138808] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#138808]" />
              </span>
              <span>LIVE GEOSPATIAL INTELLIGENCE</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#111827] dark:text-white leading-tight">
              See What Is Happening{' '}
              <span className="text-[#138808] dark:text-emerald-400">Around Your City</span>
            </h2>

            {/* Saffron & Green Decorative Accent Line */}
            <div className="flex items-center gap-1.5 my-3">
              <span className="h-1 w-6 rounded-full bg-[#FF9933]" />
              <span className="h-1 w-14 rounded-full bg-gradient-to-r from-[#FF9933] via-amber-300 to-[#138808]" />
              <span className="h-1 w-6 rounded-full bg-[#138808]" />
            </div>

            {/* Description */}
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Explore civic issues across geographical locations, monitor their status, and identify areas that need immediate attention.
            </p>
          </div>

          {/* Action on the right side */}
          <Link
            to="/map"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-[#138808] dark:hover:text-emerald-400 hover:border-emerald-500/40 shadow-xs hover:shadow-md transition-all shrink-0 group"
          >
            <span>Open Dedicated Map Screen</span>
            <ArrowUpRight className="h-4 w-4 text-[#FF9933] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* Advanced 3D Filter Panel */}
        <div className="flex flex-col gap-3.5 mb-6 p-4 sm:p-5 rounded-[18px] bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_10px_30px_-10px_rgba(17,24,39,0.08)]">
          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#138808]" />
              Category:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {PUBLIC_MAP_CATEGORY_OPTIONS.map((opt) => {
                const isSelected = selectedCategory === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedCategory(opt.value)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#138808] text-white shadow-sm ring-2 ring-[#138808]/30'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#138808]/40 hover:text-[#138808] hover:bg-emerald-50/40 dark:hover:bg-slate-700/60 shadow-xs'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1.5 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[#FF9933]" />
              Status:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {PUBLIC_MAP_STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#138808] text-white shadow-sm ring-2 ring-[#138808]/30'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#138808]/40 hover:text-[#138808] hover:bg-emerald-50/40 dark:hover:bg-slate-700/60 shadow-xs'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 3D Elevated Main GIS Map Card */}
        <div className="relative group">
          {/* Subtle multi-layer ambient illumination */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500/10 via-transparent to-emerald-500/10 rounded-[24px] blur-xl -z-10" />

          <div className="overflow-hidden rounded-[22px] border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_25px_60px_-15px_rgba(17,24,39,0.14)] relative">
            {/* Map Container */}
            <div className="relative h-[480px] sm:h-[520px] lg:h-[550px] w-full">
              <MapView
                height={550}
                showLegend={false}
                showControls={true}
                showSidebar={true}
                initialRadius={10000}
                filters={{
                  status: selectedStatus !== 'all' ? selectedStatus : null,
                  category: selectedCategory !== 'all' ? selectedCategory : null
                }}
              />

              {/* Floating Premium Map Legend inside bottom-left */}
              <div className="absolute bottom-4 left-4 z-[900] pointer-events-auto">
                <div className="rounded-xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-md px-3.5 py-2.5 border border-slate-200/80 dark:border-slate-700 shadow-xl text-xs">
                  <div className="text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center justify-between gap-3">
                    <span>GIS LEGEND</span>
                    <span className="flex h-1.5 w-1.5 rounded-full bg-[#138808] animate-pulse" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-xs" />
                      Open
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-xs" />
                      In Progress
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#138808] shadow-xs" />
                      Resolved
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-xs" />
                      Overdue
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                      <Flame className="h-3.5 w-3.5 text-rose-500" />
                      Hotspot
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Telemetry Footer Strip */}
            <div className="border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-semibold">
                <span className="inline-flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-[#138808] animate-pulse" />
                  LIVE TELEMETRY:
                </span>
                <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Total: <span className="font-bold">{total}</span>
                </span>
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Open: <span className="font-bold">{openCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  In Progress: <span className="font-bold">{inProgressCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-[#138808]" />
                  Resolved: <span className="font-bold">{resolvedCount}</span>
                </span>
              </div>

              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                {secondsAgo != null && (
                  <span className="hidden sm:inline">
                    {secondsAgo < 5 ? 'Synced just now' : `Synced ${secondsAgo}s ago`}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#138808] shrink-0" />
                  <span>Masked Citizen Coordinates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
