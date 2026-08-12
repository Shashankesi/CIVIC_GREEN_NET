import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import AuthLayout from '../components/AuthLayout'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [sent, setSent] = useState(false)

  async function onSubmit(data) {
    try {
      await api.post('/auth/forgot', data)
      setSent(true)
      toast.success('Reset link sent')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      {sent ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center dark:border-brand-900/40 dark:bg-brand-900/20">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Check your inbox</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            If an account exists for that email, a password reset link has been sent.
          </p>
          <div className="mt-4">
            <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
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
            </div>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              <Mail className="h-4 w-4" aria-hidden="true" />
              Send reset link
            </Button>
          </form>
          <Link to="/login" className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  )
}
