import React, { useState, useContext } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AIChatButton from './ai/AIChatButton'
import AuthContext from '../context/AuthContext'

export default function AppShell({ children, title }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useContext(AuthContext)

  const persona = user?.role || 'citizen'
  const isOfficer = user?.role === 'officer'

  return (
    <div className={`flex h-screen overflow-hidden ${isOfficer ? 'bg-gradient-to-br from-slate-50 via-emerald-50/30 to-cyan-50/10 dark:from-surface-darker dark:via-surface-darker dark:to-surface-darker' : 'bg-slate-50 dark:bg-surface-darker'}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
      <AIChatButton persona={persona} />
    </div>
  )
}
