import React, { useEffect, useState } from 'react'
import notificationsApi from '../services/notifications'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)

  async function fetch() {
    try {
      const r = await notificationsApi.list(1);
      setItems(r.items || r);
      setUnread((r.items || r).filter(i=>!i.is_read).length || 0)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, [])

  return (
    <div className="relative">
      <button onClick={()=>setOpen(!open)} className="relative">
        🔔
        {unread>0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow p-2 z-50">
          <div className="font-semibold mb-2">Notifications</div>
          {items.length===0 && <div className="text-sm text-gray-500">No notifications</div>}
          <ul>
            {items.slice(0,6).map(n => (
              <li key={n.id} className={`py-2 border-b ${n.is_read ? 'text-gray-500' : ''}`}>
                <Link to={`/complaints/${n.payload?.complaintId || ''}`} onClick={async ()=>{ setOpen(false); if(!n.is_read){ n.is_read=true; setUnread((items||[]).filter(i=>!i.is_read).length); try{ await notificationsApi.markRead(n.id); toast.success('Marked read'); }catch(e){ toast.error('Failed'); } } }}>
                  <div className="text-sm">{n.type}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="text-center mt-2"><Link to="/notifications" onClick={()=>setOpen(false)} className="text-sm text-blue-600">View all</Link></div>
        </div>
      )}
    </div>
  )
}
