import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  MapPin, ImagePlus, Sparkles, Send, Loader2, X, ShieldCheck, AlertTriangle,
  ArrowRight, ArrowLeft, Check, CheckCircle2, EyeOff, UserCheck, HelpCircle,
  Camera, UploadCloud, Info, Trash2
} from 'lucide-react'
import complaintsApi from '../services/complaints'
import { aiApi } from '../services/ai'
import MapPicker from '../components/MapPicker'
import AppShell from '../components/AppShell'

const CATEGORIES = [
  { id: 'Roads', name: 'Roads & Potholes', icon: '🛣️', desc: 'Potholes, broken asphalt, dangerous cracks' },
  { id: 'Sanitation', name: 'Garbage & Sanitation', icon: '🗑️', desc: 'Uncollected trash, illegal dumping, overflowing bins' },
  { id: 'Electricity', name: 'Streetlights & Power', icon: '💡', desc: 'Dark streetlights, damaged electric poles, hanging wires' },
  { id: 'Water', name: 'Water Supply', icon: '🚰', desc: 'Pipeline leaks, low pressure, water contamination' },
  { id: 'Drainage', name: 'Drainage & Sewage', icon: '🌊', desc: 'Clogged drains, open manholes, sewer overflow' },
  { id: 'Public Safety', name: 'Public Safety', icon: '🛡️', desc: 'Fallen trees, safety hazards, unauthorized encroachment' },
  { id: 'Parks', name: 'Parks & Greenery', icon: '🌳', desc: 'Unmaintained gardens, broken playground equipment' },
  { id: 'Other', name: 'Other Municipal Issue', icon: '📋', desc: 'General civic problems not listed above' }
]

const PRIORITIES = [
  { id: 'low', label: 'Low', desc: 'Minor issue, no immediate danger', color: 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300' },
  { id: 'medium', label: 'Medium', desc: 'Standard civic issue requiring prompt attention', color: 'border-blue-400 text-blue-700 dark:text-blue-400' },
  { id: 'high', label: 'High', desc: 'Disruptive issue affecting daily commute or safety', color: 'border-amber-400 text-amber-700 dark:text-amber-400' },
  { id: 'critical', label: 'Critical', desc: 'Severe hazard requiring emergency response', color: 'border-rose-500 text-rose-700 dark:text-rose-400' }
]

const STEPS = [
  { id: 1, label: 'Category' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Evidence' },
  { id: 4, label: 'Location' },
  { id: 5, label: 'Privacy' },
  { id: 6, label: 'Review' }
]

export default function ComplaintForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState(null)
  const [images, setImages] = useState([])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiAssisting, setAiAssisting] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [duplicateModal, setDuplicateModal] = useState(null)

  const fileInputRef = useRef(null)

  // Auto-fill from URL query param or restore draft if present
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) {
      const match = CATEGORIES.find(c => c.id.toLowerCase() === cat.toLowerCase() || c.name.toLowerCase().includes(cat.toLowerCase()))
      if (match) {
        setSelectedCategory(match.id)
      }
    }

    if (searchParams.get('restoreDraft') === 'true') {
      try {
        const saved = localStorage.getItem('cgn_offline_complaint_draft')
        if (saved) {
          const draft = JSON.parse(saved)
          if (draft.selectedCategory) setSelectedCategory(draft.selectedCategory)
          if (draft.title) setTitle(draft.title)
          if (draft.description) setDescription(draft.description)
          if (draft.priority) setPriority(draft.priority)
          if (draft.address) setAddress(draft.address)
          if (draft.location) setLocation(draft.location)
          if (draft.isAnonymous !== undefined) setIsAnonymous(draft.isAnonymous)
          if (draft.currentStep) setCurrentStep(draft.currentStep)
          toast.success('Draft restored successfully!')
        }
      } catch (e) {}
    }
  }, [searchParams])

  // Autosave draft to local storage
  useEffect(() => {
    if (title || description || selectedCategory || address) {
      const draft = {
        selectedCategory,
        title,
        description,
        priority,
        address,
        location,
        isAnonymous,
        currentStep,
        updatedAt: new Date().toISOString()
      }
      try {
        localStorage.setItem('cgn_offline_complaint_draft', JSON.stringify(draft))
      } catch (e) {}
    }
  }, [selectedCategory, title, description, priority, address, location, isAnonymous, currentStep])

  function handleFileSelection(files) {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 6 - images.length)
    if (valid.length === 0 && files.length > 0) {
      toast.error('Only image files (JPG, PNG, WebP) are allowed.')
      return
    }
    const withPreview = valid.map(file => Object.assign(file, {
      previewUrl: URL.createObjectURL(file)
    }))
    setImages(prev => [...prev, ...withPreview].slice(0, 6))
  }

  function removeImage(idx) {
    setImages(prev => {
      const target = prev[idx]
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function canProceed() {
    if (currentStep === 1) return Boolean(selectedCategory)
    if (currentStep === 2) return description.trim().length >= 10
    if (currentStep === 3) return true // Photos are optional but encouraged
    if (currentStep === 4) return Boolean(location && (location.lat || location.latitude))
    if (currentStep === 5) return true
    return true
  }

  function handleNext() {
    if (!canProceed()) {
      if (currentStep === 1) toast.error('Please select an issue category')
      else if (currentStep === 2) toast.error('Please provide at least 10 characters in the description')
      else if (currentStep === 4) toast.error('Please pick a location on the map')
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, 6))
  }

  function handlePrev() {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  async function handleSubmitComplaint(force = false) {
    if (!location) {
      toast.error('Location is required')
      setCurrentStep(4)
      return
    }

    // Check duplicate detection in nearby radius before submitting
    if (!force) {
      try {
        const lat = location.lat || location.latitude
        const lng = location.lng || location.longitude
        const nearby = await complaintsApi.nearby({ lat, lng, radius: 150 })
        const potentialDup = (nearby || []).find(
          c => c.category?.toLowerCase() === selectedCategory?.toLowerCase() &&
               !['resolved', 'rejected', 'closed'].includes(c.status)
        )
        if (potentialDup) {
          setDuplicateModal(potentialDup)
          return
        }
      } catch (e) {
        // Proceed on nearby check failure
      }
    }

    setSubmitting(true)
    try {
      const lat = location.lat || location.latitude
      const lng = location.lng || location.longitude

      const fd = new FormData()
      fd.append('title', title.trim() || `${selectedCategory} issue near ${address || 'locality'}`)
      fd.append('description', description.trim())
      fd.append('category', selectedCategory)
      fd.append('priority', priority)
      fd.append('severity', priority === 'critical' ? 'critical' : priority === 'high' ? 'major' : 'moderate')
      fd.append('address', address.trim())
      fd.append('location', JSON.stringify({ lat, lng }))
      fd.append('isAnonymous', isAnonymous ? 'true' : 'false')

      images.forEach(f => fd.append('images', f))

      const result = await complaintsApi.createComplaint(fd)
      const createdId = result?.id

      toast.success('Complaint submitted successfully!')
      if (createdId) {
        navigate(`/complaints/${createdId}`)
      } else {
        navigate('/complaints?view=mine')
      }
    } catch (err) {
      console.error('Submission failed:', err)
      toast.error(err.response?.data?.message || 'Failed to submit complaint. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell title="Report an Issue">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              Report a Civic Issue
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit your complaint directly to the municipal administration. AI assists in priority and department routing.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full self-start sm:self-auto">
            Step {currentStep} of 6: <span className="text-emerald-600 dark:text-emerald-400">{STEPS[currentStep - 1].label}</span>
          </div>
        </div>

        {/* Stepper Wizard Bar */}
        <div className="grid grid-cols-6 gap-2">
          {STEPS.map((s) => {
            const isDone = currentStep > s.id
            const isCurrent = currentStep === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (isDone || (s.id < currentStep)) setCurrentStep(s.id)
                }}
                disabled={s.id > currentStep}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-center transition-all ${
                  isCurrent
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                    : isDone
                      ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-200'
                      : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                  isCurrent
                    ? 'bg-emerald-600 text-white'
                    : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
                </span>
                <span className="hidden sm:inline text-[11px] font-semibold truncate max-w-full">{s.label}</span>
              </button>
            )
          })}
        </div>

        {/* Step Container Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#0B1628]">
          <AnimatePresence mode="wait">
            {/* STEP 1: CATEGORY SELECTION */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">What type of problem are you reporting?</h2>
                  <p className="text-xs text-slate-400 mt-1">Select the category that best describes the issue.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                            : 'border-slate-200/80 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#0E1B2E]'
                        }`}
                      >
                        <span className="text-3xl shrink-0 p-1">{cat.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                            {cat.name}
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{cat.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: DETAILS & AI ASSIST */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Describe the problem in detail</h2>
                  <p className="text-xs text-slate-400 mt-1">Clear descriptions help municipal workers locate and resolve issues faster.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Issue Title <span className="text-slate-400 font-normal">(Optional summary)</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Deep pothole causing traffic jam near Sector 17 roundabout"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Detailed Description <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (description.trim().length < 5) {
                            toast.error('Please type at least 5 characters first');
                            return;
                          }
                          setAiAssisting(true);
                          try {
                            const res = await aiApi.assistCitizen({
                              title,
                              description,
                              category: selectedCategory
                            });
                            setAiSuggestion(res);
                            toast.success('AI suggestions generated!');
                          } catch (err) {
                            toast.error('AI assistant temporarily offline');
                          } finally {
                            setAiAssisting(false);
                          }
                        }}
                        disabled={aiAssisting}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-300/40 transition-all cursor-pointer"
                      >
                        <Sparkles className={`h-3 w-3 ${aiAssisting ? 'animate-spin text-emerald-500' : 'text-emerald-600'}`} />
                        {aiAssisting ? 'Analyzing...' : '✨ Improve with AI'}
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide specific details: when did you notice it, how big is the area affected, any hazards..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                      <span>Minimum 10 characters</span>
                      <span>{description.length} characters</span>
                    </div>

                    {/* AI Suggestion Card */}
                    {aiSuggestion && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800/50 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            AI Drafting Assistant
                          </span>
                          <button
                            type="button"
                            onClick={() => setAiSuggestion(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {aiSuggestion.suggestedCategory && (
                          <div className="flex items-center justify-between text-[11px] bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl">
                            <span>Recommended Category: <strong className="capitalize text-emerald-800 dark:text-emerald-300">{aiSuggestion.suggestedCategory}</strong></span>
                            <button
                              type="button"
                              onClick={() => {
                                const match = CATEGORIES.find(c => c.id.toLowerCase() === aiSuggestion.suggestedCategory.toLowerCase());
                                if (match) setSelectedCategory(match.id);
                                toast.success(`Category updated to ${match?.name || aiSuggestion.suggestedCategory}`);
                              }}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 underline"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                        {aiSuggestion.suggestedTitle && (
                          <div className="flex items-center justify-between text-[11px] bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl">
                            <span className="truncate mr-2">Title: <strong>{aiSuggestion.suggestedTitle}</strong></span>
                            <button
                              type="button"
                              onClick={() => {
                                setTitle(aiSuggestion.suggestedTitle);
                                toast.success('Title applied');
                              }}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 underline shrink-0"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                        {aiSuggestion.advice && (
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 italic">
                            💡 Tip: {aiSuggestion.advice}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Priority Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Estimated Urgency / Priority
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {PRIORITIES.map((p) => {
                        const isSelected = priority === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPriority(p.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? `border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 font-bold`
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            <div className="text-xs font-black capitalize text-slate-900 dark:text-white flex items-center justify-between">
                              {p.label}
                              {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{p.desc}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PHOTO EVIDENCE */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Upload Photo Evidence</h2>
                  <p className="text-xs text-slate-400 mt-1">Add clear photos of the issue to speed up verification and officer action (up to 6 photos).</p>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    handleFileSelection(e.dataTransfer.files)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    dragOver
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) handleFileSelection(e.target.files)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-3 shadow-xs">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Click to browse or drag photos here
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WebP up to 10MB per image</p>
                </div>

                {/* Thumbnails Preview */}
                {images.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Selected Photos ({images.length}/6)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100">
                          <img
                            src={img.previewUrl || URL.createObjectURL(img)}
                            alt={`Evidence ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 4: PRECISE LOCATION */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Where is this issue located?</h2>
                  <p className="text-xs text-slate-400 mt-1">Use the interactive map or GPS to accurately pinpoint coordinates.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Landmark or Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Community Center, Main Road, Sector 34"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden dark:border-slate-700">
                  <MapPicker
                    value={location}
                    onChange={(loc) => {
                      setLocation(loc)
                      if (loc?.address && !address) setAddress(loc.address)
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 5: PRIVACY & ANONYMITY */}
            {currentStep === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Submission Privacy Preference</h2>
                  <p className="text-xs text-slate-400 mt-1">Choose how your identity appears on the civic platform.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(false)}
                    className={`flex items-start gap-3.5 p-5 rounded-2xl border text-left transition-all ${
                      !isAnonymous
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <UserCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Submit Under My Name
                        {!isAnonymous && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Your registered citizen profile is associated with the report. Allows direct communication with assigned officers.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAnonymous(true)}
                    className={`flex items-start gap-3.5 p-5 rounded-2xl border text-left transition-all ${
                      isAnonymous
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <EyeOff className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Submit Anonymously
                        {isAnonymous && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Hides your name and avatar from public views. You can still track and manage the report from your dashboard.
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: REVIEW & CONFIRM */}
            {currentStep === 6 && (
              <motion.div
                key="step-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Review Your Report</h2>
                  <p className="text-xs text-slate-400 mt-1">Please confirm the details before sending to the municipal system.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Category</span>
                      <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{selectedCategory}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Urgency</span>
                      <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 capitalize">{priority} Priority</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Location Address</span>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{address || 'Coordinates selected on map'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Privacy</span>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {isAnonymous ? 'Anonymous Submission' : 'Standard (Public with Name)'}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Description</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{description}</p>
                  </div>

                  {images.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Attached Photos ({images.length})</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {images.map((img, i) => (
                          <img
                            key={i}
                            src={img.previewUrl}
                            alt="Preview"
                            className="h-12 w-12 rounded-lg object-cover border border-slate-300 dark:border-slate-600"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1 || submitting}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                currentStep === 1
                  ? 'opacity-0 pointer-events-none'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next Step <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmitComplaint(false)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3 text-xs font-black text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Duplicate Notice Modal */}
        {duplicateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0B1628] border border-amber-200 dark:border-amber-800 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Similar Issue Already Reported</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                A nearby complaint with similar category has already been reported:
              </p>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white">#CGN-{String(duplicateModal.id).padStart(5, '0')}: {duplicateModal.title}</div>
                <div className="text-slate-400 mt-0.5">{duplicateModal.address}</div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateModal(null)
                    navigate(`/complaints/${duplicateModal.id}`)
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  View Existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateModal(null)
                    handleSubmitComplaint(true)
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Submit Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
