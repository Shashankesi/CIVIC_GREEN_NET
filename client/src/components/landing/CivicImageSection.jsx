import React from 'react'

/**
 * CivicImageSection (Vision Banner)
 * 
 * Displays the CivicGreenNet Indian smart-city panoramic image naturally across all screen resolutions
 * with the centered "OUR VISION" glassmorphic content panel, prominent two-line heading,
 * and supporting description.
 */
export default function CivicImageSection() {
  return (
    <section className="vision-banner-section relative w-full overflow-hidden bg-[#071710] border-y border-emerald-950/40 min-h-[250px] sm:min-h-[270px] md:min-h-0 md:h-auto">
      {/* ── Desktop & Laptop: Proportional natural scaling (determines section height without cropping) ── */}
      <img
        src="/images/civicgreennet-citizen-impact.png"
        alt="CivicGreenNet Vision: Indian smart city landscape with child holding Indian flag and modern skyline"
        className="hidden md:block w-full h-auto object-contain object-center select-none pointer-events-none"
        loading="eager"
      />

      {/* ── Mobile & Narrow Viewports (<768px): Anchored cover preserving child and flag ── */}
      <img
        src="/images/civicgreennet-citizen-impact.png"
        alt="CivicGreenNet Vision: Indian smart city landscape"
        className="block md:hidden absolute inset-0 w-full h-full object-cover object-[18%_center] select-none pointer-events-none"
        loading="eager"
      />

      {/* ── Ambient Contrast Overlays: Eliminates glare behind panel while preserving image details ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-black/35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#071710]/40 via-transparent to-[#071710]/50 pointer-events-none" />

      {/* ── Centered Glassmorphic Content Panel ── */}
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 z-10 pointer-events-none">
        <div className="pointer-events-auto text-center mx-auto max-w-[94%] sm:max-w-lg md:max-w-xl lg:max-w-2xl px-4 py-3 sm:px-6 sm:py-4 md:px-7 md:py-4.5 lg:px-9 lg:py-5.5 rounded-2xl sm:rounded-3xl bg-slate-950/70 sm:bg-slate-950/65 backdrop-blur-md sm:backdrop-blur-lg border border-white/20 sm:border-white/25 shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]">
          {/* Eyebrow Label with Indian Tricolour Beacon */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-950/70 border border-emerald-400/35 text-[9px] sm:text-[10px] md:text-[11px] font-extrabold tracking-widest text-emerald-300 uppercase shadow-xs mb-1.5 sm:mb-2 md:mb-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9933]" />
            </span>
            <span>OUR VISION</span>
          </div>

          {/* Main Heading — Two clearly defined lines with premium contrast typography */}
          <h2 className="text-lg sm:text-xl md:text-[22px] lg:text-[28px] xl:text-[34px] font-black tracking-tight leading-[1.14]">
            <span className="block text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Cleaner Communities.
            </span>
            <span className="block bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Stronger Tomorrows.
            </span>
          </h2>

          {/* Saffron, White & Green Decorative Accent Underline */}
          <div className="flex items-center justify-center gap-1.5 my-1.5 sm:my-2 md:my-2.5">
            <span className="h-0.5 sm:h-1 w-4 sm:w-6 rounded-full bg-[#FF9933]" />
            <span className="h-0.5 sm:h-1 w-10 sm:w-14 rounded-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
            <span className="h-0.5 sm:h-1 w-4 sm:w-6 rounded-full bg-[#138808]" />
          </div>

          {/* Supporting Description — Guaranteed readability against glassmorphism surface */}
          <p className="text-[11px] sm:text-xs md:text-[13px] lg:text-[14.5px] font-medium text-slate-100 max-w-lg mx-auto leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            Empowering citizens and municipalities to build cleaner, safer and more liveable cities.
          </p>
        </div>
      </div>

      {/* ── Top & Bottom Indian Tricolour Accent Dividers ── */}
      <div className="absolute top-0 left-0 right-0 z-20 h-[3px] flex pointer-events-none">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 h-[3px] flex pointer-events-none">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>
    </section>
  )
}
