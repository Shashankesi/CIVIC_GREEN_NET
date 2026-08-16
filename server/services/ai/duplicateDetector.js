const db = require('../../config/db');
const { executeStructuredAI } = require('./aiProvider');
const logger = require('../../utils/logger');

/**
 * Compute Jaccard token similarity as a fast in-memory similarity metric
 */
function computeTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const set1 = new Set(text1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const set2 = new Set(text2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  if (set1.size === 0 || set2.size === 0) return 0;
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Step 1 & 2: Staged Candidate Retrieval from PostgreSQL
 */
async function findDuplicateCandidates({ complaintId, title, description, category, lat, lng, address }) {
  if (!db._pool) return [];

  const textToMatch = `${title || ''} ${description || ''}`.trim();
  const candidates = [];

  try {
    // 1. Spatial + Category query if coordinates are available
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      const spatialQuery = `
        SELECT 
          c.id, c.title, c.description, c.category, c.status, c.priority, c.address, c.created_at,
          ST_Distance(c.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters,
          similarity(c.title || ' ' || COALESCE(c.description, ''), $3) AS trigram_score
        FROM complaints c
        WHERE ($4::int IS NULL OR c.id != $4)
          AND (c.category = $5 OR $5 IS NULL)
          AND c.created_at >= now() - INTERVAL '60 days'
          AND c.location IS NOT NULL
          AND ST_DWithin(c.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 1000)
        ORDER BY distance_meters ASC
        LIMIT 10;
      `;
      const res = await db.query(spatialQuery, [lng, lat, textToMatch, complaintId || null, category || null]);
      candidates.push(...res.rows);
    } else {
      // 2. Text trigram and address matching query
      const textQuery = `
        SELECT 
          c.id, c.title, c.description, c.category, c.status, c.priority, c.address, c.created_at,
          0 AS distance_meters,
          similarity(c.title || ' ' || COALESCE(c.description, ''), $1) AS trigram_score
        FROM complaints c
        WHERE ($2::int IS NULL OR c.id != $2)
          AND (c.category = $3 OR $3 IS NULL)
          AND c.created_at >= now() - INTERVAL '60 days'
        ORDER BY trigram_score DESC
        LIMIT 10;
      `;
      const res = await db.query(textQuery, [textToMatch, complaintId || null, category || null]);
      candidates.push(...res.rows);
    }
  } catch (err) {
    logger.warn('[Duplicate Detector] PostgreSQL candidate query warning:', { err: err.message });
    // Safe fallback query if PostGIS spatial or trigram functions aren't installed on mock
    const fallbackRes = await db.query(
      `SELECT id, title, description, category, status, priority, address, created_at
       FROM complaints 
       WHERE ($1::int IS NULL OR id != $1) AND (category = $2 OR $2 IS NULL)
       ORDER BY created_at DESC LIMIT 10`,
      [complaintId || null, category || null]
    );
    candidates.push(...fallbackRes.rows.map(r => ({ ...r, distance_meters: 0, trigram_score: 0 })));
  }

  // Deduplicate candidate rows by ID and score them
  const uniqueCandidates = new Map();
  for (const c of candidates) {
    if (!uniqueCandidates.has(c.id)) {
      const textSim = computeTextSimilarity(textToMatch, `${c.title} ${c.description}`);
      const trigramSim = parseFloat(c.trigram_score || 0);
      const combinedScore = Math.max(textSim, trigramSim);
      uniqueCandidates.set(c.id, {
        ...c,
        calculatedScore: combinedScore,
        distanceMeters: Math.round(c.distance_meters || 0)
      });
    }
  }

  return Array.from(uniqueCandidates.values())
    .filter(c => c.calculatedScore >= 0.25 || (c.distanceMeters > 0 && c.distanceMeters <= 200))
    .sort((a, b) => b.calculatedScore - a.calculatedScore)
    .slice(0, 5);
}

const DUPLICATE_VERIFY_PROMPT = `You are the Civic GreenNet Duplicate Complaint Analyst.
Compare the TARGET COMPLAINT with each CANDIDATE COMPLAINT.
Determine whether any candidate represents the SAME exact physical civic incident or location defect reported twice.

Return a valid JSON object:
{
  "isPotentialDuplicate": true|false,
  "topSimilarity": 0.00 to 1.00,
  "matches": [
    {
      "candidateId": number,
      "isDuplicate": true|false,
      "similarity": 0.00 to 1.00,
      "reason": "Concise explanation of why this is or is not a duplicate"
    }
  ]
}`;

/**
 * Detect duplicates with staged query + LLM verification
 */
async function detectDuplicates({ complaintId, title, description, category, lat, lng, address }) {
  const candidates = await findDuplicateCandidates({ complaintId, title, description, category, lat, lng, address });

  if (candidates.length === 0) {
    return {
      isPotentialDuplicate: false,
      similarity: 0,
      possibleDuplicates: []
    };
  }

  // Check if any candidate has high text/distance similarity
  const topCandidate = candidates[0];
  let verification = null;

  try {
    const promptInput = `TARGET COMPLAINT:
Title: ${title}
Description: ${description}
Category: ${category}
Address: ${address || 'Not provided'}

CANDIDATES:
${candidates.map(c => `[ID: ${c.id}] Title: ${c.title} | Desc: ${c.description} | Addr: ${c.address} | Dist: ${c.distanceMeters}m`).join('\n')}`;

    const aiRes = await executeStructuredAI({
      systemInstructions: DUPLICATE_VERIFY_PROMPT,
      userInput: promptInput,
      cachePrefix: 'dup_verify',
      timeoutMs: 6000
    });

    verification = aiRes.data;
  } catch (err) {
    logger.warn('[Duplicate Detector] AI verification skipped, using deterministic score:', { err: err.message });
    // Rule-based fallback
    verification = {
      isPotentialDuplicate: topCandidate.calculatedScore >= 0.55 || (topCandidate.distanceMeters <= 100 && topCandidate.calculatedScore >= 0.35),
      topSimilarity: topCandidate.calculatedScore,
      matches: candidates.map(c => ({
        candidateId: c.id,
        isDuplicate: c.calculatedScore >= 0.55,
        similarity: parseFloat(c.calculatedScore.toFixed(2)),
        reason: `Matched based on geographic proximity (${c.distanceMeters}m) and text similarity (${Math.round(c.calculatedScore * 100)}%).`
      }))
    };
  }

  const possibleDuplicates = [];
  const matchMap = new Map((verification?.matches || []).map(m => [m.candidateId, m]));

  for (const c of candidates) {
    const match = matchMap.get(c.id);
    const score = match ? match.similarity : c.calculatedScore;
    const isDup = match ? match.isDuplicate : score >= 0.55;

    if (isDup || score >= 0.50) {
      possibleDuplicates.push({
        id: `CGN-${String(c.id).padStart(5, '0')}`,
        rawId: c.id,
        title: c.title,
        status: c.status,
        category: c.category,
        priority: c.priority,
        address: c.address,
        similarity: parseFloat(score.toFixed(2)),
        distanceMeters: c.distanceMeters,
        reason: match?.reason || `Nearby complaint with ${Math.round(score * 100)}% matching keywords.`,
        created_at: c.created_at
      });
    }
  }

  const result = {
    isPotentialDuplicate: possibleDuplicates.length > 0,
    similarity: possibleDuplicates.length > 0 ? Math.max(...possibleDuplicates.map(d => d.similarity)) : 0,
    possibleDuplicates
  };

  // Persist into duplicate_complaints table if complaintId is provided
  if (complaintId && possibleDuplicates.length > 0 && db._pool) {
    for (const dup of possibleDuplicates) {
      try {
        await db.query(
          `INSERT INTO duplicate_complaints (complaint_id, duplicate_of, score, created_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (complaint_id, duplicate_of) 
           DO UPDATE SET score = EXCLUDED.score`,
          [complaintId, dup.rawId, dup.similarity]
        );
      } catch (e) {
        // ignore unique constraint
      }
    }
  }

  return result;
}

module.exports = {
  detectDuplicates,
  findDuplicateCandidates,
  computeTextSimilarity
};
