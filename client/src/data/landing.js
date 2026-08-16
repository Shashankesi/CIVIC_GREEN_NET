// Public presentation and informational data for the Civic GreenNet landing page.
// All metrics, counts, and live statistics are fetched directly from Neon PostgreSQL via public APIs.

export const faqs = [
  {
    q: 'What is Civic GreenNet?',
    a: 'Civic GreenNet is an intelligent civic governance and issue resolution operating system. It bridges the gap between citizens and municipal authorities by combining AI-assisted classification, high-precision geospatial mapping, transparent resolution workflows, and real-time accountability tracking.'
  },
  {
    q: 'How do I report a civic issue?',
    a: 'Click "Report an Issue" on the navigation or hero section. Provide a concise description, pick or verify the location using our interactive map pin, upload optional photos for evidence, and submit. The platform automatically assigns a tracking ID and begins AI routing.'
  },
  {
    q: 'Can I submit a report anonymously?',
    a: 'Yes. When submitting a report, toggle the "Submit Anonymously" option. Your personal identity, name, email, and contact details will remain completely concealed from public feeds and general users while still allowing municipal officers to process and fix the physical issue.'
  },
  {
    q: 'How does AI help classify complaints?',
    a: 'Civic GreenNet leverages Google Gemini AI models to analyze the report description and uploaded photos. It automatically predicts the civic category (such as Roads, Sanitation, Street Lighting, or Drainage), recommends priority level based on severity, and identifies potential duplicate filings.'
  },
  {
    q: 'Can I track my complaint?',
    a: 'Absolutely. Every complaint features an end-to-end transparent timeline. You can view the initial filing timestamp, AI analysis breakdown, assigned department and field officer, live status transitions, and resolution evidence uploaded by officers.'
  },
  {
    q: 'Who receives my complaint?',
    a: 'Complaints are routed directly to the designated municipal department (such as Public Works, Sanitation & Waste Management, or Street Lighting) and assigned to active field inspectors responsible for your specific zone and ward.'
  },
  {
    q: 'Can citizens verify a resolution?',
    a: 'Yes. When an officer marks an issue as "Resolved" and provides photo evidence, the citizen who reported it can review the work, verify satisfaction to close the ticket, or request a reopening if the issue was not adequately resolved.'
  },
  {
    q: 'How are my personal details protected?',
    a: 'Civic GreenNet enforces strict public-safe data policies. Public map markers, activity feeds, and dashboards only display public-safe metadata (such as area neighborhood and issue category). Phone numbers, emails, and exact residential addresses are never exposed.'
  },
  {
    q: 'How does Civic GreenNet help municipal teams?',
    a: 'Municipal administrators and field officers receive dedicated operational command centers with SLA breach alerts, intelligent ticket assignment, geospatial heatmaps, officer workload tracking, and automated performance analytics.'
  }
];

export const aiFeatureList = [
  {
    id: 'classification',
    title: 'AI Complaint Classification',
    tag: 'Automated Routing',
    desc: 'Understands citizen report intent using Google Gemini to categorize into Sanitation, Roads, Utilities, Lighting, and more with confidence scoring.',
    badge: 'Live Assisted'
  },
  {
    id: 'priority',
    title: 'Smart Priority Detection',
    tag: 'Urgency Assessment',
    desc: 'Evaluates public safety risks, water contamination, or traffic blockages to prioritize urgent tickets for expedited municipal action.',
    badge: 'Real-Time'
  },
  {
    id: 'routing',
    title: 'Department Routing',
    tag: 'Dispatch Optimization',
    desc: 'Directs reports to the exact municipal department and responsible ward officers, eliminating manual routing delays.',
    badge: 'Automated'
  },
  {
    id: 'duplicates',
    title: 'Duplicate Detection',
    tag: 'Vector & Similarity',
    desc: 'Identifies previously reported civic issues in the same radius and links them to avoid redundant field team dispatches.',
    badge: 'Intelligent'
  },
  {
    id: 'geospatial',
    title: 'Location Intelligence',
    tag: 'PostGIS & Vector',
    desc: 'High-precision geospatial coordinates mapped with Leaflet and PostGIS for clustering, radius queries, and cluster heatmaps.',
    badge: 'Geospatial'
  },
  {
    id: 'insights',
    title: 'Resolution Insights',
    tag: 'Transparent SLA',
    desc: 'Audited timelines track status transitions from initial citizen report to photo-verified resolution and citizen closure.',
    badge: 'Audited'
  }
];

export const workflowSteps = [
  {
    step: '01',
    title: 'Report',
    badge: 'Citizen Input',
    desc: 'Citizen reports infrastructure or public safety issue with photos, description, and GPS coordinates.'
  },
  {
    step: '02',
    title: 'AI Analysis',
    badge: 'Gemini Engine',
    desc: 'AI parses intent, classifies category, assesses severity, and performs duplicate detection.'
  },
  {
    step: '03',
    title: 'Assignment',
    badge: 'Smart Dispatch',
    desc: 'Complaint is routed to the responsible municipal department and assigned to a field officer.'
  },
  {
    step: '04',
    title: 'Field Action',
    badge: 'Operations',
    desc: 'Assigned officer accepts work, visits the site, updates status, and adds operational progress notes.'
  },
  {
    step: '05',
    title: 'Resolution',
    badge: 'Evidence Proof',
    desc: 'Officer marks the issue resolved and uploads photographic proof of completed work.'
  },
  {
    step: '06',
    title: 'Citizen Verification',
    badge: 'Final Closure',
    desc: 'Reporting citizen reviews the resolution proof to verify satisfaction or request reopening.'
  }
];
