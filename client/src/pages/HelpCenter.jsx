import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HelpCircle,
  Search,
  BookOpen,
  FileText,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Mail,
  ChevronRight,
  Plus,
  Minus,
  MessageSquare,
  Sparkles,
  Building2,
  Lock,
  PhoneCall
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'
import Button from '../ui/Button'

export default function HelpCenter() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedFaq, setExpandedFaq] = useState('q1')

  const categories = [
    'All',
    'Getting Started',
    'Reporting Issues',
    'Complaint Tracking',
    'AI & Automation',
    'Municipal Governance',
    'Privacy & Security'
  ]

  const faqs = [
    {
      id: 'q1',
      question: 'What is CivicGreenNet?',
      answer:
        'CivicGreenNet is an AI-powered civic issue reporting and management platform connecting citizens with municipal authorities to improve the reporting, tracking, and resolution of public infrastructure and sanitation problems.',
      category: 'Getting Started'
    },
    {
      id: 'q2',
      question: 'How do I submit a civic report with photos and GPS?',
      answer:
        'Navigate to "Report an Issue" (/complaints/new). Select the appropriate civic category (Roads, Sanitation, Water, Streetlighting, etc.), capture or upload a clear photograph, and verify the location coordinates using GPS or our interactive map picker.',
      category: 'Reporting Issues'
    },
    {
      id: 'q3',
      question: 'Which civic issue categories are supported?',
      answer:
        'CivicGreenNet supports public reports related to road defects & potholes, waste/garbage dumping, water supply disruptions, streetlighting outages, open drainage hazards, public safety, and park maintenance.',
      category: 'Reporting Issues'
    },
    {
      id: 'q4',
      question: 'How does live status tracking work?',
      answer:
        'Every complaint receives a verified ticket ID (e.g. #CGN-104). Citizens can monitor status milestones in real time: Submitted → Triaged / AI Classified → Dispatched to Field Crew → In Progress → Resolved & Verified.',
      category: 'Complaint Tracking'
    },
    {
      id: 'q5',
      question: 'How does the intelligent vision analysis work?',
      answer:
        'The platform analyzes uploaded photographs and textual descriptions to identify issue categories, assess urgency, flag duplicate complaints in the same geographic radius, and route tickets to the correct municipal ward.',
      category: 'AI & Automation'
    },
    {
      id: 'q6',
      question: 'How are complaints assigned to municipal departments?',
      answer:
        'Complaints are dispatched automatically based on geo-fencing, department classification (e.g., Sanitation vs Public Works), and field officer workload balancing to ensure fast, accountable response times.',
      category: 'Municipal Governance'
    },
    {
      id: 'q7',
      question: 'How is citizen location and identity protected?',
      answer:
        'CivicGreenNet applies strict privacy protections. Public geospatial maps utilize 100-meter coordinate fuzzing so that precise residential pins remain confidential while municipal teams receive exact dispatch coordinates.',
      category: 'Privacy & Security'
    },
    {
      id: 'q8',
      question: 'What should I do if my issue remains unresolved?',
      answer:
        'If a complaint exceeds its target SLA without resolution, citizens can check the timeline for status updates, request an administrative review, or contact civic support directly via civicgreenet@gmail.com.',
      category: 'Complaint Tracking'
    }
  ]

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = activeCategory === 'All' || faq.category === activeCategory
    const matchesSearch =
      searchQuery.trim() === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#F3F8F5] dark:bg-[#0A1219] text-slate-800 dark:text-slate-200 flex flex-col">
      <Navbar />

      {/* ── Help Center Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 sm:pb-20 border-b border-slate-200/80 dark:border-slate-800 bg-[#F1F7F3] dark:bg-[#08131B] overflow-hidden">
        {/* Top Tricolour Accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] flex z-20">
          <div className="w-1/3 bg-[#FF9933]" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-[#138808]" />
        </div>

        {/* Ambient lighting */}
        <div className="absolute -top-24 left-1/4 w-80 h-80 bg-[#FF9933]/[0.06] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-80 h-80 bg-[#138808]/[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#138808] dark:hover:text-emerald-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-extrabold tracking-widest text-[#138808] dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/25 mb-4 shadow-xs">
            <HelpCircle className="w-3.5 h-3.5 text-[#138808] dark:text-emerald-400" />
            <span>CIVICGREENNET KNOWLEDGE BASE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0f172a] dark:text-white leading-tight">
            How Can We{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#138808] via-emerald-600 to-[#009B72]">
              Help You Today?
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Find official guides, resolution timelines, reporting instructions, and municipal contact pathways.
          </p>

          {/* Search Input */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reporting guides, ticket tracking, GPS privacy..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white shadow-[0_8px_24px_-4px_rgba(17,24,39,0.08)] focus:outline-none focus:ring-2 focus:ring-[#138808]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Tabs & FAQ Accordion ─────────────────────────────────── */}
      <section className="py-12 sm:py-16 flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div
              onClick={() => navigate('/complaints/new')}
              className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-[#138808] dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                Report an Issue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Submit geo-tagged photographs of civic defects directly to ward officials.
              </p>
            </div>

            <div
              onClick={() => navigate('/complaints')}
              className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-[#009B72]/40 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-[#009B72] dark:text-teal-400 mb-3 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                Track Complaints
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Inspect live status changes, crew assignments, and photographic resolutions.
              </p>
            </div>

            <div
              onClick={() => navigate('/contact')}
              className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-[#FF9933]/40 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-[#FF9933] mb-3 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                Contact Support
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Reach out to civic engineers at civicgreenet@gmail.com for escalation.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  activeCategory === cat
                    ? 'bg-[#138808] text-white border-[#138808] shadow-sm'
                    : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 hover:bg-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Questions Accordion */}
          <div className="space-y-3.5">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaq === faq.id
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-white dark:bg-slate-900 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20'
                      : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-[#138808] dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                        {faq.category}
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                    </div>

                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {isExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Need More Assistance Card */}
          <div className="mt-12 p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 text-center shadow-xs">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1.5">
              Still Need Guidance?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
              Our engineering team handles questions regarding GIS coordinate precision, SLA routing, and municipal integrations.
            </p>
            <a
              href="mailto:civicgreenet@gmail.com?subject=CivicGreenNet%20Support%20Request"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#138808] hover:bg-[#0e6306] text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Email civicgreenet@gmail.com</span>
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  )
}

