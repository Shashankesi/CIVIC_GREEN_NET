import React from 'react';
import AIChatPanelBase from './AIChatPanelBase';
import { sendOfficerMessage } from '../../services/ai';
import { ShieldAlert, BarChart2, Briefcase, Award, Flame, Sparkles } from 'lucide-react';

const OFFICER_QUICK_ACTIONS = [
  {
    label: 'Priority Issues',
    prompt: 'Show my highest-priority active complaints and explain which I should handle first.',
    icon: Flame
  },
  {
    label: '🚨 SLA Alerts',
    prompt: 'Which of my complaints are close to SLA breach or overdue?',
    icon: ShieldAlert
  },
  {
    label: 'Department Workload',
    prompt: 'What is the current workload and overdue status of my department?',
    icon: BarChart2
  },
  {
    label: 'My Workload',
    prompt: 'Give me a summary of my current assigned workload.',
    icon: Briefcase
  },
  {
    label: 'My Performance',
    prompt: 'Show my current officer performance, resolution rate, and SLA compliance.',
    icon: Award
  },
  {
    label: "Today's Focus",
    prompt: 'What should I focus on today?',
    icon: Sparkles
  }
];

export default function OfficerCopilot({
  isOpen = true,
  onClose,
  complaintId = null,
  fullPage = false
}) {
  return (
    <AIChatPanelBase
      persona="officer"
      title="Officer Copilot"
      subtitle="Your assignments, SLA & field operations"
      accentColor="cyan"
      complaintId={complaintId}
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={fullPage}
      customQuickActions={OFFICER_QUICK_ACTIONS}
      sendMessageFn={sendOfficerMessage}
    />
  );
}
