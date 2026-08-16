import React from 'react';
import AppShell from '../components/AppShell';
import PageHeader from '../ui/PageHeader';
import AIChatPanel from '../components/ai/AIChatPanel';

export default function OfficerAI() {
  return (
    <AppShell title="Officer AI Copilot">
      <PageHeader
        title="Officer Copilot"
        subtitle="Consult your dedicated officer AI assistant powered by real-time database tools, SLA monitoring, and resolution drafting."
      />

      <div className="mt-4">
        <AIChatPanel
          persona="officer"
          title="Officer Operations Copilot"
          subtitle="Real-time Groq Multi-Tool Intelligence"
          accentColor="brand"
          isOpen={true}
          fullPage={true}
        />
      </div>
    </AppShell>
  );
}
