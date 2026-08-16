import React, { useRef, useEffect } from 'react'

export default function OtpInput({ length = 6, value = '', onChange, disabled = false, hasError = false }) {
  const inputsRef = useRef([])

  // Ensure value array of length
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    // Auto-focus first input on mount
    if (inputsRef.current[0] && !disabled) {
      inputsRef.current[0].focus()
    }
  }, [disabled])

  const handleChange = (e, index) => {
    const rawVal = e.target.value
    const val = rawVal.replace(/\D/g, '')

    if (!val) {
      // Empty / cleared
      const newDigits = [...digits]
      newDigits[index] = ''
      onChange(newDigits.join(''))
      return
    }

    if (val.length === 1) {
      const newDigits = [...digits]
      newDigits[index] = val
      onChange(newDigits.join(''))
      // Advance to next input
      if (index < length - 1 && inputsRef.current[index + 1]) {
        inputsRef.current[index + 1].focus()
      }
    } else {
      // Multiple digits entered/pasted into single field
      handlePasteData(val, index)
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputsRef.current[index - 1]) {
        // Move back and delete previous
        e.preventDefault()
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        inputsRef.current[index - 1].focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePasteData = (pastedText, startIndex = 0) => {
    const cleaned = pastedText.replace(/\D/g, '').slice(0, length)
    if (!cleaned) return

    const newDigits = [...digits]
    for (let i = 0; i < cleaned.length; i++) {
      if (startIndex + i < length) {
        newDigits[startIndex + i] = cleaned[i]
      }
    }
    onChange(newDigits.join(''))

    // Focus last filled index or next available
    const nextIndex = Math.min(startIndex + cleaned.length, length - 1)
    if (inputsRef.current[nextIndex]) {
      inputsRef.current[nextIndex].focus()
    }
  }

  const handlePaste = (e, index) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    handlePasteData(pasted, index)
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="6-digit verification code">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          disabled={disabled}
          value={digits[i] || ''}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={e => handlePaste(e, i)}
          onFocus={e => e.target.select()}
          aria-label={`Digit ${i + 1}`}
          className={`h-12 w-11 sm:h-14 sm:w-13 text-center text-xl font-bold font-mono rounded-xl border transition-all duration-150 outline-none
            ${disabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-white dark:bg-surface-card text-slate-900 dark:text-white'}
            ${hasError 
              ? 'border-red-500 ring-2 ring-red-500/20 dark:border-red-500' 
              : digits[i]
                ? 'border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-400'
                : 'border-slate-300 dark:border-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
            }
          `}
        />
      ))}
    </div>
  )
}
