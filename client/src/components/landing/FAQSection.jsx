import React, { useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  HelpCircle,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  MapPin,
  FileText,
  ArrowRight,
  ChevronRight,
  Layers,
  CheckCircle2,
  Lock,
  Activity,
  Building2,
  Clock,
  Mail
} from 'lucide-react'
import Button from '../../ui/Button'

export default function FAQSection({ user }) {
  const navigate = useNavigate()
  const baseId = useId()

  const categories = [
    'All Questions',
    'For Citizens',
    'Reporting Issues',
    'AI & Smart Analysis',
    'Municipal Authorities',
    'Privacy & Security'
  ]

  const [activeCategory, setActiveCategory] = useState('All Questions')
  const [expandedId, setExpandedId] = useState('q1') // Q1 open by default for immediate preview

  const faqs = [
    {
      id: 'q1',
      question: 'What is CivicGreenNet?',
      answer:
        'CivicGreenNet is an AI-powered civic issue reporting and management platform that connects citizens with municipal authorities to improve the reporting, tracking and resolution of public infrastructure and sanitation problems.',
      categories: ['All Questions', 'For Citizens']
    },
    {
      id: 'q2',
      question: 'How can I report a civic issue?',
      answer:
        'Citizens can submit a report by selecting the relevant issue category, providing a description, uploading a photograph and adding the issue location using GPS or the location picker.',
      categories: ['All Questions', 'For Citizens', 'Reporting Issues']
    },
    {
      id: 'q3',
      question: 'Which types of civic issues can I report?',
      answer:
        'Citizens can report problems related to roads, sanitation, street lighting, water supply, drainage, public safety and parks.',
      categories: ['All Questions', 'For Citizens', 'Reporting Issues']
    },
    {
      id: 'q4',
      question: 'Can I track the status of my complaint?',
      answer:
        'Yes. Citizens can monitor the progress of their submitted complaints through the platform and view available status updates, including open, in-progress and resolved states.',
      categories: ['All Questions', 'For Citizens', 'Reporting Issues']
    },
    {
      id: 'q5',
      question: 'How does the intelligent analysis system work?',
      answer:
        'The platform analyzes submitted photographs and complaint descriptions to help identify issue categories, assess urgency, detect potentially duplicate reports and support appropriate departmental routing.',
      categories: ['All Questions', 'AI & Smart Analysis']
    },
    {
      id: 'q6',
      question: 'How are complaints assigned to municipal departments?',
      answer:
        'Complaints are routed based on their issue category, priority and location so that the appropriate municipal department or responsible ward can handle them.',
      categories: ['All Questions', 'Municipal Authorities', 'AI & Smart Analysis']
    },
    {
      id: 'q7',
      question: 'How can I know whether my reported issue has been resolved?',
      answer:
        'Citizens can view complaint status updates and available resolution evidence, including photographs uploaded by municipal authorities. They can also verify the completed work where the verification functionality is available.',
      categories: ['All Questions', 'For Citizens', 'Municipal Authorities']
    },
    {
      id: 'q8',
      question: 'Can municipal authorities monitor complaints?',
      answer:
        'Yes. Municipal administrators and authorized officers can use their respective dashboards to monitor complaints, manage their status, coordinate departmental actions and review performance.',
      categories: ['All Questions', 'Municipal Authorities']
    },
    {
      id: 'q9',
      question: 'Is citizen location information displayed publicly?',
      answer:
        'The platform should follow its existing location-privacy settings. Public map views must respect the existing coordinate-masking and privacy protections.',
      categories: ['All Questions', 'Privacy & Security']
    },
    {
      id: 'q10',
      question: 'What should I do if my complaint is not resolved?',
      answer:
        'Citizens can revisit their complaint, check its latest status and use the available review or follow-up functionality if the issue remains unresolved.',
      categories: ['All Questions', 'For Citizens', 'Reporting Issues']
    }
  ]

  const filteredFaqs = faqs.filter((faq) =>
    activeCategory === 'All Questions' ? true : faq.categories.includes(activeCategory)
  )

  const toggleAccordion = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleScrollToMap = () => {
    const el = document.getElementById('live-map')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  // Real formatted sync date for support availability card
  const realSyncDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  return (
    <section
      id="faq"
      className="relative py-16 sm:py-24 bg-[#F3F8F5] dark:bg-[#0A1219] border-b border-slate-200/80 dark:border-slate-800 overflow-hidden select-none"
    >
      {/* Anchor support for municipal navigation links */}
      <div id="municipalities" className="absolute -top-16 left-0" />

      {/* ── Top Indian Tricolour Decorative Accent Line ─────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[3px] flex z-20">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* ── Ambient Radial Lighting Accents ─────────────────────────────────── */}
      <div className="absolute -top-28 -left-20 w-[500px] h-[500px] bg-[#FF9933]/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-28 -right-20 w-[550px] h-[550px] bg-[#138808]/[0.06] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

      {/* ── Architectural 58px Grid Texture ─────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #111827 1px, transparent 1px),
            linear-gradient(to bottom, #111827 1px, transparent 1px)
          `,
          backgroundSize: '58px 58px'
        }}
      />

      {/* ── Subtle Topographic Contour Vectors ──────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.045] pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="faq-topographic-contours" width="600" height="400" patternUnits="userSpaceOnUse">
            <path
              d="M0,60 Q150,15 300,75 T600,45 M0,140 Q180,85 360,150 T600,120 M0,220 Q160,165 320,230 T600,200 M0,300 Q200,250 360,310 T600,280"
              fill="none"
              stroke="#138808"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#faq-topographic-contours)" />
      </svg>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* ── Two-Column Layout (38% Left / 62% Right Balanced) ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* =================================================================== */}
          {/* LEFT COLUMN: Help Center Intro + Rich Stack of Support Cards        */}
          {/* =================================================================== */}
          <div className="lg:col-span-5 flex flex-col space-y-5">
            
            {/* 1. Header & Description */}
            <div>
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-widest text-[#138808] dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/25 mb-3.5 shadow-xs self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-[#138808] dark:bg-emerald-400 animate-pulse" />
                <span>CIVICGREENNET HELP CENTER</span>
              </div>

              {/* Main Heading */}
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-[#0f172a] dark:text-white leading-[1.15]">
                Frequently Asked{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#138808] via-emerald-600 to-[#009B72]">
                  Questions
                </span>
              </h2>

              {/* Tricolour Accent Line */}
              <div className="flex items-center gap-1.5 my-3.5">
                <span className="h-1 w-6 rounded-full bg-[#FF9933]" />
                <span className="h-1 w-14 rounded-full bg-gradient-to-r from-[#FF9933] via-amber-300 to-[#138808]" />
                <span className="h-1 w-6 rounded-full bg-[#138808]" />
              </div>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Everything you need to know about reporting civic issues, tracking resolutions and building better communities.
              </p>
            </div>

            {/* 2. Verified Civic Mesh Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(17,24,39,0.05)] relative overflow-hidden">
              <div className="flex items-start gap-3.5">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-[#138808] text-white shadow-md shadow-emerald-600/20">
                  <HelpCircle className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF9933]" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Verified Civic Mesh
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-[#138808] dark:text-emerald-400">
                      Live Telemetry
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Designed for transparent civic action across municipal wards, field officers, and citizens.
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  10 Core Topics
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90">
                  <Lock className="w-3 h-3 text-amber-500" />
                  Privacy-First GIS
                </span>
              </div>
            </div>

            {/* 3. A. QUICK HELP AND SUPPORT CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(17,24,39,0.05)]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-[#138808] dark:text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Need Help With Something?
                </h4>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3.5">
                Find the right guidance to report issues, track complaints and connect with your municipality.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActiveCategory('Reporting Issues')
                    setExpandedId('q2')
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-3.5 h-3.5 text-[#138808] dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#138808] dark:group-hover:text-emerald-400 transition-colors">
                      Reporting Assistance
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#138808] group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => {
                    setActiveCategory('For Citizens')
                    setExpandedId('q4')
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#009B72] dark:text-teal-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#009B72] dark:group-hover:text-teal-400 transition-colors">
                      Complaint Tracking Guide
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#009B72] group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => {
                    setActiveCategory('Municipal Authorities')
                    setExpandedId('q6')
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/80 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-3.5 h-3.5 text-[#FF9933]" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#FF9933] transition-colors">
                      Municipal Support
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF9933] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>

            {/* 4. B. HOW IT WORKS MINI TIMELINE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(17,24,39,0.05)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-[#FF9933]">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Your Complaint Journey
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  4-Stage Flow
                </span>
              </div>

              {/* Vertical Connected Timeline */}
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-[#FF9933] before:via-[#009B72] before:to-[#138808]">
                
                {/* Step 1 */}
                <div className="relative group">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-[#FF9933] shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933]" />
                  </span>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>01 — Report an Issue</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                      Accurate GPS street pins and clear photo upload.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative group">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-[#009B72] shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#009B72]" />
                  </span>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>02 — AI Analysis</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                      Automated classification, urgency assessment & duplicate check.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative group">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </span>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>03 — Municipal Action</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                      Field crew dispatched to verified ward coordinates.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative group">
                  <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-[#138808] shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#138808]" />
                  </span>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>04 — Verified Resolution</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                      Work verified with post-resolution proof photographs.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* 5. C. SUPPORT AVAILABILITY & STILL HAVE QUESTIONS (Light Theme) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-emerald-500/25 dark:border-emerald-500/35 shadow-[0_4px_20px_-4px_rgba(19,136,8,0.08)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-[#138808] dark:text-emerald-400">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Platform Support
                  </h4>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#138808] dark:bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                Explore CivicGreenNet or contact the appropriate support team.
              </p>

              <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Live Uptime:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">99.9% Telemetry</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Last Synced:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{realSyncDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Direct Support:</span>
                  <a href="mailto:civicgreennet@gmail.com" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                    civicgreennet@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  className="bg-[#138808] hover:bg-[#0e6306] text-white text-xs font-bold px-3.5 py-2 h-auto shadow-xs flex-1 justify-center"
                  onClick={() => navigate(user ? '/complaints/new' : '/signup')}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Report Issue
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold px-3.5 py-2 h-auto flex-1 justify-center"
                  onClick={handleScrollToMap}
                >
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-[#FF9933]" />
                  Public Map
                </Button>
              </div>
            </div>

          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: Category Filters & Interactive Accordion List         */}
          {/* =================================================================== */}
          <div className="lg:col-span-7">
            
            {/* Category Filters with Full Visibility & Responsive Wrap */}
            <div className="mb-5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                        isActive
                          ? 'bg-[#138808] text-white border-[#138808] shadow-sm shadow-emerald-900/20'
                          : 'bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800/90 shadow-2xs'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => {
                const isExpanded = expandedId === faq.id
                const accordionButtonId = `${baseId}-header-${faq.id}`
                const accordionRegionId = `${baseId}-content-${faq.id}`

                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl transition-all duration-300 border backdrop-blur-md overflow-hidden ${
                      isExpanded
                        ? 'bg-white dark:bg-slate-900 border-emerald-500/60 shadow-[0_10px_30px_-8px_rgba(19,136,8,0.14)] ring-1 ring-emerald-500/20'
                        : 'bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(17,24,39,0.04)] hover:shadow-md'
                    }`}
                  >
                    {/* Accordion Question Header */}
                    <button
                      id={accordionButtonId}
                      aria-expanded={isExpanded}
                      aria-controls={accordionRegionId}
                      onClick={() => toggleAccordion(faq.id)}
                      className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Number Indicator */}
                        <span
                          className={`text-xs font-black px-2 py-1 rounded-md shrink-0 transition-colors ${
                            isExpanded
                              ? 'bg-emerald-500/15 text-[#138808] dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </span>

                        {/* Question Text */}
                        <span
                          className={`text-sm sm:text-base font-extrabold transition-colors leading-snug ${
                            isExpanded
                              ? 'text-[#138808] dark:text-emerald-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {faq.question}
                        </span>
                      </div>

                      {/* Expand / Collapse Icon */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 border ${
                          isExpanded
                            ? 'bg-[#138808] text-white border-[#138808] shadow-xs rotate-180'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {isExpanded ? (
                          <Minus className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {/* Accordion Answer Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          id={accordionRegionId}
                          role="region"
                          aria-labelledby={accordionButtonId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                            <p>{faq.answer}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {filteredFaqs.length === 0 && (
                <div className="p-8 text-center bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
                  <p className="text-sm font-semibold">No questions found in this category.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
