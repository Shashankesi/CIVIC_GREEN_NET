import React, { useState } from 'react'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import MapView from '../components/MapView'
import FilterPanel from '../components/FilterPanel'

export default function OfficerMap() {
  const [filters, setFilters] = useState({})

  return (
    <AppShell title="Map Operations">
      <PageHeader
        title="Field Map Operations"
        subtitle="Geographic tracking of civic complaints, status distributions, and active field assignments."
      />

      <div className="mb-4">
        <FilterPanel filters={filters} setFilters={setFilters} />
      </div>

      <div className="card p-2 overflow-hidden shadow-md">
        <MapView
          height={600}
          filters={filters}
          showSidebar={false}
          showLegend={true}
          clustered={true}
        />
      </div>
    </AppShell>
  )
}
