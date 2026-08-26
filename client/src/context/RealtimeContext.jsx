import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import AuthContext from './AuthContext'
import { API_BASE, getTokens } from '../services/api'
import { toast } from 'react-hot-toast'

const RealtimeContext = createContext({
  status: 'offline', // 'connected' | 'connecting' | 'reconnecting' | 'offline'
  unreadCount: 0,
  setUnreadCount: () => {},
  lastEvent: null,
  subscribe: () => () => {}
})

export function RealtimeProvider({ children }) {
  const { user } = useContext(AuthContext)
  const [status, setStatus] = useState('offline')
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastEvent, setLastEvent] = useState(null)
  const listenersRef = useRef(new Map())
  const eventSourceRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)

  // Subscribes a listener to specific event types (e.g. 'COMPLAINT_STATUS_CHANGED')
  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set())
    }
    listenersRef.current.get(eventType).add(callback)

    return () => {
      const set = listenersRef.current.get(eventType)
      if (set) {
        set.delete(callback)
        if (set.size === 0) listenersRef.current.delete(eventType)
      }
    }
  }, [])

  // Dispatches received event to registered listeners
  const dispatchEvent = useCallback((event) => {
    setLastEvent(event)

    // Handle global notification counters
    if (typeof event.unreadCount === 'number') {
      setUnreadCount(event.unreadCount)
    }

    // Interactive Toast Alerts
    if (event.type === 'NOTIFICATION_CREATED' && event.notification?.payload) {
      const { title, message } = event.notification.payload
      toast(title || 'New Notification', {
        icon: '🔔',
        style: {
          borderRadius: '10px',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: '13px'
        }
      })
    } else if (event.type === 'COMPLAINT_ASSIGNED' && user?.role === 'officer') {
      toast.success(`New Case Assigned: ${event.ticketId || 'CGN Case'}`, { duration: 5000 })
    } else if (event.type === 'SLA_BREACH') {
      toast.error(`⚠️ SLA Breached: ${event.ticketId || 'Ticket'}`, { duration: 6000 })
    } else if (event.type === 'COMPLAINT_RESOLVED') {
      toast.success(`Complaint ${event.ticketId || ''} marked Resolved!`, { icon: '✅' })
    } else if (event.type === 'POINTS_AWARDED') {
      toast.success(`+${event.points} Civic Points! ${event.reason || ''}`, {
        icon: '⭐',
        duration: 4500,
        style: { borderRadius: '10px', background: '#064e3b', color: '#ecfdf5', fontSize: '13px' }
      })
    } else if (event.type === 'POINTS_DEDUCTED') {
      toast.error(`${event.points} Civic Points: ${event.reason || 'Point adjustment'}`, {
        icon: '⚠️',
        duration: 5000
      })
    }

    // Call specific event listeners
    const specificListeners = listenersRef.current.get(event.type)
    if (specificListeners) {
      for (const cb of specificListeners) {
        try { cb(event) } catch (e) { console.error('Realtime listener error:', e) }
      }
    }

    // Call wildcard listeners
    const wildcardListeners = listenersRef.current.get('*')
    if (wildcardListeners) {
      for (const cb of wildcardListeners) {
        try { cb(event) } catch (e) { console.error('Realtime wildcard listener error:', e) }
      }
    }
  }, [user?.role])

  // Connection manager
  const connect = useCallback(() => {
    if (!user) {
      setStatus('offline')
      return
    }

    const tokens = getTokens()
    const token = tokens?.accessToken
    if (!token) {
      setStatus('offline')
      return
    }

    // Close any previous stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting')

    const streamUrl = `${API_BASE}/realtime/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(streamUrl)
    eventSourceRef.current = es

    es.onopen = () => {
      setStatus('connected')
      reconnectAttemptsRef.current = 0
    }

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'CONNECTED') {
          setStatus('connected')
        }
        dispatchEvent(data)
      } catch (err) {
        // Ping or non-JSON comments ignored
      }
    }

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus('offline')
      } else {
        setStatus('reconnecting')
      }
      es.close()
      eventSourceRef.current = null

      // Stop reconnecting after too many failures
      const MAX_RECONNECT_ATTEMPTS = 15
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setStatus('offline')
        return
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
      const delay = Math.min(30000, Math.pow(2, reconnectAttemptsRef.current) * 1000)
      reconnectAttemptsRef.current++
      reconnectTimeoutRef.current = setTimeout(() => {
        if (user) connect()
      }, delay)
    }
  }, [user, dispatchEvent])

  useEffect(() => {
    if (user?.id) {
      connect()
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setStatus('offline')
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [user?.id, connect])

  return (
    <RealtimeContext.Provider
      value={{
        status,
        unreadCount,
        setUnreadCount,
        lastEvent,
        subscribe
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

export default RealtimeContext
