import React from 'react';
import AppShell from '../components/AppShell';
import PageHeader from '../ui/PageHeader';
import OfficerCopilot from '../components/ai/OfficerCopilot';

export default function OfficerAI() {
  return (
    <AppShell title="Officer AI Copilot">
      <PageHeader
        title="Officer Copilot"
        subtitle="Consult your dedicated officer AI assistant powered by real-time database tools, SLA monitoring, and resolution drafting."
      />

      <div className="mt-4">
        <OfficerCopilot
          isOpen={true}
          fullPage={true}
        />
      </div>
    </AppShell>
  );
}
