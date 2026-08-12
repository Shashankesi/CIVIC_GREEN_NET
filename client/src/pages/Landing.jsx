import React, { useState, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, MapPin, TrendingUp, ShieldCheck, Bell, BarChart3, Building2,
  FileText, Search, AlertTriangle, Navigation, CheckCircle2, ArrowRight,
  Map, ChevronDown, Quote, Users, Clock, Landmark
} from 'lucide-react'
import Navbar from '../components/Navbar'
import AuthContext from '../context/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import AIBadge from '../ui/AIBadge'
import { landingStats, testimonials, faqs } from '../data/landing'
import MapView from '../components/MapView'
import complaintsApi from '../services/complaints'

const features = [
  { icon: Sparkles, title: 'AI Complaint Analysis', desc: 'Complaints are analyzed by AI to extract intent, detect issues, and route them accurately.' },
  { icon: Search, title: 'Smart Classification', desc: 'Automatic category and department detection with confidence scoring.' },
  { icon: AlertTriangle, title: 'Duplicate Detection', desc: 'Find and link duplicate reports to avoid repeated filings and streamline resolution.' },
  { icon: MapPin, title: 'Location Intelligence', desc: 'Geospatial mapping of issues with heatmaps and nearby complaint discovery.' },
  { icon: Clock, title: 'Complaint Tracking', desc: 'Real-time timeline with status updates, notes, and resolution imagery.' },
  { icon: Bell, title: 'Notifications', desc: 'Stay informed with instant alerts on assignment, status changes, and resolutions.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Complaint trends, category distribution, and department performance insights.' },
  { icon: Building2, title: 'Municipal Management', desc: 'Assign, prioritize, and optimize municipal workflows from one dashboard.' }
]

const steps = [
  { icon: FileText, title: 'Report', desc: 'Citizens report an issue with description, location, and photos in seconds.' },
  { icon: Sparkles, title: 'Analyze', desc: 'AI classifies the issue, predicts severity, and assigns the right department.' },
  { icon: CheckCircle2, title: 'Resolve', desc: 'Officials manage, update, and resolve the complaint with full transparency.' },
  { icon: TrendingUp, title: 'Track', desc: 'Citizens follow every step of the resolution journey in real time.' }
]

const citizenBenefits = ['Report issues in seconds', 'Track resolution progress', 'Receive real-time updates', 'Discover nearby issues']
const municipalityBenefits = ['Manage complaint queues', 'Assign to the right team', 'Analyze civic trends', 'Optimize operations']

const aiCapabilities = [
  { label: 'Category', value: 'Sanitation', confidence: 0.96 },
  { label: 'Severity', value: 'High', confidence: 0.89 },
  { label: 'Priority', value: 'High', confidence: 0.91 },
  { label: 'Department', value: 'Public Works', confidence: 0.94 }
]

function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  const id = `faq-${q.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="card overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={id} role="region" className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm text-slate-500 dark:text-slate-400">{a}</p>
        </div>
      </div>
    </div>
  )
}

function HeroVisual({ stats }) {
  const resolvedPct = stats && stats.totalReports > 0 ? Math.round((stats.resolvedReports / stats.totalReports) * 100) : null;

  return (
    <div className="relative">
      <div className="card relative z-10 overflow-hidden p-4">
        {/* Map preview */}
        <div className="relative h-72 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <MapView preview={true} height={288} showLegend={false} showControls={false} />
          {/* Overlays */}
          <div className="absolute top-2 left-2 z-[999] flex items-center gap-1.5 rounded-lg bg-emerald-600/90 text-white px-2.5 py-1 text-[10px] font-semibold shadow backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live Civic Map
          </div>
          <Link
            to="/map"
            className="absolute bottom-2 right-2 z-[999] flex items-center gap-1 rounded-lg bg-white/95 hover:bg-slate-50 text-slate-800 px-2 py-1 text-[10px] font-semibold shadow transition-all dark:bg-slate-800/95 dark:text-white"
          >
            Open Civic Map <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Floating AI analysis card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="absolute -right-3 -top-3 w-56 rounded-xl border border-ai/20 bg-white p-3 shadow-card-hover dark:bg-slate-800"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <AIBadge>AI Capability</AIBadge>
            <span className="text-[10px] text-slate-400">Features</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-slate-800 dark:text-white">Smart Classification</div>
            <p className="text-[10px] text-slate-500 leading-relaxed dark:text-slate-400">
              Automatically analyzes description & images to predict category, severity, and route reports to the responsible department.
            </p>
          </div>
        </motion.div>

        {/* Floating stat card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="absolute -bottom-4 -left-3 flex items-center gap-3 rounded-xl border border-brand-200 bg-white p-3 shadow-card-hover dark:border-brand-900/40 dark:bg-slate-800"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-white">
              {resolvedPct != null ? `${resolvedPct}% Resolved` : 'Live Civic Data'}
            </div>
            <div className="text-xs text-slate-400">
              {resolvedPct != null ? 'Database status' : 'Real-time updates'}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function Landing() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await complaintsApi.getPublicStats();
        if (res) setStats(res);
      } catch (err) {
        console.error('Failed loading public stats on landing page:', err);
      }
    }
    loadStats();
  }, [])

  const handleScrollToMap = () => {
    document.querySelector('#civic-map-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-darker">
      <Navbar />

      {/* HERO */}
      <section id="home" className="relative overflow-hidden pt-6 lg:pt-12">
        <div className="gradient-blob absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-brand-400/20" aria-hidden="true" />
        <div className="gradient-blob absolute right-0 top-40 h-72 w-72 rounded-full bg-teal-500/10" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:pt-20">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge tone="brand" className="mb-5 uppercase tracking-wider text-[10px] px-3 py-1 font-semibold">
                <Sparkles className="mr-1 h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> AI-Powered Civic Governance Platform
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]"
            >
              Building Smarter Cities<br />
              <span className="bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">Through Citizen Action.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 max-w-lg text-base text-slate-600 dark:text-slate-350 leading-relaxed"
            >
              Report civic issues, track their resolution journey transparently, and help municipal authorities build cleaner, safer, and more responsive communities.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button size="lg" className="shadow-lg shadow-brand-600/10 hover:shadow-brand-600/20" onClick={() => navigate(user ? '/complaints/new' : '/signup')}>
                Report an Issue <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleScrollToMap}>
                Explore Civic Map
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
            >
              Citizen-powered • Municipality-ready • Transparent by design
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <HeroVisual stats={stats} />
          </motion.div>
        </div>
      </section>

      {/* CIVIC IMPACT FLOW */}
      <section className="border-y border-slate-200/60 bg-white/70 backdrop-blur-sm dark:border-slate-800/60 dark:bg-surface-card/60 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">One platform for the entire civic resolution cycle</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { id: 'REPORT', title: 'Citizen Reporting', desc: 'Citizens easily report infrastructure or safety issues with exact location tags and photos.', color: 'brand' },
              { id: 'INTELLIGENCE', title: 'AI Classification', desc: 'Gemini AI automatically classifies reports, tags severity, and determines routing.', color: 'indigo' },
              { id: 'OPERATIONS', title: 'Municipal Workflow', desc: 'Tickets are instantly assigned to specific department officers for prompt resolution.', color: 'emerald' },
              { id: 'TRANSPARENCY', title: 'Verification', desc: 'Citizens track resolution timelines and verify resolved status before closing.', color: 'teal' }
            ].map((p, idx) => (
              <Reveal key={p.id} delay={idx * 0.05} className="flex flex-col p-5 rounded-2xl bg-slate-50 border border-slate-200/50 dark:bg-slate-900/40 dark:border-slate-800/40">
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-1.5">{p.id}</span>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">{p.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center mb-12">
          <Badge tone="blue" className="mb-4">Features</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Everything your city needs</h2>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400">A complete civic issue management platform powered by advanced AI and spatial analysis.</p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Highlighted AI Card */}
          <Reveal className="md:col-span-2 h-full">
            <div className="group card h-full p-8 border-brand-200/50 bg-gradient-to-br from-white to-brand-50/20 dark:from-slate-900 dark:to-brand-950/10 dark:border-brand-900/20 shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/60 dark:text-brand-300">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">AI Complaint Analysis</h3>
              <p className="mt-3 text-sm text-slate-655 dark:text-slate-405 leading-relaxed">
                Gemini AI automatically parses incoming complaints, matching reports with existing tickets to find duplicates, predicting priority urgency, and classifying responsible departments in real time.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-[10px] font-semibold bg-brand-100/50 text-brand-700 px-2 py-0.5 rounded dark:bg-brand-900/30 dark:text-brand-400">Intelligent Routing</span>
                <span className="text-[10px] font-semibold bg-brand-100/50 text-brand-700 px-2 py-0.5 rounded dark:bg-brand-900/30 dark:text-brand-400">Duplicate Matching</span>
                <span className="text-[10px] font-semibold bg-brand-100/50 text-brand-700 px-2 py-0.5 rounded dark:bg-brand-900/30 dark:text-brand-400">SLA Predictions</span>
              </div>
            </div>
          </Reveal>

          {/* Highlighted Location Card */}
          <Reveal className="h-full">
            <div className="group card h-full p-8 border-indigo-200/50 bg-gradient-to-br from-white to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/10 dark:border-indigo-900/20 shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300">
                <MapPin className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Location Intelligence</h3>
              <p className="mt-3 text-sm text-slate-655 dark:text-slate-405 leading-relaxed">
                Render interactive heatmaps and cluster points. Discover nearby reports using high-precision Leaflet coordinates connected to PGVector indexes.
              </p>
            </div>
          </Reveal>

          {/* Rest of the standard feature cards */}
          {features.slice(4).map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="group card h-full p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-white py-20 dark:bg-surface-card border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center mb-16">
            <Badge tone="cyan" className="mb-4">How it works</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">From report to resolution</h2>
            <p className="mt-3 text-base text-slate-550 dark:text-slate-400">Four simple steps to a cleaner, more responsive city.</p>
          </Reveal>

          {/* Stepper Timeline */}
          <div className="relative">
            {/* Horizontal Timeline Connector */}
            <div className="absolute top-8 left-8 right-8 hidden h-[2px] bg-slate-200 dark:bg-slate-800 lg:block z-0" />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08} className="flex flex-col items-start">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-800 shadow-md mb-5 group-hover:scale-105 transition-transform">
                    <s.icon className="h-7 w-7 text-emerald-400" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Step 0{i + 1}</span>
                  <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section id="ai" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Badge tone="purple" className="mb-4"><Sparkles className="mr-1 h-3 w-3" aria-hidden="true" /> AI Command Center</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">AI that helps cities respond smarter</h2>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-350 leading-relaxed">
              Civic GreenNet leverages Google Gemini to analyze citizen descriptions, images, and geolocation metadata to recommend priorities and route tickets.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: Search, text: 'Category prediction with confidence scoring' },
                { icon: AlertTriangle, text: 'Severity & priority recommendation' },
                { icon: Landmark, text: 'Automatic department routing suggestions' },
                { icon: CheckCircle2, text: 'Intelligent duplicate matching & grouping' }
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai/10 text-ai"><item.icon className="h-4 w-4" aria-hidden="true" /></span>
                  {item.text}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card p-5 border-slate-200 dark:border-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AIBadge>AI Routing Demonstration</AIBadge>
                </div>
                <span className="text-[10px] text-slate-400">Sample Classification Workflow</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-xs text-slate-600 dark:text-slate-355 italic leading-relaxed">
                  "Large pothole on the main road near the bus stop causing traffic and safety hazards. Several vehicles have been damaged."
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {aiCapabilities.map((c) => (
                  <div key={c.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{c.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{c.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-850">
                      <motion.div
                        className="h-1.5 rounded-full bg-gradient-to-r from-ai to-indigo-500"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.round(c.confidence * 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Possible duplicate of #4778</span>
                <span className="text-xs font-medium">92% match</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CITIZEN + MUNICIPALITY */}
      <section className="bg-white py-20 dark:bg-surface-card border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <div id="citizens" className="card h-full p-8 border-slate-200/60 dark:border-slate-800/60">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">For Citizens</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Make your voice heard, report infrastructure issues, and verify resolutions.</p>
              <ul className="mt-6 space-y-3">
                {[
                  'Report issues in seconds with address matching',
                  'Track real-time resolution progress on timelines',
                  'Receive instant email alerts on assignments & changes',
                  'Discover nearby issues on interactive dashboards',
                  'Reject or verify resolutions directly'
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-350 leading-relaxed">
                    <CheckCircle2 className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" aria-hidden="true" /> <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(user ? '/complaints/new' : '/signup')}>
                  Get started
                </Button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div id="municipalities" className="card h-full p-8 border-slate-200/60 dark:border-slate-800/60">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">For Municipalities</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Streamline operations, optimize department dispatch, and monitor SLA compliance.</p>
              <ul className="mt-6 space-y-3">
                {[
                  'Manage complaint queues with priority categorization',
                  'Assign officers automatically based on AI routing',
                  'Track SLA deadlines with email warnings & breach alerts',
                  'Monitor officer workload and resolution performance',
                  'Analyze civic trends and categories dynamically'
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-355 leading-relaxed">
                    <CheckCircle2 className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" aria-hidden="true" /> <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate('/signup')}>
                  Municipal Operations
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TRANSPARENCY TIMELINE */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-200/50 dark:border-slate-800/50">
        <Reveal className="mx-auto max-w-2xl text-center mb-16">
          <Badge tone="brand" className="mb-4">Transparency</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Every report has a resolution journey</h2>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
            We believe accountability drives performance. Civic GreenNet tracks and displays every single transition transparently.
          </p>
        </Reveal>
        <div className="relative">
          <div className="absolute top-1/2 left-4 right-4 hidden h-[2px] bg-slate-250 dark:bg-slate-800 md:block -translate-y-1/2" />
          <div className="grid gap-6 md:grid-cols-6 relative z-10">
            {[
              { status: 'Submitted', desc: 'Citizen submits complaint with address/location' },
              { status: 'AI Analyzed', desc: 'AI reviews tags, category, routing' },
              { status: 'Assigned', desc: 'Department officer is assigned' },
              { status: 'In Progress', desc: 'Officer updates progress notes' },
              { status: 'Resolved', desc: 'Officer uploads resolution image' },
              { status: 'Verified', desc: 'Citizen closes or reopens ticket' }
            ].map((step, idx) => (
              <Reveal key={step.status} delay={idx * 0.05} className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 border border-slate-200/40 dark:bg-slate-900/30 dark:border-slate-800/40 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs mb-3 shadow-glow">
                  {idx + 1}
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{step.status}</h4>
                <p className="mt-1 text-[10px] text-slate-400 leading-normal">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MAP PREVIEW */}
      <section id="civic-map-section" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-200/50 dark:border-slate-800/50">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Badge tone="brand" className="mb-4">Map</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">See what's happening around you</h2>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400">Explore real civic issues on an interactive operations map featuring category/status filtering.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="card mt-10 overflow-hidden relative border-slate-200 dark:border-slate-800 shadow-xl">
            {/* Map Area */}
            <div className="relative" style={{ height: '480px' }}>
              <MapView
                height={480}
                showLegend={true}
                showControls={true}
                showSidebar={true}
                initialRadius={5000}
              />
            </div>

            {/* Footer Bar with privacy notice and navigate to full map link */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60 gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Only public civic reports are displayed. Personal citizen details (email/phone) are masked for privacy.
              </span>
              <Link
                to="/map"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Explore Full Interactive Map <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* PLATFORM ACTIVITY (REAL DATA) */}
      <section className="bg-slate-900 text-white py-16 dark:bg-surface-card border-y border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <Badge tone="brand" className="mb-4">Platform Activity</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white">Live System Operations</h2>
            <p className="mt-2 text-sm text-slate-400">Real-time statistics fetched directly from the database.</p>
          </Reveal>
          {stats && stats.totalReports > 0 ? (
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-4 text-center">
              {[
                { label: 'Live Reports', value: stats.totalReports },
                { label: 'Reports Resolved', value: stats.resolvedReports },
                { label: 'Partner Departments', value: stats.departments },
                { label: 'Active Officers', value: stats.activeOfficers }
              ].map((item, idx) => (
                <Reveal key={item.label} delay={idx * 0.05}>
                  <div className="text-4xl font-extrabold text-emerald-400">{item.value}</div>
                  <div className="mt-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">{item.label}</div>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="text-center p-8 rounded-2xl bg-slate-800/40 border border-slate-700 max-w-md mx-auto">
              <Building2 className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              <div className="text-sm font-semibold text-slate-350">Connect your municipality to begin</div>
              <div className="text-xs text-slate-500 mt-1">Live civic activity will appear here once reports are submitted.</div>
            </Reveal>
          )}
        </div>
      </section>

      {/* CIVIC PRINCIPLES (REPLACED TESTIMONIALS) */}
      <section className="bg-white py-20 dark:bg-surface-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center mb-12">
            <Badge tone="blue" className="mb-4">Civic Principles</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Built for citizens and municipal teams</h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'Transparency', desc: 'Every ticket submission is mapped, timestamped, and visible to the community. No backend black boxes.' },
              { title: 'Accountability', desc: 'SLA monitors automatically alert supervisors of overdue complaints, ensuring timely responses.' },
              { title: 'Community Participation', desc: 'Direct verification mechanisms let citizens confirm if a resolution meets their expectations.' }
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 0.1}>
                <div className="card h-full p-6 border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                  <ShieldCheck className="h-8 w-8 text-brand-600 dark:text-brand-400 mb-3" aria-hidden="true" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 border-t border-slate-200/50 dark:border-slate-800/50">
        <Reveal className="text-center mb-10">
          <Badge tone="cyan" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Frequently asked questions</h2>
        </Reveal>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.05}><FaqItem q={f.q} a={f.a} /></Reveal>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-emerald-900 to-slate-950 px-6 py-16 text-center lg:px-16 shadow-2xl">
            <div className="gradient-blob absolute -left-10 -top-10 h-64 w-64 rounded-full bg-teal-400/10" aria-hidden="true" />
            <div className="gradient-blob absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-indigo-500/10" aria-hidden="true" />
            <div className="relative z-10">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Your city. Your voice. Your impact.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-emerald-100/80 leading-relaxed">
                Report local issues, follow their resolution progress, and work directly with your municipality to build a better community.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => navigate(user ? '/complaints/new' : '/signup')}>
                  Report an Issue
                </Button>
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10" onClick={handleScrollToMap}>
                  Explore the Civic Map
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                <span className="font-bold text-slate-900 dark:text-white">Civic<span className="text-brand-600 dark:text-brand-400">GreenNet</span></span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Modern smart city platform mapping, tracking, and resolving infrastructure and civic complaints.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Product</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><a href="#features" className="hover:text-brand-600">Features</a></li>
                <li><a href="#ai" className="hover:text-brand-600">AI Command Center</a></li>
                <li><a href="#citizens" className="hover:text-brand-600">For Citizens</a></li>
                <li><a href="#municipalities" className="hover:text-brand-600">For Municipalities</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Platform</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><Link to="/map" className="hover:text-brand-600">Interactive Map</Link></li>
                <li><Link to="/login" className="hover:text-brand-600">Citizen Login</Link></li>
                <li><Link to="/signup" className="hover:text-brand-600">Officer Registration</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Resources</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><span className="opacity-70">Documentation</span></li>
                <li><span className="opacity-70">Privacy & Terms</span></li>
                <li><span className="opacity-70 font-medium">Contact: support@civicgreennet.gov</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400 dark:border-slate-800">
            © {new Date().getFullYear()} Civic GreenNet. Built for smarter, more responsive communities.
          </div>
        </div>
      </footer>
    </div>
  )
}
