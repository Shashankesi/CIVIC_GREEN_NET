import React, { useEffect, useState, useContext } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Clock, ShieldAlert, Loader2, ArrowRight, Mail, RefreshCw, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { unwrapResponse } from '../services/api'
import AuthLayout from '../components/AuthLayout'
import Button from '../ui/Button'
import Input from '../ui/Input'
import OtpInput from '../components/OtpInput'
import AuthContext from '../context/AuthContext'

export default function EmailVerification() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const emailParam = searchParams.get('email') || ''
  const { user, loginWithTokens } = useContext(AuthContext)
  const navigate = useNavigate()

  // States: loading (for token verification) | success | already_verified | invalid_token | expired_token | server_error | otp_entry
  const [state, setState] = useState(token ? 'loading' : 'otp_entry')
  const [message, setMessage] = useState('')

  // OTP Form States
  const [otpEmail, setOtpEmail] = useState(emailParam || user?.email || '')
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendingOtp, setResendingOtp] = useState(false)
  const [verifiedUserData, setVerifiedUserData] = useState(null)

  useEffect(() => {
    let timer = null
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1))
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    let mounted = true

    async function executeTokenVerification() {
      if (!token || !token.trim()) return

      try {
        const response = await api.get('/auth/verify', { params: { token } })
        const data = response.data

        if (!mounted) return

        if (data.alreadyVerified || data.code === 'ALREADY_VERIFIED') {
          setState('already_verified')
          setMessage(data.message || 'Your email address has already been verified.')
        } else if (data.success || data.code === 'SUCCESS') {
          setState('success')
          setMessage(data.message || 'Email verified successfully! Your Civic GreenNet account is now active.')
          toast.success('Email verified successfully!')
        } else {
          setState('invalid_token')
          setMessage(data.message || 'Verification link is invalid.')
        }
      } catch (err) {
        if (!mounted) return
        const errData = err?.response?.data
        const code = errData?.code

        if (code === 'EXPIRED_TOKEN') {
          setState('expired_token')
          setMessage(errData?.message || 'This verification link has expired.')
        } else if (code === 'INVALID_TOKEN') {
          setState('invalid_token')
          setMessage(errData?.message || 'Verification link is invalid.')
        } else if (code === 'ALREADY_VERIFIED') {
          setState('already_verified')
          setMessage(errData?.message || 'Your email is already verified.')
        } else {
          setState('server_error')
          setMessage(errData?.message || 'Unable to verify your email right now. Please try again.')
        }
      }
    }

    if (token) {
      executeTokenVerification()
    }
    return () => { mounted = false }
  }, [token])

  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    const targetEmail = (otpEmail || '').trim().toLowerCase()
    if (!targetEmail) {
      setOtpError('Please enter your registered email address.')
      return
    }
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.')
      return
    }

    setVerifyingOtp(true)
    setOtpError('')
    try {
      const res = await api.post('/auth/verify-otp', {
        email: targetEmail,
        otp: otpCode,
        purpose: 'signup'
      })
      const data = unwrapResponse(res)

      setVerifiedUserData(data.user)
      setState('success')
      setMessage(data.message || 'Email verified successfully!')
      toast.success('Email verified successfully!')

      if (data.accessToken && loginWithTokens) {
        loginWithTokens({
          accessToken: data.accessToken || data.token,
          refreshToken: data.refreshToken,
          user: data.user
        })
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Verification failed. Please check your code and try again.'
      setOtpError(errMsg)
      toast.error(errMsg)
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    const targetEmail = (otpEmail || '').trim().toLowerCase()
    if (!targetEmail) {
      toast.error('Please enter your email address')
      return
    }
    if (resendCooldown > 0 || resendingOtp) return

    setResendingOtp(true)
    setOtpError('')
    try {
      const res = await api.post('/auth/resend-otp', {
        email: targetEmail,
        purpose: 'signup'
      })
      const data = unwrapResponse(res)
      setResendCooldown(data.cooldownSeconds || 60)
      toast.success(data.message || 'Verification code sent to your email!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send verification code')
    } finally {
      setResendingOtp(false)
    }
  }

  const activeUser = verifiedUserData || user
  const destinationRoute = activeUser
    ? (activeUser.role === 'admin'
        ? '/admin'
        : activeUser.role === 'officer' && activeUser.status === 'pending'
          ? '/pending-approval'
          : activeUser.role === 'officer'
            ? '/officer'
            : '/dashboard')
    : '/login'

  const destinationLabel = activeUser
    ? (activeUser.role === 'officer' && activeUser.status === 'pending'
        ? 'View Application Status'
        : 'Go to Dashboard')
    : 'Proceed to Sign In'

  return (
    <AuthLayout title="Email Verification">
      <div className="py-2">
        {/* 1. LOADING STATE */}
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="relative flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-brand-100 dark:border-brand-900/40" />
              <Loader2 className="absolute h-10 w-10 animate-spin text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Verifying your email...</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Communicating with Civic GreenNet secure servers</p>
            </div>
          </div>
        )}

        {/* 2. SUCCESS STATE */}
        {state === 'success' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Email Verified Successfully!</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {message || 'Your Civic GreenNet account has been verified.'}
            </p>
            <div className="mt-6 flex justify-center">
              <Link to={destinationRoute}>
                <Button className="flex items-center gap-2">
                  {destinationLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 3. ALREADY VERIFIED STATE */}
        {state === 'already_verified' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-6 text-center shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Email Already Verified</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Your account email is already verified in the Civic GreenNet platform.
            </p>
            <div className="mt-6 flex justify-center">
              <Link to={destinationRoute}>
                <Button className="flex items-center gap-2">
                  {destinationLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 4. OTP ENTRY STATE */}
        {state === 'otp_entry' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                <KeyRound className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-850 dark:text-white">Verify your email</h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                We sent a 6-digit verification code to
              </p>
              {otpEmail && (
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                    {otpEmail.includes('@')
                      ? (() => {
                          const [u, d] = otpEmail.split('@');
                          if (!u || !d) return otpEmail;
                          const masked = u.length <= 2 ? `${u[0]}*` : `${u[0]}${'*'.repeat(Math.min(u.length - 2, 5))}${u[u.length - 1]}`;
                          return `${masked}@${d}`;
                        })()
                      : otpEmail}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpEmail('');
                      setOtpCode('');
                      setOtpError('');
                    }}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Change Email
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {!otpEmail && (
                <div>
                  <Input
                    label="Registered Email Address"
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={otpEmail}
                    onChange={e => setOtpEmail(e.target.value)}
                    disabled={verifyingOtp}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    6-Digit Verification Code
                  </label>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Code expires in 10:00
                  </span>
                </div>

                <OtpInput
                  length={6}
                  value={otpCode}
                  onChange={val => {
                    setOtpCode(val)
                    if (otpError) setOtpError('')
                  }}
                  disabled={verifyingOtp}
                  hasError={Boolean(otpError)}
                />
                {otpError && (
                  <p className="mt-2.5 text-center text-xs font-medium text-red-500 dark:text-red-400">
                    {otpError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={verifyingOtp || otpCode.length !== 6 || !otpEmail}
                className="w-full h-11 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {verifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
            </form>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resendingOtp || !otpEmail}
                  className={`font-bold transition-colors ${
                    resendCooldown > 0 || resendingOtp || !otpEmail
                      ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'text-emerald-600 dark:text-emerald-400 hover:underline'
                  }`}
                >
                  {resendingOtp
                    ? 'Sending new code...'
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend Code'}
                </button>
              </div>

              <Link to="/login" className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* 5. EXPIRED TOKEN STATE */}
        {state === 'expired_token' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Link Expired</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              This verification link has expired.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => setState('otp_entry')} className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Verify With 6-Digit Code
              </Button>
              <Link to="/login">
                <Button variant="outline">Back to Sign In</Button>
              </Link>
            </div>
          </div>
        )}

        {/* 6. INVALID TOKEN STATE */}
        {state === 'invalid_token' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-6 text-center shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Verification Link Invalid</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {message || 'The verification link is invalid.'}
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => setState('otp_entry')} className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Verify With 6-Digit Code
              </Button>
              <Link to="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        )}

        {/* 7. SERVER ERROR STATE */}
        {state === 'server_error' && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-6 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to Verify Email</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {message || 'A temporary server error occurred. Please try again.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => window.location.reload()} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
              <Link to="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
