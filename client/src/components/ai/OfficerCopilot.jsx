import React from 'react';
import AIChatPanelBase from './AIChatPanelBase';
import { aiApi } from '../../services/ai';

export default function OfficerCopilot({
  isOpen = true,
  onClose,
  complaintId = null,
  fullPage = false
}) {
  const officerQuickActions = [
    { label: 'What should I handle first?', prompt: 'What should I handle first?' },
    { label: 'Cases near SLA breach', prompt: 'Which of my complaints are close to SLA breach?' },
    { label: 'My workload & performance', prompt: 'What is my current workload and resolution rate?' },
    { label: 'My officer rank', prompt: 'How many points do I have and what is my leaderboard rank?' }
  ];

  return (
    <AIChatPanelBase
      persona="officer"
      title="Officer Copilot"
      subtitle="Your assignments, SLA & field operations"
      accentColor="brand"
      complaintId={complaintId}
      isOpen={isOpen}
      onClose={onClose}
      fullPage={fullPage}
      customQuickActions={officerQuickActions}
      sendMessageFn={aiApi.sendOfficerMessage}
    />
  );
}
