import React, { useEffect, useState } from 'react'
import notificationsApi from '../services/notifications'
import Skeleton from '../components/Skeleton'
import toast from 'react-hot-toast'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load(page) }, [page])

  async function load(p=1) {
    setLoading(true);
    try {
      const r = await notificationsApi.list(p);
      setItems(p===1 ? r.items : items.concat(r.items));
    } catch (e) { console.error(e) }
    setLoading(false);
  }

  async function markRead(id, idx) {
    const old = items.slice();
    try {
      // optimistic
      if (items[idx]) items[idx].is_read = true;
      setItems(items.slice());
      await notificationsApi.markRead(id);
      toast.success('Marked');
    } catch (e) {
      setItems(old);
      toast.error('Failed');
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
      {loading && <Skeleton className="h-40" />}
      {!loading && items.length===0 && <div className="text-gray-500">No notifications</div>}
      <ul className="space-y-2">
        {items.map(n => (
          <li key={n.id} className={`p-3 bg-white rounded shadow ${n.is_read ? 'opacity-70':''}`}>
            <div className="flex justify-between">
              <div>{n.type}</div>
              <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">{JSON.stringify(n.payload)}</div>
          </li>
        ))}
      </ul>
      <div className="mt-4 text-center">
        <button onClick={()=>setPage(page+1)} className="px-4 py-2 bg-slate-100 rounded">Load more</button>
      </div>
    </div>
  )
}
