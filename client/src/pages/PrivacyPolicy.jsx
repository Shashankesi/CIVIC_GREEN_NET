import React from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Eye,
  MapPin,
  FileText,
  ArrowLeft,
  Server,
  UserCheck,
  Mail
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'

export default function PrivacyPolicy() {
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
            <Lock className="w-3.5 h-3.5 text-[#138808] dark:text-emerald-400" />
            <span>TRUST & DATA GOVERNANCE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0f172a] dark:text-white">
            CivicGreenNet Privacy Policy
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Official Version 1.0 · Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-12 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Card: Location Privacy Guarantee */}
          <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-[#138808] dark:text-emerald-400">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Location Privacy & 100-Meter Public Fuzzing
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              CivicGreenNet protects citizen residential privacy. Public geospatial maps apply an automated <strong>100-meter coordinate fuzzing algorithm</strong> to all open community viewports. Exact street coordinates are accessible exclusively to authenticated municipal field teams dispatched to resolve the defect.
            </p>
          </div>

          {/* Section 1: Overview */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#138808]" />
              1. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We collect information necessary to facilitate civic issue reporting and departmental accountability:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Account Credentials:</strong> Full name, verified email address, and authentication tokens.</li>
              <li><strong>Complaint Data:</strong> Issue category, textual descriptions, uploaded photographs, and GPS coordinates.</li>
              <li><strong>Municipal Metadata:</strong> Ward assignment, department routing logs, and timestamped resolution milestones.</li>
            </ul>
          </section>

          {/* Section 2: How We Use Information */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-[#009B72]" />
              2. How Information is Processed
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Civic data is utilized solely for public infrastructure governance:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li>Automatic categorisation and duplicate detection to avoid redundant municipal work.</li>
              <li>Routing complaints to responsible ward supervisors and department officers.</li>
              <li>Sending transactional notifications regarding resolution milestones.</li>
              <li>Aggregating anonymized citywide civic performance statistics.</li>
            </ul>
          </section>

          {/* Section 3: Data Security & Retention */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#FF9933]" />
              3. Data Security & Storage
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              CivicGreenNet adheres to strict data security standards. Database connections are encrypted using SSL/TLS protocols. Photographic evidence is scrubbed of sensitive EXIF metadata before public display. We never monetize or sell citizen telemetry to commercial marketing third parties.
            </p>
          </section>

          {/* Section 4: Citizen Rights & Contact */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#138808]" />
              4. Contact the Data Protection Officer
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Citizens may request removal of their account data or report privacy concerns by writing to our designated civic compliance desk:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm font-semibold">
              Email:{' '}
              <a
                href="mailto:civicgreenet@gmail.com?subject=Privacy%20Inquiry%20-%20CivicGreenNet"
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

