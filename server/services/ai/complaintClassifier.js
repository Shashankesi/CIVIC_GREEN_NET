const { executeStructuredAI } = require('./aiProvider');
const logger = require('../../utils/logger');

const ALLOWED_CATEGORIES = [
  'sanitation',
  'roads',
  'utilities',
  'environment',
  'public_safety',
  'parks',
  'lighting',
  'drainage',
  'noise',
  'other'
];

const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent', 'critical'];
const ALLOWED_SEVERITIES = ['minor', 'moderate', 'major', 'critical'];

const CATEGORY_DEPARTMENT_MAPPING = {
  sanitation: 'Sanitation Department',
  roads: 'Roads Department',
  utilities: 'Water Department',
  drainage: 'Drainage Department',
  lighting: 'Electrical Department',
  public_safety: 'Public Safety Department',
  parks: 'Parks Department',
  environment: 'Sanitation Department',
  noise: 'Public Safety Department',
  other: 'General Municipal Operations'
};

const DETERMINISTIC_KEYWORDS = [
  { keywords: ['garbage', 'trash', 'waste', 'dump', 'dustbin', 'litter', 'filth', 'debris'], category: 'sanitation', priority: 'medium', severity: 'moderate' },
  { keywords: ['pothole', 'road', 'asphalt', 'pavement', 'tar', 'crack in road', 'speed breaker', 'divider'], category: 'roads', priority: 'high', severity: 'major' },
  { keywords: ['water pipe', 'pipe burst', 'leakage', 'drinking water', 'water supply', 'tap water', 'sewage leak'], category: 'utilities', priority: 'high', severity: 'major' },
  { keywords: ['drain', 'drainage', 'gutter', 'clogged drain', 'flooding', 'overflowing drain', 'waterlogging'], category: 'drainage', priority: 'high', severity: 'major' },
  { keywords: ['streetlight', 'street light', 'lamp', 'dark street', 'pole light', 'sparking', 'electric wire', 'live wire', 'power outage'], category: 'lighting', priority: 'high', severity: 'major' },
  { keywords: ['park', 'tree fallen', 'branch', 'grass', 'playground', 'garden'], category: 'parks', priority: 'low', severity: 'minor' },
  { keywords: ['danger', 'accident', 'fire', 'hazard', 'collapse', 'falling debris', 'crime', 'theft', 'unauthorized'], category: 'public_safety', priority: 'critical', severity: 'critical' }
];

/**
 * Deterministic fallback classifier when AI is offline or unavailable
 */
function deterministicClassify(text, citizenCategory = null) {
  const lower = (text || '').toLowerCase();
  let matched = null;

  for (const rule of DETERMINISTIC_KEYWORDS) {
    if (rule.keywords.some(k => lower.includes(k))) {
      matched = rule;
      break;
    }
  }

  const category = matched ? matched.category : (citizenCategory && ALLOWED_CATEGORIES.includes(citizenCategory.toLowerCase()) ? citizenCategory.toLowerCase() : 'other');
  const department = CATEGORY_DEPARTMENT_MAPPING[category] || 'General Municipal Operations';
  const priority = matched ? matched.priority : 'medium';
  const severity = matched ? matched.severity : 'moderate';

  // High danger terms check
  let finalPriority = priority;
  let finalSeverity = severity;
  if (/live wire|exposed wire|deep pothole|major fire|gas leak|wall collapse|sinkhole/i.test(lower)) {
    finalPriority = 'critical';
    finalSeverity = 'critical';
  }

  return {
    category,
    subcategory: category === 'roads' ? 'pothole_or_damage' : category === 'sanitation' ? 'garbage_accumulation' : 'general_issue',
    issue_type: category,
    priority: finalPriority,
    severity: finalSeverity,
    department,
    confidence: 0.72,
    confidenceLevel: 'moderate',
    reason: 'Deterministic keyword and department rule mapping applied (AI fallback mode).',
    keywords: matched ? matched.keywords.filter(k => lower.includes(k)) : [category],
    suggested_actions: ['Site inspection by municipal crew', 'Record field verification note'],
    isFallback: true,
    modelUsed: 'rule-based:deterministic'
  };
}

/**
 * Normalize and validate raw AI response against permitted enums
 */
function normalizeClassification(aiData, citizenCategory, rawText) {
  const safe = aiData || {};

  // 1. Validate Category
  let category = String(safe.category || '').toLowerCase().trim();
  if (!ALLOWED_CATEGORIES.includes(category)) {
    if (category.includes('road') || category.includes('street') || category.includes('pothole')) category = 'roads';
    else if (category.includes('garbage') || category.includes('waste') || category.includes('sanit')) category = 'sanitation';
    else if (category.includes('water') || category.includes('pipe') || category.includes('leak')) category = 'utilities';
    else if (category.includes('drain') || category.includes('flood') || category.includes('gutter')) category = 'drainage';
    else if (category.includes('light') || category.includes('electric') || category.includes('lamp')) category = 'lighting';
    else if (category.includes('safe') || category.includes('crime') || category.includes('hazard')) category = 'public_safety';
    else if (category.includes('park') || category.includes('tree') || category.includes('garden')) category = 'parks';
    else category = (citizenCategory && ALLOWED_CATEGORIES.includes(citizenCategory.toLowerCase())) ? citizenCategory.toLowerCase() : 'other';
  }

  // 2. Validate Priority
  let priority = String(safe.priority || 'medium').toLowerCase().trim();
  if (!ALLOWED_PRIORITIES.includes(priority)) {
    priority = 'medium';
  }

  // 3. Validate Severity
  let severity = String(safe.severity || 'moderate').toLowerCase().trim();
  if (!ALLOWED_SEVERITIES.includes(severity)) {
    severity = 'moderate';
  }

  // 4. Validate Department
  let department = safe.department || CATEGORY_DEPARTMENT_MAPPING[category] || 'General Municipal Operations';

  // 5. Validate Confidence
  let rawConfidence = typeof safe.confidence === 'number' ? safe.confidence : 0.80;
  if (rawConfidence > 1.0) rawConfidence = rawConfidence / 100;
  const confidence = Math.min(Math.max(parseFloat(rawConfidence.toFixed(2)), 0.1), 0.99);

  let confidenceLevel = 'high';
  let reviewNote = null;
  if (confidence >= 0.85) {
    confidenceLevel = 'high';
  } else if (confidence >= 0.65) {
    confidenceLevel = 'moderate';
  } else {
    confidenceLevel = 'low';
    reviewNote = 'Low confidence — manual review recommended.';
  }

  return {
    category,
    subcategory: safe.subcategory || safe.issue_type || category,
    issue_type: safe.issue_type || safe.subcategory || category,
    priority,
    severity,
    department,
    confidence,
    confidenceLevel,
    reviewNote,
    reason: safe.reason || `Classified as ${category} based on citizen report context.`,
    keywords: Array.isArray(safe.keywords) ? safe.keywords : (safe.tags || []),
    suggested_actions: Array.isArray(safe.suggested_actions) ? safe.suggested_actions : ['Inspect site and verify reported condition'],
    risk_assessment: safe.risk_assessment || null,
    isFallback: false
  };
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are the Civic GreenNet Intelligent Classifier.
Analyze the citizen complaint and classify it with precision.

You MUST respond with a valid JSON object containing EXACTLY:
{
  "category": "sanitation|roads|utilities|environment|public_safety|parks|lighting|drainage|noise|other",
  "subcategory": "specific subcategory name e.g. pothole, garbage_accumulation, water_pipe_burst, streetlight_broken",
  "issue_type": "concise issue label",
  "priority": "low|medium|high|critical",
  "severity": "minor|moderate|major|critical",
  "department": "Sanitation Department|Roads Department|Water Department|Electrical Department|Drainage Department|Parks Department|Public Safety Department",
  "confidence": 0.00 to 1.00 number,
  "reason": "Clear explanation of why this category and priority were selected",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "suggested_actions": ["action step 1", "action step 2"],
  "risk_assessment": "Brief assessment of public safety or municipal disruption risk"
}`;

/**
 * Classify a complaint with AI and fallback, synthesizing text description and visual evidence
 */
async function classifyComplaint({ title, description, citizenCategory = null, location = null, address = null, imageAnalysis = null }) {
  let combinedText = `Title: ${title || 'No title'}\nDescription: ${description || ''}\nSelected Category: ${citizenCategory || 'None'}\nAddress: ${address || 'None'}`;

  if (imageAnalysis && imageAnalysis.available) {
    combinedText += `\n\nSupporting Visual Evidence (from image analysis):\nSummary: ${imageAnalysis.summary || 'None'}\nObservations: ${(imageAnalysis.observations || []).join(', ') || 'None'}\nSafety Concerns: ${(imageAnalysis.safetyConcerns || []).join(', ') || 'None'}\nVisible Damage: ${imageAnalysis.visibleDamage || 'None'}\nVisual Category: ${imageAnalysis.category || 'None'}\nVisual Severity: ${imageAnalysis.severity || 'None'}`;
  }

  try {
    const aiResult = await executeStructuredAI({
      systemInstructions: CLASSIFICATION_SYSTEM_PROMPT,
      userInput: combinedText,
      cachePrefix: 'classify',
      timeoutMs: 6000
    });

    const normalized = normalizeClassification(aiResult.data, citizenCategory, combinedText);
    return {
      ...normalized,
      imageAnalysis: imageAnalysis || null,
      modelUsed: aiResult.modelUsed,
      isCached: aiResult.isCached
    };
  } catch (err) {
    logger.warn(`[Classifier] AI failed, utilizing deterministic classifier: ${err.message}`);
    const fallback = deterministicClassify(`${title} ${description}`, citizenCategory);
    return {
      ...fallback,
      imageAnalysis: imageAnalysis || null
    };
  }
}

module.exports = {
  classifyComplaint,
  deterministicClassify,
  normalizeClassification,
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
  ALLOWED_SEVERITIES,
  CATEGORY_DEPARTMENT_MAPPING
};
