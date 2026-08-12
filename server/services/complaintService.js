const complaintRepo = require('../repositories/complaintRepository');
const ai = require('../config/gemini');
const groq = require('../config/groq');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

async function createComplaint(payload, files = []) {
  // payload: userId, departmentId, description, category, priority, severity, address, location
  const { description, title } = payload;
  // attempt AI analysis
  let analysis = null;
  try {
    const text = `${title || ''}\n${description || ''}`;
    const aiRes = await ai.analyzeComplaint(text);
    analysis = aiRes;
  } catch (err) {
    logger.error('AI analysis failed (Gemini)', { err: err.message });
    // Groq fallback (text classification/summarization) if configured.
    try {
      if (groq && typeof groq.isConfigured === 'function' && groq.isConfigured()) {
        const text = `${title || ''}\n${description || ''}`;
        analysis = await groq.analyzeComplaint(text);
        logger.info('AI analysis completed via Groq fallback');
      }
    } catch (groqErr) {
      logger.error('AI analysis failed (Groq fallback)', { err: groqErr.message });
    }
  }

  // Calculate SLA due date
  const priority = payload.priority || 'medium';
  let hours = 72;
  const prioLower = String(priority).toLowerCase();
  if (prioLower === 'critical')    hours = 24;
  else if (prioLower === 'high')   hours = 48;
  else if (prioLower === 'medium') hours = 72;
  else if (prioLower === 'low')    hours = 168; // 7 days
  const sla_due_at = new Date(Date.now() + hours * 60 * 60 * 1000);

  // create complaint record (store AI summary if available)
  const summary = analysis ? (analysis.summary || null) : null;
  const complaint = await complaintRepo.createComplaint({
    ...payload,
    summary,
    title: payload.title || (analysis && analysis.title),
    sla_due_at
  });

  // store AI analysis
  if (analysis) {
    try {
      const db = require('../config/db');
      // attempt to generate embedding if possible and attach to analysis
      if (typeof ai.getEmbedding === 'function') {
        try {
          const textForEmbedding = `${title || ''}\n${description || ''}`;
          const emb = await ai.getEmbedding(textForEmbedding);
          if (emb && Array.isArray(emb)) {
            analysis.embedding = emb;
          }
        } catch (e) {
          logger.warn('Embedding generation failed at creation time', { err: e });
        }
      }

      // try to insert embedding into vector column if DB supports it; otherwise store analysis JSON
      try {
        if (db._pool) {
          // prefer to store embedding into embedding column if present
          const hasEmbeddingCol = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='ai_analysis' AND column_name='embedding'");
          if (hasEmbeddingCol.rows.length && analysis.embedding && Array.isArray(analysis.embedding)) {
            const vectorStr = '[' + analysis.embedding.join(',') + ']';
            const q = `INSERT INTO ai_analysis(complaint_id,analysis,confidence,embedding,created_at) VALUES($1,$2,$3,$4::vector,now())`;
            await db.query(q, [complaint.id, analysis, analysis.confidence || null, vectorStr]);
          } else {
            const q = `INSERT INTO ai_analysis(complaint_id,analysis,confidence,created_at) VALUES($1,$2,$3,now())`;
            await db.query(q, [complaint.id, analysis, analysis.confidence || null]);
          }
        } else {
          // mock DB: insert as JSON only
          const q = `INSERT INTO ai_analysis(complaint_id,analysis,confidence,created_at) VALUES($1,$2,$3,now())`;
          await require('../config/db').query(q, [complaint.id, analysis, analysis.confidence || null]);
        }
      } catch (e) {
        logger.error('Failed to store AI analysis', { err: e });
      }
    } catch (e) {
      logger.error('Failed to store AI analysis', { err: e });
    }
  }

  // upload images to Cloudinary
  for (const file of files) {
    try {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const res = await cloudinary.uploader.upload(dataUri, { folder: 'complaints' });
      await complaintRepo.addComplaintImage(complaint.id, res.secure_url || res.url, res.public_id, { width: res.width, height: res.height });
    } catch (e) {
      logger.warn('Image upload failed', { err: e });
    }
  }

  // duplicate detection: try embeddings first, fallback to trigram
  try {
    const text = (payload.title || '') + ' ' + (payload.description || '');
    let duplicates = [];
    try {
      // generate or reuse embedding
      let embedding = null;
      try {
        embedding = await ai.getEmbedding(text);
      } catch (e) {
        logger.warn('Embedding generation failed for duplicate detection', { err: e });
      }

      const db = require('../config/db');
      if (embedding && db._pool) {
        // if pgvector exists, use vector NN search
        try {
          const ext = await db.query("SELECT 1 FROM pg_extension WHERE extname='vector'");
          if (ext.rows.length) {
            const vectorStr = '[' + embedding.join(',') + ']';
            const rows = await db.query('SELECT complaint_id, embedding <-> $1::vector AS distance FROM ai_analysis ORDER BY distance ASC LIMIT $2', [vectorStr, 10]);
            const cand = rows.rows.map(r => ({ id: r.complaint_id, score: 1 / (1 + parseFloat(r.distance)) }));
            duplicates = cand.filter(d => d.id && d.score > 0.75).slice(0, 5);
          }
        } catch (e) {
          logger.warn('pgvector similarity query failed', { err: e });
        }
      }

      // if no duplicates yet, try JSON-embedded vectors stored in analysis
      if (!duplicates.length && embedding) {
        try {
          const rows = await require('../config/db').query("SELECT complaint_id, analysis FROM ai_analysis WHERE analysis ? 'embedding'");
          const candidates = [];
          for (const rRow of rows.rows) {
            try {
              const analysisObj = rRow.analysis || rRow.analysis;
              const emb = analysisObj && analysisObj.embedding ? analysisObj.embedding : null;
              if (emb && Array.isArray(emb)) candidates.push({ complaint_id: rRow.complaint_id, embedding: emb });
            } catch (e) {}
          }
          const sim = (a, b) => {
            let dot = 0, na = 0, nb = 0;
            for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
            return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
          };
          const scored = [];
          for (const c of candidates) { const s = sim(embedding, c.embedding); scored.push({ id: c.complaint_id, score: s }); }
          scored.sort((a, b) => b.score - a.score);
          duplicates = scored.filter((s) => s.score > 0.75).slice(0, 5);
        } catch (e) {
          logger.warn('JSON embedding duplicate detection failed', { err: e });
        }
      }
    } catch (e) {
      logger.warn('Embeddings duplicate detection failed, falling back', { err: e });
    }

    if (!duplicates.length) {
      // trigram fallback
      const trig = await complaintRepo.findPotentialDuplicates(text);
      duplicates = trig.map((t) => ({ id: t.id, score: t.score }));
    }

    if (duplicates && duplicates.length) {
      const q = 'INSERT INTO duplicate_complaints(complaint_id,duplicate_of,score,created_at) VALUES($1,$2,$3,now())';
      for (const d of duplicates) {
        await require('../config/db').query(q, [complaint.id, d.id, d.score]);
      }
      complaint.duplicates = duplicates;
    }
  } catch (e) {
    logger.error('Duplicate detection failed', { err: e });
  }

  // Send email notification to citizen
  if (complaint.user_id) {
    try {
      const db = require('../config/db');
      const citizenRes = await db.query('SELECT * FROM users WHERE id=$1', [complaint.user_id]);
      const citizen = citizenRes.rows[0];
      if (citizen) {
        const emailService = require('./emailService');
        await emailService.sendComplaintSubmittedEmail(complaint, citizen);
      }
    } catch (emailErr) {
      logger.error('Failed to send complaint submitted email', { err: emailErr.message || emailErr });
    }
  }

  return complaint;
}

async function listComplaints(opts) {
  return complaintRepo.listComplaints(opts);
}

async function getComplaint(id) {
  const c = await complaintRepo.getById(id);
  if (!c) return null;
  // fetch images
  // enrich with images, timeline (with user info), and ai analysis
  const db = require('../config/db');
  const r = await db.query('SELECT id,url,public_id,metadata,created_at FROM complaint_images WHERE complaint_id=$1 ORDER BY created_at', [id]);
  c.images = r.rows;
  const timeline = await complaintRepo.getTimeline(id);
  c.timeline = timeline;
  const a = await db.query('SELECT id,analysis,confidence,created_at FROM ai_analysis WHERE complaint_id=$1 ORDER BY created_at', [id]);
  c.ai = a.rows;
  // department info
  if (c.department_id) {
    try {
      const d = await db.query('SELECT id,name FROM departments WHERE id=$1', [c.department_id]);
      c.department = d.rows[0] || null;
    } catch (e) {}
  }
  // owner info
  if (c.user_id) {
    try {
      const u = await db.query('SELECT id,name,email,avatar_url,role FROM users WHERE id=$1', [c.user_id]);
      c.owner = u.rows[0] || null;
    } catch (e) {}
  }
  return c;
}

async function updateComplaint(id, fields) {
  return complaintRepo.updateComplaint(id, fields);
}

async function deleteComplaint(id) {
  return complaintRepo.deleteComplaint(id);
}

module.exports = { createComplaint, listComplaints, getComplaint, updateComplaint, deleteComplaint };
