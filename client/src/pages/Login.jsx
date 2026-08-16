import React, { useContext, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import api from '../services/api'
import AuthContext from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const auth = useContext(AuthContext)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)

  function getAuthError(err, fallback) {
    return err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || fallback
  }

  async function onSubmit(data) {
    setUnverifiedEmail(null)
    try {
      const payload = {
        email: (data.email || '').trim().toLowerCase(),
        password: data.password || ''
      }
      const res = await api.post('/auth/login', payload)
      const { accessToken, refreshToken, user, redirectPath } = res.data
      auth.loginWithTokens({ accessToken, refreshToken, user })
      toast.success('Welcome back!')
      const target = redirectPath || (user?.role === 'admin' ? '/admin' : user?.role === 'officer' && user?.status === 'pending' ? '/pending-approval' : user?.role === 'officer' ? '/officer' : '/dashboard')
      navigate(target)
    } catch (err) {
      if (err?.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const targetEmail = err?.response?.data?.email || (data.email || '').trim().toLowerCase()
        setUnverifiedEmail(targetEmail)
        toast.error('Please verify your email address to continue.')
        return
      }
      toast.error(getAuthError(err, 'Login failed'))
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track your civic issues and stay updated."
    >
      {unverifiedEmail && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="font-bold text-amber-900 dark:text-amber-300">
            Email Verification Required
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Your account email has not been verified yet. We have sent a verification code to your inbox.
          </p>
          <div className="mt-3">
            <Link to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}>
              <Button size="sm" className="w-full">
                Enter Verification Code
              </Button>
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
        </div>
        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
