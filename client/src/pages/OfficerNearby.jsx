import React from 'react'
import AppShell from '../components/AppShell'
import PageHeader from '../ui/PageHeader'
import MapView from '../components/MapView'

export default function OfficerNearby() {
  return (
    <AppShell title="Nearby Issues">
      <PageHeader
        title="Nearby Issues Operations"
        subtitle="Geospatial lookup of community issues reported around your current GPS coordinates."
      />

      <div className="card p-2 overflow-hidden shadow-md">
        <MapView
          height={650}
          showSidebar={true}
          initialRadius={5000}
          showLegend={true}
          clustered={true}
        />
      </div>
    </AppShell>
  )
}
