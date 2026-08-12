import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import api from '../services/api'
import AuthLayout from '../components/AuthLayout'
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
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-brand-500']
  const text = ['text-red-600', 'text-amber-600', 'text-yellow-600', 'text-brand-600']
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score - 1] : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      <p className={`mt-1 text-xs ${text[score - 1] || 'text-slate-500'}`}>{score > 0 ? labels[score - 1] : ''}</p>
    </div>
  )
}

export default function Signup() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { accountType: 'citizen' } })
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [accountType, setAccountType] = useState('citizen')
  const password = watch('password', '')

  async function onSubmit(data) {
    try {
      const payload = {
        name: (data.name || '').trim(),
        email: (data.email || '').trim().toLowerCase(),
        password: data.password || '',
        accountType: data.accountType || accountType
      }
      await api.post('/auth/signup', payload)
      const message = payload.accountType === 'officer'
        ? 'Officer registration submitted for admin approval.'
        : 'Registered! Check your email to verify your account.'
      toast.success(message)
      navigate('/login')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Signup failed')
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Civic GreenNet and help improve your community."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Create account as</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAccountType('citizen')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${accountType === 'citizen' ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'}`}
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => setAccountType('officer')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${accountType === 'officer' ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'}`}
            >
              Officer
            </button>
          </div>
          <input type="hidden" {...register('accountType')} value={accountType} />
        </div>
        <div>
          <Input
            label="Full name"
            type="text"
            placeholder="Jane Doe"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
          />
        </div>
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
        <div>
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
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
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
