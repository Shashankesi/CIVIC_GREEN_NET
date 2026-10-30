import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mail,
  Send,
  HelpCircle,
  FileText,
  Building2,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'
import Button from '../ui/Button'

export default function ContactSupport() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'General Support',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Open default mail client with prefilled details directly to civicgreenet@gmail.com
    const subject = encodeURIComponent(`[${formData.category}] ${formData.subject || 'Support Request'} - ${formData.name}`)
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nCategory: ${formData.category}\n\nMessage:\n${formData.message}`
    )
    window.location.href = `mailto:civicgreenet@gmail.com?subject=${subject}&body=${body}`
    setSubmitted(true)
  }

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
            <Mail className="w-3.5 h-3.5 text-[#138808] dark:text-emerald-400" />
            <span>DIRECT PLATFORM CONTACT</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0f172a] dark:text-white">
            Contact CivicGreenNet Support
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Reach our engineering desk, municipal liaison officers, or technical assistance team.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <main className="py-12 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Emergency Notice */}
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900/40 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Emergency Notice:</strong> CivicGreenNet handles non-emergency municipal infrastructure maintenance. For immediate life-threatening situations, please dial emergency services directly: <strong>Police (112)</strong>, <strong>Fire (101)</strong>, or <strong>Ambulance (108)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Direct Pathways */}
            <div className="md:col-span-5 space-y-4">
              
              {/* Official Email Card */}
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-[#138808] dark:text-emerald-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Official Support Email
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Direct communication with our municipal engineering team:
                </p>
                <a
                  href="mailto:civicgreenet@gmail.com?subject=CivicGreenNet%20Support%20Request"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#138808] dark:text-emerald-400 hover:underline break-all"
                >
                  <span>civicgreenet@gmail.com</span>
                </a>
              </div>

              {/* Citizen Reporting Pathway */}
              <div
                onClick={() => navigate('/complaints/new')}
                className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-[#138808] dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Reporting a Civic Defect?
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Do not email civic defects. Use our official geo-tagged submission form to ensure immediate departmental routing.
                </p>
                <div className="mt-3 text-xs font-bold text-[#138808] dark:text-emerald-400 flex items-center gap-1">
                  <span>Open Reporting Form</span>
                  <span>→</span>
                </div>
              </div>

              {/* FAQ Pathway */}
              <div
                onClick={() => navigate('/faq')}
                className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-teal-500/40 hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-[#009B72] dark:text-teal-400 group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Frequently Asked Questions
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Browse immediate answers regarding ticket verification, GPS coordinate fuzzing, and SLA response standards.
                </p>
                <div className="mt-3 text-xs font-bold text-[#009B72] dark:text-teal-400 flex items-center gap-1">
                  <span>Browse Knowledge Base</span>
                  <span>→</span>
                </div>
              </div>

            </div>

            {/* Right Column: Contact Message Launcher */}
            <div className="md:col-span-7">
              <div className="p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Send a Support Inquiry
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Direct Email Dispatch
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#138808]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. citizen@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#138808]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#138808]"
                    >
                      <option value="General Support">General Support</option>
                      <option value="Technical Issue">Technical & App Bug</option>
                      <option value="Municipal Partnership">Municipal Department Integration</option>
                      <option value="Privacy & Data">Privacy & Data Governance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Brief summary of your question"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#138808]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please provide details, ticket IDs if applicable, or questions..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#138808]"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#138808] hover:bg-[#0e6306] text-white font-bold py-3 rounded-xl shadow-xs justify-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    <span>Launch Email Client (civicgreenet@gmail.com)</span>
                  </Button>
                </form>

                {submitted && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#138808] shrink-0" />
                    <span>Your mail client has been launched with the support details prefilled.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

