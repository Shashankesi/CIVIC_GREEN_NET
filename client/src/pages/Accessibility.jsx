import React from 'react'
import { Link } from 'react-router-dom'
import {
  Eye,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Keyboard,
  Contrast,
  Smartphone,
  Mail
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'

export default function Accessibility() {
  const lastUpdated = '30 October 2026'

  return (
    <div className="min-h-screen bg-[#F3F8F5] dark:bg-[#0A1219] text-slate-800 dark:text-slate-200 flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="relative pt-24 pb-12 sm:pb-16 border-b border-slate-200/80 dark:border-slate-800 bg-[#F1F7F3] dark:bg-[#08131B]">
        <div className="absolute top-0 left-0 right-0 h-[3px] flex z-20">
          <div className="w-1/3 bg-[#FF9933]" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-[#138808]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#138808] dark:hover:text-emerald-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>

          <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-extrabold tracking-widest text-[#138808] dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/25 mb-3 shadow-xs">
            <Eye className="w-3.5 h-3.5 text-[#138808] dark:text-emerald-400" />
            <span>INCLUSIVE CIVIC DESIGN</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0f172a] dark:text-white">
            Accessibility Statement
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            WCAG 2.1 AA Compliance Commitment · Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-12 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Card: Commitment */}
          <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#138808]" />
              Our Commitment to Accessible Governance
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              CivicGreenNet believes civic technology must be usable by every resident regardless of physical, sensory, or cognitive abilities. We continually evaluate our digital infrastructure against the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> standards.
            </p>
          </div>

          {/* Core Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-[#138808] dark:text-emerald-400 mb-3">
                <Keyboard className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Keyboard Navigation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                All navigation menus, accordion cards, filter chips, and forms are fully navigable using Tab, Enter, Space, and Arrow keys.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-[#FF9933] mb-3">
                <Contrast className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                High Contrast & Theming
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Text and interactive elements meet or exceed the 4.5:1 minimum contrast ratio with both Light and Dark mode support.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-[#009B72] dark:text-teal-400 mb-3">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Responsive Scaling
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Our layouts adapt smoothly from 320px mobile screens to large desktop monitors without text truncation or horizontal overflow.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 mb-3">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Screen Reader Compatibility
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Semantic HTML landmarks, ARIA labels, and live regions provide audio status cues for assistive screen readers.
              </p>
            </div>
          </div>

          {/* Feedback section */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#138808]" />
              Accessibility Feedback & Barrier Reporting
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              If you encounter an accessibility barrier or require civic reporting forms in an alternative format, please contact our team directly:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm font-semibold">
              Email:{' '}
              <a
                href="mailto:civicgreenet@gmail.com?subject=Accessibility%20Barrier%20Report%20-%20CivicGreenNet"
                className="text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                civicgreenet@gmail.com
              </a>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}

