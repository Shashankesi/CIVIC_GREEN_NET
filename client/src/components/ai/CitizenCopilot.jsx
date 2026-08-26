import React from 'react';
import AIChatPanelBase from './AIChatPanelBase';
import { aiApi } from '../../services/ai';

export default function CitizenCopilot({
  isOpen = true,
  onClose,
  complaintId = null,
  fullPage = false
}) {
  const citizenQuickActions = [
    { label: 'My active complaints', prompt: 'Show my unresolved complaints' },
    { label: 'My civic points & rank', prompt: 'How many points do I have and what is my civic rank?' },
    { label: 'How to earn points', prompt: 'How can I earn more points?' },
    { label: 'Road reporting guide', prompt: 'How do I report a road issue?' }
  ];

  return (
    <AIChatPanelBase
      persona="citizen"
      title="Civic Assistant"
      subtitle="Your complaints, civic services & community impact"
      accentColor="emerald"
      complaintId={complaintId}
      isOpen={isOpen}
      onClose={onClose}
      fullPage={fullPage}
      customQuickActions={citizenQuickActions}
      sendMessageFn={aiApi.sendCitizenMessage}
    />
  );
}
