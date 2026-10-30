import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, AlertCircle, X, RotateCw } from 'lucide-react'

/**
 * ServerWakeupBanner
 * 
 * Compact notification banner at the very top of the website, above the navbar.
 * Informs visitors of backend server status, specifically for sleeping free-tier host instances.
 * 
 * @param {Object} props
 * @param {'waking'|'ready'|'unavailable'} props.status Current backend state
 * @param {boolean} props.visible Whether the banner is currently displayed
 * @param {Function} props.onDismiss Callback when user closes or auto-dismisses
 * @param {Function} [props.onRetry] Callback to manually trigger a re-check
 */
export default function ServerWakeupBanner({
  status = 'waking',
  visible = true,
  onDismiss = () => {},
  onRetry = () => {}
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative z-50 overflow-hidden"
          role="status"
          aria-live="polite"
        >
          {/* Banner container with soft saffron / cream tones and distinct Indian tricolor orange left border */}
          <div
            className={`w-full border-b transition-colors duration-300 ${
              status === 'ready'
                ? 'bg-[#F4FAF6] dark:bg-[#0B1E14] border-emerald-200/90 dark:border-emerald-900/50 border-l-4 border-l-[#138808]'
                : status === 'unavailable'
                ? 'bg-[#FFF5F5] dark:bg-[#201010] border-rose-200/90 dark:border-rose-900/50 border-l-4 border-l-rose-500'
                : 'bg-[#FFFDF6] dark:bg-[#1A140E] border-amber-200/90 dark:border-amber-900/50 border-l-4 border-l-[#FF9933]'
            }`}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8 text-xs sm:text-[13px]">
              {/* Left: Indicator & Status Text */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {status === 'waking' && (
                  <div className="shrink-0 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-[#FF9933]" />
                  </div>
                )}

                {status === 'ready' && (
                  <div className="shrink-0 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-[#138808] dark:text-emerald-400" />
                  </div>
                )}

                {status === 'unavailable' && (
                  <div className="shrink-0 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1 leading-snug">
                  {status === 'waking' && (
                    <p className="text-amber-950 dark:text-amber-100">
                      <strong className="font-semibold text-amber-900 dark:text-amber-200">
                        Waking the server up
                      </strong>{' '}
                      — CivicGreenNet is preparing its services. The first request after inactivity may take up to a minute.
                    </p>
                  )}

                  {status === 'ready' && (
                    <p className="text-emerald-950 dark:text-emerald-100">
                      <strong className="font-semibold text-emerald-900 dark:text-emerald-200">
                        CivicGreenNet is ready
                      </strong>{' '}
                      — All services are operational.
                    </p>
                  )}

                  {status === 'unavailable' && (
                    <p className="text-rose-950 dark:text-rose-100">
                      <strong className="font-semibold text-rose-900 dark:text-rose-200">
                        Server response delayed
                      </strong>{' '}
                      — Backend service is currently taking longer than expected. You can continue browsing; live actions will retry automatically.
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Actions (Retry if delayed, Close X) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {status === 'unavailable' && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-rose-800 dark:text-rose-200 bg-rose-100/70 hover:bg-rose-200/80 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 transition-colors"
                    title="Retry server connection"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onDismiss}
                  className={`p-1 rounded-md transition-colors ${
                    status === 'ready'
                      ? 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60 dark:text-emerald-300 dark:hover:bg-emerald-950/60'
                      : status === 'unavailable'
                      ? 'text-rose-800 hover:text-rose-950 hover:bg-rose-100/60 dark:text-rose-300 dark:hover:bg-rose-950/60'
                      : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 dark:text-amber-300 dark:hover:bg-amber-950/60'
                  }`}
                  aria-label="Dismiss server status notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

