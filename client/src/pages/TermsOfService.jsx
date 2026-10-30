import React from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowLeft,
  ShieldAlert,
  Building2,
  Mail
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'

export default function TermsOfService() {
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
            <Scale className="w-3.5 h-3.5 text-[#138808] dark:text-emerald-400" />
            <span>CIVIC CHARTER & TERMS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0f172a] dark:text-white">
            CivicGreenNet Terms of Service
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Standard Governance Agreement · Effective Date: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-12 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Card: Platform Purpose */}
          <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#138808]" />
              1. Platform Purpose & Acceptance
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              CivicGreenNet provides an intelligent civic issue reporting infrastructure connecting residents of Indian smart cities with urban local bodies (ULBs). By accessing the website, submitting complaints, or utilizing municipal dashboards, you agree to comply with these terms.
            </p>
          </div>

          {/* Card: Citizen Reporting Responsibilities */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#009B72]" />
              2. Citizen Reporting Obligations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              To preserve system integrity and emergency dispatch accuracy, reporting citizens must:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li>Submit authentic, un-manipulated photographs captured at the true geographic site.</li>
              <li>Provide accurate GPS or map markers reflecting the physical location of the civic hazard.</li>
              <li>Avoid submitting frivolous, defamatory, commercially motivated, or duplicate spam reports.</li>
              <li>Maintain the confidentiality of account login credentials.</li>
            </ul>
          </section>

          {/* Card: Prohibited Conduct */}
          <section className="p-6 sm:p-8 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/40 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              3. Prohibited Activities
            </h2>
            <p className="text-xs sm:text-sm text-rose-950 dark:text-rose-200 leading-relaxed">
              Users may not upload offensive, obscene, or threatening imagery; attempt unauthorized administrative access; probe platform vulnerabilities; or interfere with real-time municipal telemetry services. Violations result in immediate account suspension and escalation to relevant municipal authorities.
            </p>
          </section>

          {/* Card: Municipal SLA & Disclaimers */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#FF9933]" />
              4. Municipal Response Timelines & SLAs
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              While CivicGreenNet facilitates automated categorization, urgency scoring, and ward routing, physical resolution timelines are executed by respective municipal authorities and contractors. CivicGreenNet is not an emergency response service (such as Police 112 or Fire 101).
            </p>
          </section>

          {/* Card: Contact */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#138808]" />
              5. Legal & Terms Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Questions regarding these Terms of Service or municipal collaboration agreements may be addressed to:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm font-semibold">
              Email:{' '}
              <a
                href="mailto:civicgreenet@gmail.com?subject=CivicGreenNet%20Terms%20Inquiry"
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

