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
      title="Reset Your Password"
      subtitle="Enter your email and we'll send you a secure password reset link."
    >
      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-xs">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#138808] dark:text-emerald-400" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Check your inbox</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            If an account exists for that email, a password reset link has been sent.
          </p>
          <div className="mt-4">
            <Link to="/login" className="text-sm font-semibold text-[#138808] hover:text-[#0f6f06] dark:text-emerald-400">
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
                placeholder="name@example.com"
                autoComplete="email"
                icon={Mail}
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' }
                })}
              />
            </div>
            <Button type="submit" variant="brand" size="lg" className="w-full" loading={isSubmitting}>
              <Mail className="h-4 w-4" aria-hidden="true" />
              Send reset link
            </Button>
          </form>
          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
          </Link>
        </>
      )}
    </AuthLayout>
  )
}
