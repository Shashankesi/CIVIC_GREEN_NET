import React, { useState, useEffect, useContext, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, MapPin } from 'lucide-react'
import Navbar from '../components/Navbar'
import Hero from '../components/landing/Hero'
import CivicImageSection from '../components/landing/CivicImageSection'
import HowItWorks from '../components/landing/HowItWorks'
import LiveMapSection from '../components/landing/LiveMapSection'
import CitizenSection from '../components/landing/CitizenSection'
import ImpactSection from '../components/landing/ImpactSection'
import FAQSection from '../components/landing/FAQSection'
import StatsSection from '../components/landing/StatsSection'
import AICivicIntelligence from '../components/landing/AICivicIntelligence'
import Footer from '../components/landing/Footer'
import AuthContext from '../context/AuthContext'
import Button from '../ui/Button'
import publicApi from '../services/publicApi'

export default function Landing() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()

  // Real Database State from Neon PostgreSQL
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [lastStatsFetchTime, setLastStatsFetchTime] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  // Fetch Public Stats
  const loadStats = useCallback(async (signal = null) => {
    try {
      setLoadingStats(true)
      setStatsError(false)
      const s = await publicApi.getPublicStats(signal)
      if (s) {
        setStats(s)
        setLastStatsFetchTime(Date.now())
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to load public stats:', err)
        setStatsError(true)
      }
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadStats(controller.signal)

    const interval = setInterval(() => {
      loadStats(controller.signal)
    }, 45000)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [loadStats])

  // Freshness timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastStatsFetchTime) {
        setSecondsAgo(Math.floor((Date.now() - lastStatsFetchTime) / 1000))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [lastStatsFetchTime])

  const handleScrollToSection = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#101828] dark:text-slate-50 selection:bg-[#138808] selection:text-white">
      {/* 1. NAVBAR */}
      <Navbar />

      {/* 2. HERO + MAP VISUAL */}
      <Hero
        stats={stats}
        loadingStats={loadingStats}
        user={user}
        onScrollToSection={handleScrollToSection}
      />

      {/* 3 & 4. SEAMLESS PANORAMIC CIVIC OVERVIEW + HOW CIVICGREENNET WORKS */}
      <div className="civic-overview-experience relative w-full overflow-hidden border-b border-slate-200/80 dark:border-slate-800">
        {/* Proportional Panoramic Background Layer with natural bottom extension */}
        <div className="civic-panorama-container">
          <div className="relative w-full">
            <img
              src="/images/wide_panoramic_indian_civic_tech_themed_background.png"
              alt="Panoramic Indian Civic Tech Background"
              className="civic-panorama-image"
              loading="eager"
            />
            {/* Seamless bottom blend gradient extending naturally into section background */}
            <div className="absolute inset-x-0 bottom-0 h-20 sm:h-28 md:h-36 bg-gradient-to-b from-transparent via-[#F4F8F5]/40 to-[#F4F8F5] dark:via-[#0B131C]/60 dark:to-[#0B131C] pointer-events-none" />
          </div>
        </div>

        {/* Dark mode overlay to preserve readability */}
        <div className="hidden dark:block absolute inset-0 bg-[#0B131C]/80 pointer-events-none z-1" />

        <div className="relative z-10 w-full">
          <StatsSection
            stats={stats}
            loadingStats={loadingStats}
            statsError={statsError}
            secondsAgo={secondsAgo}
            onRefresh={() => loadStats()}
          />

          <HowItWorks />
        </div>
      </div>

      {/* 5. AI CIVIC INTELLIGENCE */}
      <AICivicIntelligence />

      {/* 6. FULL-WIDTH LIVE MAP */}
      <LiveMapSection stats={stats} secondsAgo={secondsAgo} />

      {/* 7. CITIZEN VOICE & IMPACT */}
      <CitizenSection stats={stats} user={user} />

      {/* 8. OUR IMPACT - MEASURABLE METRICS & PROGRESS */}
      <ImpactSection
        stats={stats}
        loadingStats={loadingStats}
        statsError={statsError}
        secondsAgo={secondsAgo}
        onRefresh={() => loadStats()}
      />

      {/* 9. FREQUENTLY ASKED QUESTIONS */}
      <FAQSection user={user} />

      {/* 10. VISION BANNER - Cleaner Communities */}
      <CivicImageSection user={user} />

      {/* 11. FOOTER */}
      <Footer lastFetchTime={lastStatsFetchTime} />
    </div>
  )
}
