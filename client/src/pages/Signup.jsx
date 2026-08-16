import React, { useState, useEffect, useContext } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, UserPlus, CheckCircle, ChevronRight, ShieldCheck } from 'lucide-react'
import CivicGreenNetLogo from '../components/brand/CivicGreenNetLogo'
import OtpInput from '../components/OtpInput'
import api, { unwrapResponse } from '../services/api'
import AuthLayout from '../components/AuthLayout'
import ThemeContext from '../context/ThemeContext'
import AuthContext from '../context/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

function PasswordStrength({ password }) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  const textColors = ['text-red-500 border-red-500', 'text-amber-500 border-amber-500', 'text-yellow-500 border-yellow-500', 'text-emerald-500 border-emerald-500']

  return (
    <div className="flex gap-1.5 mt-2 items-center">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`text-base leading-none ${i < score ? textColors[score - 1].split(' ')[0] : 'text-slate-200 dark:text-slate-800'}`}>●</span>
      ))}
      <span className={`text-xs font-semibold ${textColors[score - 1]?.split(' ')[0]} ml-1`}>{labels[score - 1]}</span>
    </div>
  )
}

export default function Signup() {
  const { dark, setDark } = useContext(ThemeContext)
  const { loginWithTokens } = useContext(AuthContext)
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { accountType: 'officer', confirmAuthorized: false },
    shouldUnregister: false
  })
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [accountType, setAccountType] = useState('officer') // default to officer for this flow
  const [step, setStep] = useState(1)

  // OTP Verification State
  const [otpState, setOtpState] = useState(null) // { email, maskedEmail, role, expiresInSeconds }
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendingOtp, setResendingOtp] = useState(false)

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

  const handleAccountTypeChange = (type) => {
    setAccountType(type)
    setValue('accountType', type)
  }
  
  // Database dynamic listings
  const [departments, setDepartments] = useState([])
  const [municipalities, setMunicipalities] = useState([])
  const [zones, setZones] = useState([])
  const [wards, setWards] = useState([])

  const [loadingDepts, setLoadingDepts] = useState(false)
  const [loadingMuns, setLoadingMuns] = useState(false)
  const [loadingZones, setLoadingZones] = useState(false)
  const [loadingWards, setLoadingWards] = useState(false)

  const [errorDepts, setErrorDepts] = useState(null)
  const [errorMuns, setErrorMuns] = useState(null)
  const [successData, setSuccessData] = useState(null)

  // Watch inputs for dynamic updates
  const password = watch('password', '')
  const watchMun = watch('municipalityId', '')
  const watchZone = watch('zoneId', '')
  const watchWard = watch('wardId', '')
  const watchJurisdiction = watch('jurisdiction', '')
  const watchCheckbox = watch('confirmAuthorized', false)

  const munName = municipalities.find(m => String(m.id) === String(watchMun))?.name || '—'
  const zoneName = zones.find(z => String(z.id) === String(watchZone))?.name || '—'
  const wardName = wards.find(w => String(w.id) === String(watchWard))?.name || '—'

  useEffect(() => {
    if (accountType === 'officer') {
      setLoadingDepts(true)
      setErrorDepts(null)
      api.get('/departments')
        .then((res) => {
          setDepartments(unwrapResponse(res) || [])
        })
        .catch(() => {
          setErrorDepts('Failed to load departments from backend')
        })
        .finally(() => setLoadingDepts(false))

      setLoadingMuns(true)
      setErrorMuns(null)
      api.get('/municipalities')
        .then((res) => {
          setMunicipalities(unwrapResponse(res) || [])
        })
        .catch(() => {
          setErrorMuns('Failed to load municipalities from backend')
        })
        .finally(() => setLoadingMuns(false))
    }
  }, [accountType])

  // Cascade 1: Fetch Zones when Municipality changes
  useEffect(() => {
    if (accountType === 'officer' && watchMun) {
      setLoadingZones(true)
      api.get(`/municipalities/${watchMun}/zones`)
        .then((res) => {
          setZones(unwrapResponse(res) || [])
        })
        .catch(() => {
          setZones([])
        })
        .finally(() => setLoadingZones(false))
    } else {
      setZones([])
    }
    setValue('zoneId', '')
    setValue('wardId', '')
  }, [watchMun, accountType, setValue])

  // Cascade 2: Fetch Wards when Zone changes
  useEffect(() => {
    if (accountType === 'officer' && watchZone) {
      setLoadingWards(true)
      api.get(`/zones/${watchZone}/wards`)
        .then((res) => {
          setWards(unwrapResponse(res) || [])
        })
        .catch(() => {
          setWards([])
        })
        .finally(() => setLoadingWards(false))
    } else {
      setWards([])
    }
    setValue('wardId', '')
  }, [watchZone, accountType, setValue])

  const handleNextStep = async () => {
    let fieldsToValidate = []
    if (step === 1) {
      fieldsToValidate = ['name', 'email', 'phone']
    } else if (step === 2) {
      fieldsToValidate = ['departmentId', 'designation']
    }
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep(prev => prev + 1)
    }
  }

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1))
  }

  async function onSubmit(data) {
    try {
      const payload = {
        name: (data.name || '').trim(),
        email: (data.email || '').trim().toLowerCase(),
        password: data.password || '',
        accountType: accountType,
        phone: data.phone || '',
        departmentId: data.departmentId || '',
        municipalityId: data.municipalityId || '',
        zoneId: data.zoneId || '',
        wardId: data.wardId || '',
        jurisdiction: data.jurisdiction || '',
        designation: data.designation || ''
      }
      const res = await api.post('/auth/signup', payload)
      const resData = unwrapResponse(res)

      setOtpState({
        email: payload.email,
        maskedEmail: resData.maskedEmail || payload.email,
        role: payload.accountType,
        expiresInSeconds: resData.expiresInSeconds || 300
      })
      setResendCooldown(resData.cooldownSeconds || 60)
      setOtpCode('')
      setOtpError('')
      toast.success(resData.message || 'Verification code sent to your email!')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Signup failed')
    }
  }

  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.')
      return
    }

    setVerifyingOtp(true)
    setOtpError('')
    try {
      const res = await api.post('/auth/verify-otp', {
        email: otpState.email,
        otp: otpCode,
        purpose: 'signup'
      })
      const resData = unwrapResponse(res)

      if (otpState.role === 'citizen') {
        if (resData.accessToken && loginWithTokens) {
          loginWithTokens({
            accessToken: resData.accessToken || resData.token,
            refreshToken: resData.refreshToken,
            user: resData.user
          })
        }
        toast.success(resData.message || 'Email verified successfully!')
        navigate('/dashboard')
      } else {
        // Officer
        setSuccessData(resData.user || resData)
        toast.success('Email verified successfully! Application submitted.')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Verification failed. Please check the code and try again.'
      setOtpError(msg)
      toast.error(msg)
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendingOtp) return
    setResendingOtp(true)
    setOtpError('')
    try {
      const res = await api.post('/auth/resend-otp', {
        email: otpState.email,
        purpose: 'signup'
      })
      const resData = unwrapResponse(res)
      setResendCooldown(resData.cooldownSeconds || 60)
      toast.success(resData.message || 'New verification code sent!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend code')
    } finally {
      setResendingOtp(false)
    }
  }

  // Render OTP Verification Step
  if (otpState && !successData) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-surface-darker">
        {/* Left branding panel for officer */}
        {otpState.role === 'officer' && (
          <div className="relative hidden w-[35%] overflow-hidden bg-slate-900 text-slate-100 lg:flex lg:flex-col lg:justify-between lg:p-10 border-r border-slate-800">
            <div className="relative z-10">
              <CivicGreenNetLogo variant="horizontal" theme="white" size="md" />
            </div>

            <div className="relative z-10 max-w-sm my-auto space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Identity Confirmation
              </span>
              <h2 className="text-2xl font-bold leading-tight text-white">
                Verify Your Official Email Address
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                We take governance integrity seriously. Confirming your official email confirms your municipal identity before administrative review.
              </p>
            </div>

            <div className="relative z-10 text-[11px] text-slate-500 flex justify-between">
              <span>Encrypted OTP Protection</span>
              <span>© 2026 Civic GreenNet</span>
            </div>
          </div>
        )}

        {/* OTP Input Form */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-16">
          <div className="mx-auto w-full max-w-md space-y-6">
            {otpState.role !== 'officer' && (
              <div className="flex justify-center mb-2">
                <CivicGreenNetLogo variant="horizontal" size="md" />
              </div>
            )}

            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="rounded-full bg-brand-500/10 border border-brand-500/20 p-3.5 text-brand-600 dark:text-brand-400">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Verify Your Email
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                We have sent a 6-digit verification code to <span className="font-semibold text-slate-900 dark:text-slate-200">{otpState.maskedEmail}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                    6-Digit Security Code
                  </label>
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
                    <p className="mt-3 text-center text-xs font-medium text-red-500 dark:text-red-400">
                      {otpError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {verifyingOtp ? 'Verifying Code...' : 'Verify Email & Complete Registration'}
                </Button>
              </form>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resendingOtp}
                  className={`text-xs font-semibold transition-colors ${
                    resendCooldown > 0 || resendingOtp
                      ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'text-brand-600 dark:text-brand-400 hover:underline'
                  }`}
                >
                  {resendingOtp
                    ? 'Sending new code...'
                    : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't receive code? Resend Code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpState(null)
                    setOtpCode('')
                    setOtpError('')
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ← Edit registration details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render registration success receipt screen for officers
  if (successData) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-surface-darker">
        {/* Left balanced branding panel */}
        <div className="relative hidden w-[35%] overflow-hidden bg-slate-900 text-slate-100 lg:flex lg:flex-col lg:justify-between lg:p-10 border-r border-slate-800">
          <div className="relative z-10">
            <CivicGreenNetLogo variant="horizontal" theme="white" size="md" />
          </div>

          <div className="relative z-10 max-w-sm my-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Municipal Officer Portal
            </span>
            <h2 className="text-2xl font-bold leading-tight text-white">
              Application Submitted Successfully
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your registration is securely recorded and queued for review. Approved officers will receive access details shortly.
            </p>
          </div>

          <div className="relative z-10 text-[11px] text-slate-500 flex justify-between">
            <span>Secure role-based access</span>
            <span>© 2026 Civic GreenNet</span>
          </div>
        </div>

        {/* Right side receipt layout */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-16">
          <div className="mx-auto w-full max-w-lg space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 p-4">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Application Submitted
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your officer registration has been successfully submitted and verified.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Application ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                  {successData.registrationId || `CGN-REG-${new Date().getFullYear()}-${String(successData.id || successData.user?.id || '').padStart(5, '0')}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Department:</span>
                <span className="font-semibold text-slate-850 dark:text-slate-200">
                  {successData.departmentName || successData.user?.departmentName || 'Selected Department'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Municipality:</span>
                <span className="font-semibold text-slate-850 dark:text-slate-200">
                  {successData.municipalityName || successData.user?.municipalityName || 'Selected City'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  PENDING ADMIN APPROVAL
                </span>
              </div>
            </div>

            {/* Next Steps Checklist */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Steps</h3>
              <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-450">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-semibold mt-0.5">✓</span>
                  <span>Email address verified securely via 6-digit OTP.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-semibold mt-0.5">2.</span>
                  <span>A platform administrator will review your official municipal credentials.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-semibold mt-0.5">3.</span>
                  <span>You will receive an email notice when your account status is approved or rejected.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-semibold mt-0.5">4.</span>
                  <span>Upon approval, log in using your credentials to access the Officer Dashboard.</span>
                </li>
              </ul>
            </div>

            <Button onClick={() => navigate('/login')} className="h-12 w-full text-sm font-semibold">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Preserve Citizen Form style exactly
  if (accountType === 'citizen') {
    return (
      <AuthLayout
        title="Create your account"
        subtitle="Join Civic GreenNet and help improve your community."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Account Type</label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => handleAccountTypeChange('citizen')}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold tracking-wide transition-all ${accountType === 'citizen' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-355'}`}
              >
                👤 Citizen
              </button>
              <button
                type="button"
                onClick={() => handleAccountTypeChange('officer')}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold tracking-wide transition-all ${accountType === 'officer' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-355'}`}
              >
                🛡 Municipal Officer
              </button>
            </div>
            <input type="hidden" {...register('accountType')} value={accountType} />
          </div>

          <Input
            label="Full name"
            type="text"
            placeholder="Jane Doe"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
          />
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' }
            })}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' }
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />

          <Button type="submit" size="lg" className="w-full mt-2" loading={isSubmitting}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Sign in
          </Link>
        </p>
      </AuthLayout>
    )
  }

  // Redesigned premium two-column layout for Officer Signup
  const isStep1Valid = watch('name') && watch('email') && watch('phone') && !errors.name && !errors.email && !errors.phone;
  const isStep2Valid = watch('departmentId') && watch('designation');
  const isStep3Valid = watchMun && watchZone && watchWard && watchJurisdiction && password && watchCheckbox && password.length >= 8;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-surface-darker">
      {/* LEFT branding / onboarding panel */}
      <div className="relative hidden w-[35%] overflow-hidden bg-slate-900 text-slate-100 lg:flex lg:flex-col lg:justify-between lg:p-10 border-r border-slate-800">
        <div className="relative z-10">
          <CivicGreenNetLogo variant="horizontal" theme="white" size="md" />
        </div>

        <div className="relative z-10 max-w-sm my-auto space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            Municipal Officer Portal
          </span>
          <h2 className="text-2xl font-bold leading-tight text-white">
            Join the team building smarter, cleaner and more responsive communities.
          </h2>

          <div className="space-y-4 pt-2">
            {[
              'Manage assigned civic complaints',
              'Track issues within your jurisdiction',
              'Coordinate resolutions with citizens',
              'Get SLA and complaint alerts'
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-350">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400 text-xs">✓</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Workflow Visualization */}
          <div className="rounded-lg bg-slate-800/40 p-4 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="text-slate-400">Application</span>
              <ChevronRight className="h-3 w-3 text-slate-650" />
              <span>Review</span>
              <ChevronRight className="h-3 w-3 text-slate-650" />
              <span className="text-emerald-400">Approved</span>
              <ChevronRight className="h-3 w-3 text-slate-650" />
              <span>Access</span>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg bg-amber-500/5 p-4 border border-amber-500/10">
            <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-amber-250">
              Officer accounts require administrator approval before portal access is activated.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-slate-500 flex justify-between">
          <span>Secure role-based access</span>
          <span>© 2026 Civic GreenNet</span>
        </div>
      </div>

      {/* RIGHT registration form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-screen">
        {/* Top bar with sign in link & Theme toggle */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="flex items-center lg:hidden">
            <CivicGreenNetLogo variant="horizontal" size="sm" />
          </Link>

          <div className="ml-auto flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-350">Sign in</Link></span>
            <button
              onClick={() => setDark(!dark)}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="mx-auto w-full max-w-xl flex-1 flex flex-col justify-center py-6">
          <div className="mb-8 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-3xl">
                Create Officer Account
              </h1>
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-2xs font-extrabold text-amber-700 uppercase tracking-wider dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
                ADMIN APPROVAL REQUIRED
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Register as a municipal officer. Your application will be reviewed by an administrator.
            </p>
          </div>

          {/* Account type selector */}
          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Account Type</label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => handleAccountTypeChange('citizen')}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold tracking-wide transition-all ${accountType === 'citizen' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-355'}`}
              >
                👤 Citizen
              </button>
              <button
                type="button"
                onClick={() => handleAccountTypeChange('officer')}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold tracking-wide transition-all ${accountType === 'officer' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-355'}`}
              >
                🛡 Municipal Officer
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Officer accounts are reviewed and approved by Civic GreenNet administrators.
            </p>
            <input type="hidden" {...register('accountType')} value={accountType} />
          </div>

          {/* Steps Progress Indicator */}
          <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className={`pb-1 ${step === 1 ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400 dark:border-brand-400' : 'text-slate-400'}`}>1. Personal</span>
              <span className={`pb-1 ${step === 2 ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400 dark:border-brand-400' : 'text-slate-400'}`}>2. Official</span>
              <span className={`pb-1 ${step === 3 ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400 dark:border-brand-400' : 'text-slate-400'}`}>3. Jurisdiction</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            
            {/* STEP 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-100">Personal Information</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tell us who you are.</p>
                </div>
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Jane Doe"
                  error={errors.name?.message}
                  {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
                />
                <div>
                  <Input
                    label="Official Email"
                    type="email"
                    placeholder="you@municipal.gov.in"
                    error={errors.email?.message}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' }
                    })}
                  />
                  <p className="text-3xs text-slate-400 mt-1">Use your official municipal email address.</p>
                </div>
                <div>
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="10-digit mobile number"
                    error={errors.phone?.message}
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' }
                    })}
                  />
                  <p className="text-3xs text-slate-400 mt-1">10-digit mobile number</p>
                </div>
              </div>
            )}

            {/* STEP 2: Official Information */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-100">Official Information</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tell us about your municipal role.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Department
                  </label>
                  <select
                    className="w-full h-12 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    {...register('departmentId', { required: 'Department assignment is required' })}
                  >
                    <option value="">Select your department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <p className="mt-1 text-xs text-red-650">{errors.departmentId.message}</p>
                  )}
                  {errorDepts && <p className="mt-1 text-xs text-red-500">{errorDepts}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Designation
                  </label>
                  <select
                    className="w-full h-12 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    {...register('designation', { required: 'Designation is required' })}
                  >
                    <option value="">Select designation</option>
                    <option value="Municipal Officer">Municipal Officer</option>
                    <option value="Senior Municipal Officer">Senior Municipal Officer</option>
                    <option value="Field Inspector">Field Inspector</option>
                    <option value="Ward Officer">Ward Officer</option>
                    <option value="Sanitation Officer">Sanitation Officer</option>
                    <option value="Environmental Officer">Environmental Officer</option>
                    <option value="Waste Management Officer">Waste Management Officer</option>
                    <option value="Public Works Officer">Public Works Officer</option>
                    <option value="Water & Utilities Officer">Water & Utilities Officer</option>
                    <option value="Health & Safety Officer">Health & Safety Officer</option>
                    <option value="Administrative Officer">Administrative Officer</option>
                  </select>
                  {errors.designation && (
                    <p className="mt-1 text-xs text-red-650">{errors.designation.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Jurisdiction & Security */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-slate-100">Jurisdiction & security</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Define the area you are responsible for.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      City / Municipality
                    </label>
                    <select
                      className="w-full h-12 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500"
                      {...register('municipalityId', { required: 'City / Municipality is required' })}
                    >
                      <option value="">Select Municipality</option>
                      {municipalities.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    {errors.municipalityId && (
                      <p className="mt-1 text-xs text-red-650">{errors.municipalityId.message}</p>
                    )}
                    {errorMuns && <p className="mt-1 text-xs text-red-500">{errorMuns}</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Zone
                    </label>
                    <select
                      className="w-full h-12 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 disabled:opacity-50"
                      disabled={!watchMun}
                      {...register('zoneId', { required: 'Zone selection is required' })}
                    >
                      <option value="">Select Zone</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                    {errors.zoneId && (
                      <p className="mt-1 text-xs text-red-650">{errors.zoneId.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Ward
                    </label>
                    <select
                      className="w-full h-12 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:border-brand-500 disabled:opacity-50"
                      disabled={!watchZone}
                      {...register('wardId', { required: 'Ward selection is required' })}
                    >
                      <option value="">Select Ward</option>
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {errors.wardId && (
                      <p className="mt-1 text-xs text-red-655">{errors.wardId.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Jurisdiction Area"
                      type="text"
                      placeholder="Sector 34–37"
                      error={errors.jurisdiction?.message}
                      {...register('jurisdiction', { required: 'Jurisdiction Area is required' })}
                    />
                  </div>
                </div>

                {/* Summary Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your Jurisdiction</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-450 font-medium">Municipality:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{munName}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 font-medium">Zone:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{zoneName}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 font-medium">Ward:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{wardName}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 font-medium">Area:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{watchJurisdiction || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Security Password */}
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    error={errors.password?.message}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'At least 8 characters' }
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-650"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />

                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', {
                    required: 'Confirm password is required',
                    validate: (val) => val === password || 'Passwords do not match'
                  })}
                />

                {/* Authorization confirmation card box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-850 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="confirmAuthorized"
                      className="mt-1 h-4 w-4 rounded border-slate-350 text-brand-600 outline-none"
                      {...register('confirmAuthorized', { required: 'You must confirm your authorization' })}
                    />
                    <div>
                      <label htmlFor="confirmAuthorized" className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                        Authorization confirmation
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        I confirm that I am an authorized municipal employee and that the information provided is accurate.
                      </p>
                    </div>
                  </div>
                </div>
                {errors.confirmAuthorized && (
                  <p className="text-xs text-red-650 mt-1">{errors.confirmAuthorized.message}</p>
                )}
              </div>
            )}

            {/* Step navigation buttons */}
            <div className="flex justify-between gap-4 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 h-12 rounded-lg border border-slate-350 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 font-semibold text-sm transition-colors"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-grow h-12 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !isStep3Valid}
                  className="flex-grow h-12 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Submitting application...' : 'Submit Officer Application →'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 mt-6 lg:hidden">
          © 2026 Civic GreenNet. Smart governance for every city.
        </div>
      </div>
    </div>
  )
}
