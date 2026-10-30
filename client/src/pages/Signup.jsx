import React, { useState, useEffect, useContext } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle,
  ChevronDown,
  ShieldCheck,
  Check,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
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
  const textColors = ['text-rose-500', 'text-amber-500', 'text-yellow-500', 'text-emerald-600 dark:text-emerald-400']
  const barColors = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-600']

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5 h-1.5 w-full">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-all duration-300 ${
              i < score ? barColors[score - 1] : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-[#64748B] dark:text-slate-400 font-medium">Password strength</span>
        <span className={`font-bold ${textColors[score - 1] || 'text-slate-400'}`}>
          {score > 0 ? labels[score - 1] : 'Too short'}
        </span>
      </div>
    </div>
  )
}

function OfficerStepper({ currentStep = 1 }) {
  const steps = [
    { number: 1, title: 'Personal', subtitle: 'Identity' },
    { number: 2, title: 'Official', subtitle: 'Department & Role' },
    { number: 3, title: 'Jurisdiction', subtitle: 'Area & Security' }
  ]

  return (
    <div className="mb-7">
      <div className="relative flex items-center justify-between">
        {/* Continuous background connector */}
        <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-[2px] bg-slate-200 dark:bg-slate-700 -z-0" />

        {/* Dynamic completed progress fill */}
        <div
          className="absolute left-6 top-5 -translate-y-1/2 h-[2px] bg-[#079B70] transition-all duration-300 -z-0"
          style={{
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : 'calc(100% - 3rem)'
          }}
        />

        {steps.map((s) => {
          const isCompleted = currentStep > s.number
          const isActive = currentStep === s.number

          return (
            <div key={s.number} className="relative z-10 flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                  isCompleted
                    ? 'bg-[#079B70] text-white shadow-sm ring-4 ring-emerald-500/15'
                    : isActive
                    ? 'bg-[#079B70] text-white shadow-md ring-4 ring-emerald-500/25 scale-105'
                    : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4.5 w-4.5 stroke-[2.5]" aria-hidden="true" />
                ) : (
                  <span>{s.number}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs font-bold tracking-tight transition-colors ${
                  isActive
                    ? 'text-[#111827] dark:text-white'
                    : isCompleted
                    ? 'text-[#079B70] dark:text-emerald-400'
                    : 'text-[#64748B] dark:text-slate-500'
                }`}
              >
                {s.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Signup() {
  const { setDark } = useContext(ThemeContext)
  const { loginWithTokens } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  // Initialize account type from query string if present, defaulting to citizen
  const queryRole = new URLSearchParams(location.search).get('type') || new URLSearchParams(location.search).get('role')
  const [accountType, setAccountType] = useState(queryRole === 'officer' ? 'officer' : 'citizen')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      accountType: queryRole === 'officer' ? 'officer' : 'citizen',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      departmentId: '',
      designation: '',
      municipalityId: '',
      zoneId: '',
      wardId: '',
      jurisdiction: '',
      confirmAuthorized: false
    },
    shouldUnregister: false
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState(1)

  // OTP Verification State
  const [otpState, setOtpState] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendingOtp, setResendingOtp] = useState(false)

  // Success Receipt State for Officers
  const [successData, setSuccessData] = useState(null)

  // Dynamic Location & Department listings
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

  // Watch inputs for dynamic calculations
  const password = watch('password', '')
  const watchMun = watch('municipalityId', '')
  const watchZone = watch('zoneId', '')
  const watchWard = watch('wardId', '')
  const watchJurisdiction = watch('jurisdiction', '')
  const watchCheckbox = watch('confirmAuthorized', false)

  const munName = municipalities.find((m) => String(m.id) === String(watchMun))?.name || '—'
  const zoneName = zones.find((z) => String(z.id) === String(watchZone))?.name || '—'
  const wardName = wards.find((w) => String(w.id) === String(watchWard))?.name || '—'

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer = null
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1))
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

  // Fetch departments and municipalities when Officer mode is chosen
  useEffect(() => {
    if (accountType === 'officer') {
      setLoadingDepts(true)
      setErrorDepts(null)
      api
        .get('/departments')
        .then((res) => {
          setDepartments(unwrapResponse(res) || [])
        })
        .catch(() => {
          setErrorDepts('Failed to load departments from backend')
        })
        .finally(() => setLoadingDepts(false))

      setLoadingMuns(true)
      setErrorMuns(null)
      api
        .get('/municipalities')
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
      api
        .get(`/municipalities/${watchMun}/zones`)
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
      api
        .get(`/zones/${watchZone}/wards`)
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

  // Step validation handlers
  const handleNextStep = async () => {
    let fieldsToValidate = []
    if (step === 1) {
      fieldsToValidate = ['name', 'email', 'phone']
    } else if (step === 2) {
      fieldsToValidate = ['departmentId', 'designation']
    }
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep((prev) => Math.min(3, prev + 1))
    }
  }

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1))
  }

  // Form submission handler
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

  // OTP Verification handler
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
        // Officer application receipt
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

  // Resend OTP handler
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

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. RENDER: OTP VERIFICATION SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (otpState && !successData) {
    return (
      <AuthLayout
        title="Verify Your Email"
        subtitle={`We have sent a 6-digit verification code to ${otpState.maskedEmail}`}
        cardMaxWidth="max-w-[480px]"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-2xs font-extrabold text-[#079B70] dark:text-emerald-400 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[#079B70] animate-pulse" />
            {otpState.role === 'officer' ? 'OFFICER IDENTITY CONFIRMATION' : 'CITIZEN VERIFICATION'}
          </span>
        }
      >
        <div className="flex flex-col items-center justify-center text-center space-y-3 mb-6">
          <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-[#079B70] dark:text-emerald-400 shadow-xs">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-sm">
            Confirming your email confirms your identity and activates secure platform access.
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <label className="block text-center text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 mb-3">
              6-Digit Security Code
            </label>
            <OtpInput
              length={6}
              value={otpCode}
              onChange={(val) => {
                setOtpCode(val)
                if (otpError) setOtpError('')
              }}
              disabled={verifyingOtp}
              hasError={Boolean(otpError)}
            />
            {otpError && (
              <p className="mt-3 text-center text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                {otpError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="brand"
            disabled={verifyingOtp || otpCode.length !== 6}
            loading={verifyingOtp}
            className="w-full h-12 text-sm font-bold shadow-md shadow-emerald-900/15"
          >
            <span>Verify Email & Complete Registration</span>
          </Button>
        </form>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCooldown > 0 || resendingOtp}
            className={`text-xs font-semibold transition-colors ${
              resendCooldown > 0 || resendingOtp
                ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'text-[#079B70] dark:text-emerald-400 hover:underline'
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
            className="text-xs text-[#64748B] hover:text-[#111827] dark:text-slate-400 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Edit registration details</span>
          </button>
        </div>
      </AuthLayout>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. RENDER: OFFICER REGISTRATION SUCCESS RECEIPT SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (successData) {
    return (
      <AuthLayout
        title="Application Submitted"
        subtitle="Your officer registration has been successfully submitted and verified."
        cardMaxWidth="max-w-xl"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-2xs font-extrabold text-[#079B70] dark:text-emerald-400 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[#079B70] animate-pulse" />
            APPLICATION RECORDED
          </span>
        }
      >
        <div className="flex flex-col items-center justify-center text-center space-y-3 mb-6">
          <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 p-3.5 shadow-xs">
            <CheckCircle className="h-10 w-10 text-[#079B70]" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[#F3F8F5]/80 p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-3.5">
          <div className="flex justify-between items-center text-sm border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <span className="text-[#64748B] dark:text-slate-400 font-medium">Application ID:</span>
            <span className="font-mono font-bold text-[#111827] dark:text-white bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700">
              {successData.registrationId ||
                `CGN-REG-${new Date().getFullYear()}-${String(successData.id || successData.user?.id || '').padStart(5, '0')}`}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <span className="text-[#64748B] dark:text-slate-400 font-medium">Department:</span>
            <span className="font-bold text-[#111827] dark:text-slate-200">
              {successData.departmentName || successData.user?.departmentName || 'Selected Department'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-200/60 dark:border-slate-800 pb-3">
            <span className="text-[#64748B] dark:text-slate-400 font-medium">Municipality:</span>
            <span className="font-bold text-[#111827] dark:text-slate-200">
              {successData.municipalityName || successData.user?.municipalityName || 'Selected City'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#64748B] dark:text-slate-400 font-medium">Status:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-2xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF922B] animate-pulse" />
              PENDING ADMIN APPROVAL
            </span>
          </div>
        </div>

        {/* Next Steps Checklist */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/30 space-y-3 mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
            Next Steps
          </h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="text-[#079B70] font-bold mt-0.5">✓</span>
              <span>Email address verified securely via 6-digit OTP.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#079B70] font-bold mt-0.5">2.</span>
              <span>A platform administrator will review your official municipal credentials.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#079B70] font-bold mt-0.5">3.</span>
              <span>You will receive an email notice when your account status is approved or rejected.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#079B70] font-bold mt-0.5">4.</span>
              <span>Upon approval, log in using your credentials to access the Officer Dashboard.</span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <Button
            variant="brand"
            onClick={() => navigate('/login')}
            className="h-12 w-full text-sm font-bold shadow-md shadow-emerald-900/15"
          >
            <span>Back to Login</span>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. RENDER: CITIZEN REGISTRATION WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────
  if (accountType === 'citizen') {
    return (
      <AuthLayout
        title="Create Your Account"
        subtitle="Join CivicGreenNet and help improve your community."
        cardMaxWidth="max-w-[480px]"
      >
        {/* Account Type Selector */}
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
            Account Type
          </label>
          <div className="grid grid-cols-2 p-1.5 bg-[#F3F8F5] dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleAccountTypeChange('citizen')}
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-bold tracking-wide transition-all bg-white text-[#111827] shadow-sm border border-slate-200/60 dark:bg-slate-700 dark:text-white dark:border-transparent"
            >
              <User className="h-4 w-4 text-[#079B70]" />
              <span>Citizen</span>
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeChange('officer')}
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-bold tracking-wide transition-all text-[#64748B] hover:text-[#111827] dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ShieldCheck className="h-4 w-4 text-[#64748B]" />
              <span>Municipal Officer</span>
            </button>
          </div>
          <input type="hidden" {...register('accountType')} value="citizen" />
        </div>

        {/* Citizen Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5" noValidate>
          <div>
            <Input
              label="Full Name"
              type="text"
              placeholder="Jane Doe"
              autoComplete="name"
              icon={User}
              error={errors.name?.message}
              {...register('name', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' }
              })}
            />
          </div>

          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              icon={Mail}
              error={errors.email?.message}
              {...register('email', {
                required: 'Email address is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address' }
              })}
            />
          </div>

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              autoComplete="new-password"
              icon={Lock}
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' }
              })}
            />
            <PasswordStrength password={password} />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full h-12 text-sm sm:text-base font-bold shadow-md shadow-emerald-900/15"
              loading={isSubmitting}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>Create Account</span>
            </Button>
          </div>
        </form>

        <div className="mt-7 text-center text-xs sm:text-sm text-[#64748B] dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-[#079B70] hover:text-[#078B24] dark:text-emerald-400 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. RENDER: MUNICIPAL OFFICER REGISTRATION WIZARD (3-STEP)
  // ─────────────────────────────────────────────────────────────────────────────
  const isStep3Valid =
    watchMun &&
    watchZone &&
    watchWard &&
    watchJurisdiction &&
    password &&
    watchCheckbox &&
    password.length >= 8

  return (
    <AuthLayout
      title="Create Officer Account"
      subtitle="Register as a municipal officer. Your application will be reviewed by a CivicGreenNet administrator."
      cardMaxWidth="max-w-2xl"
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-2xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF922B] animate-pulse" />
          ADMIN APPROVAL REQUIRED
        </span>
      }
    >
      {/* Account Type Selector */}
      <div className="mb-6">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
          Account Type
        </label>
        <div className="grid grid-cols-2 p-1.5 bg-[#F3F8F5] dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleAccountTypeChange('citizen')}
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-bold tracking-wide transition-all text-[#64748B] hover:text-[#111827] dark:text-slate-400 dark:hover:text-slate-200"
          >
            <User className="h-4 w-4" />
            <span>Citizen</span>
          </button>
          <button
            type="button"
            onClick={() => handleAccountTypeChange('officer')}
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs sm:text-sm font-bold tracking-wide transition-all bg-white text-[#111827] shadow-sm border border-slate-200/60 dark:bg-slate-700 dark:text-white dark:border-transparent"
          >
            <ShieldCheck className="h-4 w-4 text-[#079B70]" />
            <span>Municipal Officer</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-[#64748B] dark:text-slate-400">
          Officer accounts are reviewed and approved by CivicGreenNet administrators.
        </p>
        <input type="hidden" {...register('accountType')} value="officer" />
      </div>

      {/* 3-Step Progress Stepper */}
      <OfficerStepper currentStep={step} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* ── STEP 1: Personal Information ───────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-[#111827] dark:text-white">
                Personal Information
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Tell us who you are.
              </p>
            </div>

            <div>
              <Input
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                icon={User}
                error={errors.name?.message}
                {...register('name', {
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
              />
            </div>

            <div>
              <Input
                label="Official Email"
                type="email"
                placeholder="you@municipal.gov.in"
                autoComplete="email"
                icon={Mail}
                hint="Use your official municipal email address."
                error={errors.email?.message}
                {...register('email', {
                  required: 'Official email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' }
                })}
              />
            </div>

            <div>
              <Input
                label="Phone Number"
                type="tel"
                placeholder="10-digit mobile number"
                autoComplete="tel"
                icon={Phone}
                hint="10-digit mobile number"
                error={errors.phone?.message}
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' }
                })}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Official Information ───────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-[#111827] dark:text-white">
                Official Information
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Tell us about your municipal role.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-slate-300">
                Department
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] transition-all duration-150 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-[#0D1929] dark:text-[#F8FAFC] ${
                    errors.departmentId ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 hover:border-slate-400 dark:border-[#26374D]'
                  }`}
                  {...register('departmentId', { required: 'Department assignment is required' })}
                >
                  <option value="">Select your department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              {errors.departmentId && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                  {errors.departmentId.message}
                </p>
              )}
              {errorDepts && <p className="mt-1.5 text-xs text-rose-500">{errorDepts}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-slate-300">
                Designation
              </label>
              <div className="relative">
                <select
                  className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] transition-all duration-150 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-[#0D1929] dark:text-[#F8FAFC] ${
                    errors.designation ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 hover:border-slate-400 dark:border-[#26374D]'
                  }`}
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
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              {errors.designation && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                  {errors.designation.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Jurisdiction & Security ────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-[#111827] dark:text-white">
                Jurisdiction & Security
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Define the area you are responsible for.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-slate-300">
                  City / Municipality
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] transition-all duration-150 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-[#0D1929] dark:text-[#F8FAFC] ${
                      errors.municipalityId ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 hover:border-slate-400 dark:border-[#26374D]'
                    }`}
                    {...register('municipalityId', { required: 'City / Municipality is required' })}
                  >
                    <option value="">Select Municipality</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                {errors.municipalityId && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                    {errors.municipalityId.message}
                  </p>
                )}
                {errorMuns && <p className="mt-1.5 text-xs text-rose-500">{errorMuns}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-slate-300">
                  Zone
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] transition-all duration-150 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-[#0D1929] dark:text-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed ${
                      errors.zoneId ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 hover:border-slate-400 dark:border-[#26374D]'
                    }`}
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
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                {errors.zoneId && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                    {errors.zoneId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-slate-300">
                  Ward
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] transition-all duration-150 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:bg-[#0D1929] dark:text-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed ${
                      errors.wardId ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 hover:border-slate-400 dark:border-[#26374D]'
                    }`}
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
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                {errors.wardId && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                    {errors.wardId.message}
                  </p>
                )}
              </div>

              <div>
                <Input
                  label="Jurisdiction Area"
                  type="text"
                  placeholder="e.g. Sector 34–37"
                  error={errors.jurisdiction?.message}
                  {...register('jurisdiction', { required: 'Jurisdiction Area is required' })}
                />
              </div>
            </div>

            {/* Jurisdiction Live Summary Preview */}
            <div className="rounded-xl border border-emerald-900/10 bg-emerald-500/[0.04] p-4 dark:border-emerald-500/20 dark:bg-slate-900/50 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#079B70] dark:text-emerald-400">
                  Your Jurisdiction Summary
                </h4>
                <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">Live Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 font-medium">Municipality:</span>{' '}
                  <span className="font-bold text-[#111827] dark:text-slate-200">{munName}</span>
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 font-medium">Zone:</span>{' '}
                  <span className="font-bold text-[#111827] dark:text-slate-200">{zoneName}</span>
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 font-medium">Ward:</span>{' '}
                  <span className="font-bold text-[#111827] dark:text-slate-200">{wardName}</span>
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 font-medium">Area:</span>{' '}
                  <span className="font-bold text-[#111827] dark:text-slate-200">{watchJurisdiction || '—'}</span>
                </div>
              </div>
            </div>

            {/* Security Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  icon={Lock}
                  error={errors.password?.message}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                />
                <PasswordStrength password={password} />
              </div>

              <div>
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  icon={Lock}
                  error={errors.confirmPassword?.message}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  {...register('confirmPassword', {
                    required: 'Confirm password is required',
                    validate: (val) => val === password || 'Passwords do not match'
                  })}
                />
              </div>
            </div>

            {/* Authorization Confirmation Checkbox */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirmAuthorized"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#079B70] focus:ring-[#079B70]/30 dark:border-slate-700 dark:bg-[#0D1929] cursor-pointer"
                  {...register('confirmAuthorized', { required: 'You must confirm your authorization' })}
                />
                <div>
                  <label htmlFor="confirmAuthorized" className="text-sm font-bold text-[#111827] dark:text-slate-200 cursor-pointer select-none">
                    Authorization Confirmation
                  </label>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed">
                    I confirm that I am an authorized municipal employee and that the information provided is accurate.
                  </p>
                </div>
              </div>
            </div>
            {errors.confirmAuthorized && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">
                {errors.confirmAuthorized.message}
              </p>
            )}

            {/* Officer Account Verification Warning Accent Card */}
            <div className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 shadow-xs">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-[#FF922B] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Officer Account Verification
                  </h4>
                  <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-medium">
                    Officer accounts require administrator approval before portal access is activated.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex-1 h-12 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              type="button"
              variant="brand"
              onClick={handleNextStep}
              className="flex-1 h-12 text-sm font-bold shadow-md shadow-emerald-900/10"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="brand"
              disabled={isSubmitting || !isStep3Valid}
              loading={isSubmitting}
              className="flex-1 h-12 text-sm sm:text-base font-bold shadow-md shadow-emerald-900/15"
            >
              <span>Submit Officer Application</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>

      {/* Footer navigation back to login */}
      <div className="mt-7 text-center text-xs sm:text-sm text-[#64748B] dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-bold text-[#079B70] hover:text-[#078B24] dark:text-emerald-400 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
