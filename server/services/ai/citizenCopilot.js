const { classifyComplaint } = require('./complaintClassifier');
const { executeStructuredAI } = require('./aiProvider');
const logger = require('../../utils/logger');

const CITIZEN_ASSIST_PROMPT = `You are the Civic GreenNet Citizen Drafting Assistant.
Help the citizen refine their complaint for fastest municipal response.

Return a valid JSON object:
{
  "suggestedCategory": "sanitation|roads|utilities|environment|public_safety|parks|lighting|drainage|noise|other",
  "suggestedTitle": "Crisp 5-8 word title",
  "refinedDescription": "Clear, objective description with helpful detail prompts",
  "recommendedEvidence": ["Photo of issue", "Nearest landmark or street sign", "Time of day"],
  "advice": "Friendly tip for faster resolution"
}`;

/**
 * Assist Citizen in categorizing and refining complaint before submission
 */
async function assistCitizenDraft({ title, description, citizenCategory = null }) {
  const text = `${title || ''}\n${description || ''}`.trim();
  if (!text) {
    return {
      suggestedCategory: 'sanitation',
      suggestedTitle: '',
      refinedDescription: '',
      recommendedEvidence: ['Take a clear photo showing the issue and surrounding landmark'],
      advice: 'Provide a clear description and specific address or landmark to help field officers locate the issue quickly.'
    };
  }

  // 1. Get fast AI classification
  const classification = await classifyComplaint({ title, description, citizenCategory });

  // 2. Enhance description and advise citizen
  try {
    const aiRes = await executeStructuredAI({
      systemInstructions: CITIZEN_ASSIST_PROMPT,
      userInput: text,
      cachePrefix: 'cit_assist',
      timeoutMs: 4000
    });

    return {
      suggestedCategory: aiRes.data?.suggestedCategory || classification.category,
      suggestedTitle: aiRes.data?.suggestedTitle || title,
      refinedDescription: aiRes.data?.refinedDescription || description,
      recommendedEvidence: aiRes.data?.recommendedEvidence || ['Clear photograph of the defect', 'Nearby landmark'],
      advice: aiRes.data?.advice || 'Including specific landmarks helps our municipal crew resolve complaints 40% faster.',
      confidence: classification.confidence
    };
  } catch (err) {
    logger.warn('[Citizen Copilot] AI assist fallback:', { err: err.message });
    return {
      suggestedCategory: classification.category,
      suggestedTitle: title || `${classification.category.toUpperCase()} Issue Report`,
      refinedDescription: description,
      recommendedEvidence: ['Clear photograph', 'Nearest cross street / landmark'],
      advice: 'Please ensure location is marked accurately on the map.',
      confidence: classification.confidence
    };
  }
}

module.exports = {
  assistCitizenDraft
};
