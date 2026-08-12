import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { MapPin, ImagePlus, Sparkles, Send, Loader2, X, ShieldCheck, AlertTriangle } from 'lucide-react'
import complaintsApi from '../services/complaints'
import MapPicker from '../components/MapPicker'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import Button from '../ui/Button'

const categories = ['Sanitation', 'Roads', 'Water', 'Electricity', 'Public Safety', 'Waste', 'Parks', 'Other']
const priorities = ['low', 'medium', 'high', 'critical']
const severities = ['minor', 'moderate', 'major', 'critical']

export default function ComplaintForm() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [images, setImages] = useState([])
  const [location, setLocation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const [similarComplaint, setSimilarComplaint] = useState(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateCheckPassed, setDuplicateCheckPassed] = useState(false)

  function addFiles(files) {
    const allowed = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 6)
    setImages((prev) => [...prev, ...allowed].slice(0, 6))
  }

  function handleFileInput(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit(data, force = false) {
    if (!location) {
      toast.error('Please pick a location on the map.')
      return
    }

    if (!duplicateCheckPassed && !force) {
      setSubmitting(true)
      try {
        const list = await complaintsApi.nearby({ lat: location.lat, lng: location.lng, radius: 200 })
        const similar = (list || []).find(
          (c) =>
            c.category?.toLowerCase() === data.category?.toLowerCase() &&
            !['resolved', 'rejected', 'closed'].includes(c.status)
        )
        if (similar) {
          setSimilarComplaint(similar)
          setShowDuplicateModal(true)
          setSubmitting(false)
          return
        }
      } catch (err) {
        console.error('Duplicate check failed, proceeding anyway:', err)
      } finally {
        setSubmitting(false)
      }
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', data.title || '')
      fd.append('description', data.description || '')
      fd.append('category', data.category || '')
      fd.append('priority', data.priority || 'medium')
      fd.append('severity', data.severity || 'moderate')
      fd.append('address', data.address || '')
      fd.append('location', JSON.stringify({ lat: location.lat, lng: location.lng }))
      fd.append('isAnonymous', data.isAnonymous ? 'true' : 'false')
      images.forEach((f) => fd.append('images', f))
      const created = (await complaintsApi.createComplaint(fd))?.id
      toast.success('Complaint submitted')
      if (created) navigate(`/complaints/${created}`)
      else navigate('/complaints')
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit complaint')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
  const labelCls = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"

  return (
    <AppShell title="Report Issue">
      <PageHeader
        title="Report an Issue"
        subtitle="Help us build a cleaner, smarter city. AI will analyze and route your report."
        icon={MapPin}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Issue details */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">1</span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Issue Details</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="title">Title <span className="text-slate-400">(optional)</span></label>
              <input id="title" {...register('title')} placeholder="e.g. Pothole on Main Street" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="description">Description <span className="text-red-500">*</span></label>
              <textarea id="description" rows={5} {...register('description', { required: 'Description is required' })} placeholder="Describe the issue in detail…" className={inputCls} />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls} htmlFor="category">Category</label>
                <select id="category" {...register('category')} className={inputCls}>
                  {categories.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="priority">Priority</label>
                <select id="priority" {...register('priority')} className={inputCls}>
                  {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="severity">Severity</label>
                <select id="severity" {...register('severity')} className={inputCls}>
                  {severities.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="address">Address / Location description</label>
              <input id="address" {...register('address')} placeholder="e.g. Near Central Market, Sector 12" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">2</span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Location</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Click on the map to pin the exact location of the issue.</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <MapPicker value={location} onChange={setLocation} />
          </div>
          {location && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </div>
          )}
        </div>

        {/* Images */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">3</span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Photos <span className="text-slate-400">(up to 6)</span></h2>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragOver ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-brand-400'}`}
          >
            <ImagePlus className="mb-2 h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Click or drag &amp; drop images</p>
            <p className="text-xs text-slate-400">JPG, PNG, WebP up to 6 images</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
          </div>
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {images.map((f, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <img src={URL.createObjectURL(f)} alt={`Preview ${i + 1}`} className="h-20 w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} aria-label="Remove image" className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anonymous + submit */}
        <div className="card p-5">
          <label className="flex items-start gap-3">
            <input type="checkbox" {...register('isAnonymous')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600" />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100"><ShieldCheck className="h-4 w-4 text-brand-500" aria-hidden="true" /> Report anonymously</span>
              <span className="text-xs text-slate-400">Your name and contact details will not be shown publicly.</span>
            </span>
          </label>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Please only report real civic issues. False reports may be penalized.</span>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={submitting} className="inline-flex items-center gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {submitting ? 'Submitting…' : 'Submit Complaint'}
            </Button>
          </div>
        </div>
      </form>

      {/* Duplicate warning modal */}
      {showDuplicateModal && similarComplaint && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Similar Complaint Nearby</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              A similar complaint of category <span className="font-semibold text-brand-600 dark:text-brand-400">"{similarComplaint.category}"</span> has already been reported within 200 meters of this location:
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                #{similarComplaint.id}: {similarComplaint.title || 'Untitled Complaint'}
              </div>
              <div className="mt-1 text-slate-500">
                Distance: {Math.round(similarComplaint.distance)}m • Status: <span className="capitalize">{similarComplaint.status}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href={`/complaints/${similarComplaint.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                View Existing Complaint
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateCheckPassed(true)
                    setShowDuplicateModal(false)
                    handleSubmit((d) => onSubmit(d, true))()
                  }}
                  className="flex-1 rounded-lg bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
