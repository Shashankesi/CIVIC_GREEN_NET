const db = require('../../config/db');
const { executeStructuredAI } = require('./aiProvider');
const logger = require('../../utils/logger');

const SUMMARY_PROMPT = `You are the Civic GreenNet Executive Case Summarizer.
Analyze this civic complaint record and provide a high-level operational summary for municipal leadership and dispatch.

Return a valid JSON object:
{
  "issue": "Concise 1-sentence issue description",
  "severity": "minor|moderate|major|critical",
  "affectedArea": "Location or public zone affected",
  "recommendedDepartment": "Responsible department name",
  "risk": "Assessment of health, safety, or logistical risks",
  "recommendedAction": "Actionable instruction for field dispatch",
  "priorityJustification": "Reasoning for assigned priority level"
}`;

/**
 * Generate or retrieve AI Case Summary for a complaint
 */
async function generateCaseSummary(complaintId) {
  if (!db._pool) return null;

  const rawId = typeof complaintId === 'number' ? complaintId : parseInt(String(complaintId).replace(/[^0-9]/g, ''), 10);
  if (isNaN(rawId)) return null;

  // 1. Fetch complaint, timeline, and duplicate links
  const compRes = await db.query(
    `SELECT c.*, d.name AS department_name, u.name AS citizen_name 
     FROM complaints c
     LEFT JOIN departments d ON d.id = c.department_id
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.id = $1`,
    [rawId]
  );
  const complaint = compRes.rows[0];
  if (!complaint) return null;

  const dupRes = await db.query(
    `SELECT COUNT(*)::int AS dup_count FROM duplicate_complaints WHERE complaint_id = $1 OR duplicate_of = $1`,
    [rawId]
  );
  const dupCount = dupRes.rows[0]?.dup_count || 0;

  // Check if existing analysis already has a generated summary
  const aiRes = await db.query('SELECT * FROM ai_analysis WHERE complaint_id = $1 ORDER BY id DESC LIMIT 1', [rawId]);
  const existingAnalysis = aiRes.rows[0];

  let structuredSummary = null;
  try {
    const input = `Title: ${complaint.title}
Description: ${complaint.description}
Category: ${complaint.category}
Priority: ${complaint.priority}
Severity: ${complaint.severity}
Address: ${complaint.address || 'Not specified'}
Status: ${complaint.status}
Department: ${complaint.department_name || 'Unassigned'}
Duplicate Reports: ${dupCount}`;

    const aiOutput = await executeStructuredAI({
      systemInstructions: SUMMARY_PROMPT,
      userInput: input,
      cachePrefix: `summary_${rawId}`,
      timeoutMs: 6000
    });
    structuredSummary = aiOutput.data;
  } catch (err) {
    logger.warn('[Summarizer] AI summary generation fallback:', { err: err.message });
    structuredSummary = {
      issue: complaint.title || 'Civic infrastructure report',
      severity: complaint.severity || 'moderate',
      affectedArea: complaint.address || 'Public area',
      recommendedDepartment: complaint.department_name || 'Municipal Operations',
      risk: complaint.priority === 'critical' ? 'Urgent public safety hazard' : 'Standard municipal maintenance concern',
      recommendedAction: 'Inspect site, photograph current state, and perform required maintenance.',
      priorityJustification: `Assigned priority level: ${complaint.priority || 'medium'}`
    };
  }

  return {
    complaintId: `CGN-${String(rawId).padStart(5, '0')}`,
    rawId,
    title: complaint.title,
    category: complaint.category,
    status: complaint.status,
    priority: complaint.priority,
    severity: structuredSummary.severity || complaint.severity,
    issue: structuredSummary.issue || complaint.title,
    affectedArea: structuredSummary.affectedArea || complaint.address || 'Municipal Zone',
    recommendedDepartment: structuredSummary.recommendedDepartment || complaint.department_name,
    risk: structuredSummary.risk,
    recommendedAction: structuredSummary.recommendedAction,
    potentialDuplicates: dupCount,
    confidence: existingAnalysis?.confidence ? parseFloat(existingAnalysis.confidence) : 0.88,
    createdAt: complaint.created_at
  };
}

/**
 * Generate Officer Field Checklist and Resolution Guidance
 */
async function generateOfficerChecklist(complaintId) {
  const summary = await generateCaseSummary(complaintId);
  if (!summary) return null;

  const category = (summary.category || 'general').toLowerCase();

  const standardChecklist = [
    { id: 'step_1', task: 'Inspect reported location and verify physical condition', completed: false, required: true },
    { id: 'step_2', task: 'Capture pre-work photographic evidence', completed: false, required: true },
    { id: 'step_3', task: 'Identify safety hazards and cordon off area if needed', completed: false, required: false },
    { id: 'step_4', task: 'Execute municipal repair / clearing operations', completed: false, required: true },
    { id: 'step_5', task: 'Capture post-resolution photograph from same angle', completed: false, required: true },
    { id: 'step_6', task: 'Upload resolution evidence and record citizen completion note', completed: false, required: true }
  ];

  // Specific additions based on category
  if (category === 'sanitation') {
    standardChecklist.splice(3, 0, { id: 'step_san_1', task: 'Ensure waste is segregated (wet/dry/hazardous) before transport', completed: false, required: true });
  } else if (category === 'lighting' || category === 'utilities') {
    standardChecklist.splice(2, 0, { id: 'step_util_1', task: 'Isolate power line / shut down main valve before mechanical repair', completed: false, required: true });
  } else if (category === 'roads') {
    standardChecklist.splice(2, 0, { id: 'step_rd_1', task: 'Place high-visibility traffic cones 15 meters ahead of work zone', completed: false, required: true });
  }

  const safetyGuidelines = {
    roads: 'Wear high-visibility reflective vests and maintain safe traffic flow distance.',
    sanitation: 'Wear heavy-duty puncture-resistant gloves and protective face masks.',
    lighting: 'Verify zero voltage using a calibrated tester before contacting open conductors.',
    utilities: 'Ensure trench shoring when excavating deeper than 1 meter.',
    public_safety: 'Coordinate with local law enforcement or emergency dispatch if hazard persists.'
  };

  return {
    complaintId: summary.complaintId,
    rawId: summary.rawId,
    title: summary.title,
    category: summary.category,
    priority: summary.priority,
    safetyConsideration: safetyGuidelines[category] || 'Wear standard municipal PPE and exercise operational care.',
    summary: summary.issue,
    recommendedAction: summary.recommendedAction,
    checklist: standardChecklist
  };
}

module.exports = {
  generateCaseSummary,
  generateOfficerChecklist
};
