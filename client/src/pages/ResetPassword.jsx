import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import AuthLayout from '../components/AuthLayout'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)
  const password = watch('password', '')

  async function onSubmit(data) {
    try {
      await api.post('/auth/reset', { token, password: data.password })
      setDone(true)
      toast.success('Password reset successfully')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reset failed')
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid or missing link">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This reset link is invalid or expired. Please request a new one.
        </p>
        <div className="mt-4">
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Request a new link</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set a new password">
      {done ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center dark:border-brand-900/40 dark:bg-brand-900/20">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Password updated</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">You can now sign in with your new password.</p>
          <div className="mt-4">
            <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Go to sign in</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="relative">
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter a new password"
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
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              error={errors.confirm?.message}
              {...register('confirm', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match'
              })}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Reset password
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
