import React, { useContext, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import api from '../services/api'
import AuthContext from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import Button from '../ui/Button'
import Input from '../ui/Input'

const REMEMBER_ME_STORAGE_KEY = 'cgn_remember_email'

export default function Login() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)
  const [rememberChecked, setRememberChecked] = useState(false)

  // Pre-fill remembered email if saved in localStorage
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBER_ME_STORAGE_KEY)
      if (savedEmail) {
        setValue('email', savedEmail)
        setValue('rememberMe', true)
        setRememberChecked(true)
      }
    } catch {
      // Ignore localStorage access issues
    }
  }, [setValue])

  function getAuthError(err, fallback) {
    return err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || fallback
  }

  async function onSubmit(data) {
    setUnverifiedEmail(null)
    const email = (data.email || '').trim().toLowerCase()
    const password = data.password || ''

    // Persist or clear Remember Me
    try {
      if (data.rememberMe || rememberChecked) {
        localStorage.setItem(REMEMBER_ME_STORAGE_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_ME_STORAGE_KEY)
      }
    } catch {
      // Ignore localStorage failure
    }

    try {
      const payload = {
        email,
        password
      }
      const res = await api.post('/auth/login', payload)
      const { accessToken, refreshToken, user, redirectPath } = res.data

      auth.loginWithTokens({ accessToken, refreshToken, user })
      toast.success('Welcome back!')

      const target =
        redirectPath ||
        (user?.role === 'admin'
          ? '/admin'
          : user?.role === 'officer' && user?.status === 'pending'
          ? '/pending-approval'
          : user?.role === 'officer'
          ? '/officer'
          : '/dashboard')

      navigate(target)
    } catch (err) {
      if (err?.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const targetEmail = err?.response?.data?.email || email
        setUnverifiedEmail(targetEmail)
        toast.error('Please verify your email address to continue.')
        return
      }
      toast.error(getAuthError(err, 'Login failed'))
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to track your civic issues and stay updated."
    >
      {/* Unverified Email Warning Banner */}
      {unverifiedEmail && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs dark:border-amber-900/40 dark:bg-amber-950/25 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-bold text-amber-900 dark:text-amber-300">
                Email Verification Required
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                Your account email has not been verified yet. We sent a verification code to your inbox.
              </p>
              <div className="mt-3">
                <Link to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}>
                  <Button size="sm" variant="brand" className="w-full">
                    Enter Verification Code
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5" noValidate>
        {/* Email Address */}
        <div>
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            icon={Mail}
            error={errors.email?.message}
            {...register('email', {
              required: 'Email address is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
              }
            })}
          />
        </div>

        {/* Password */}
        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            icon={Lock}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            }
            {...register('password', {
              required: 'Password is required'
            })}
          />
        </div>

        {/* Remember Me and Forgot Password */}
        <div className="flex items-center justify-between pt-0.5 text-xs sm:text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-[#138808] focus:ring-[#138808]/30 dark:border-slate-700 dark:bg-[#0D1929]"
              {...register('rememberMe')}
              checked={rememberChecked}
              onChange={(e) => {
                setRememberChecked(e.target.checked)
                setValue('rememberMe', e.target.checked)
              }}
            />
            <span>Remember me</span>
          </label>

          <Link
            to="/forgot-password"
            className="font-semibold text-[#138808] hover:text-[#0f6f06] dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Primary Sign In Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full h-12 text-sm sm:text-base font-bold shadow-lg shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-[0.99] transition-all"
            loading={isSubmitting}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Sign In</span>
          </Button>
        </div>
      </form>

      {/* Sign Up Link */}
      <div className="mt-7 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-bold text-[#138808] hover:text-[#0f6f06] dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
        >
          <span>Sign up</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </AuthLayout>
  )
}
