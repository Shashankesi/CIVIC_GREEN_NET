import React from 'react';
import AIChatPanelBase from './AIChatPanelBase';
import { aiApi } from '../../services/ai';

export default function GovernanceCopilot({
  isOpen = true,
  onClose,
  complaintId = null,
  fullPage = false
}) {
  const adminQuickActions = [
    { label: 'What needs attention today?', prompt: 'What needs attention today?' },
    { label: 'Department workload', prompt: 'Which departments have the highest active workload?' },
    { label: 'Ward unresolved cases', prompt: 'Which ward has the most unresolved complaints?' },
    { label: 'SLA breaches', prompt: 'Show SLA breaches' },
    { label: 'Civic health summary', prompt: 'Give me the current civic health summary' }
  ];

  return (
    <AIChatPanelBase
      persona="admin"
      title="Governance Copilot"
      subtitle="City operations & SLA intelligence"
      accentColor="indigo"
      complaintId={complaintId}
      isOpen={isOpen}
      onClose={onClose}
      fullPage={fullPage}
      customQuickActions={adminQuickActions}
      sendMessageFn={aiApi.sendAdminMessage}
    />
  );
}
