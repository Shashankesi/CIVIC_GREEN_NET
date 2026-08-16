const complaintRepo = require('../repositories/complaintRepository');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');
const { classifyComplaint } = require('./ai/complaintClassifier');
const { detectDuplicates } = require('./ai/duplicateDetector');
const { recommendRouting } = require('./ai/routingEngine');
const realtimeGateway = require('./realtimeGateway');

async function createComplaint(payload, files = []) {
  // payload: userId, departmentId, description, category, priority, severity, address, location
  const { description, title, category: citizenCategory, address, location } = payload;

  // 1. Calculate SLA due date based on citizen priority
  const priority = payload.priority || 'medium';
  let hours = 72;
  const prioLower = String(priority).toLowerCase();
  if (prioLower === 'critical')    hours = 24;
  else if (prioLower === 'high')   hours = 48;
  else if (prioLower === 'medium') hours = 72;
  else if (prioLower === 'low')    hours = 168; // 7 days
  const sla_due_at = new Date(Date.now() + hours * 60 * 60 * 1000);

  // 2. Perform AI Classification
  let classification = null;
  try {
    realtimeGateway.publishAiEvent('AI_ANALYSIS_STARTED', { 
      message: 'AI intelligence analyzing civic complaint...',
      userId: payload.userId 
    }, 'admin', payload.userId);

    classification = await classifyComplaint({
      title,
      description,
      citizenCategory,
      address,
      location
    });
  } catch (aiErr) {
    logger.warn('[Complaint Service] AI classification failed, using fallback:', { err: aiErr.message });
  }

  // 3. Create complaint record in PostgreSQL
  const summary = classification ? (classification.reason || classification.subcategory) : null;
  const complaint = await complaintRepo.createComplaint({
    ...payload,
    summary,
    title: payload.title || (classification && classification.subcategory) || 'Civic Issue',
    sla_due_at
  });

  // 4. Perform Duplicate Detection & Smart Routing Recommendation
  let duplicateResult = { isPotentialDuplicate: false, possibleDuplicates: [] };
  let routingRecommendation = null;

  try {
    const lat = location?.lat || (typeof location === 'object' && location?.latitude);
    const lng = location?.lng || (typeof location === 'object' && location?.longitude);

    duplicateResult = await detectDuplicates({
      complaintId: complaint.id,
      title: complaint.title,
      description: complaint.description,
      category: classification?.category || complaint.category,
      lat,
      lng,
      address: complaint.address
    });

    if (duplicateResult.isPotentialDuplicate) {
      complaint.duplicates = duplicateResult.possibleDuplicates;
      realtimeGateway.publishAiEvent('DUPLICATE_DETECTED', {
        complaintId: complaint.id,
        ticketId: `CGN-${String(complaint.id).padStart(5, '0')}`,
        duplicateCount: duplicateResult.possibleDuplicates.length,
        topSimilarity: duplicateResult.similarity,
        possibleDuplicates: duplicateResult.possibleDuplicates
      }, 'admin');
    }

    routingRecommendation = await recommendRouting({
      category: classification?.category || complaint.category,
      priority: classification?.priority || complaint.priority,
      severity: classification?.severity || complaint.severity,
      address: complaint.address
    });

    if (routingRecommendation?.recommendedOfficer) {
      realtimeGateway.publishAiEvent('AI_ROUTING_RECOMMENDATION_READY', {
        complaintId: complaint.id,
        ticketId: `CGN-${String(complaint.id).padStart(5, '0')}`,
        recommendation: routingRecommendation
      }, 'admin');
    }
  } catch (dupErr) {
    logger.warn('[Complaint Service] Duplicate/Routing analysis warning:', { err: dupErr.message });
  }

  // 5. Store AI analysis & audit logs in PostgreSQL
  if (classification) {
    try {
      const db = require('../config/db');
      if (db._pool) {
        await db.query(
          `INSERT INTO ai_analysis (
             complaint_id, analysis, confidence, category, subcategory, priority, severity,
             department_recommendation, department_id_recommendation, reason, keywords,
             suggested_actions, risk_assessment, duplicate_candidates, model_used, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())`,
          [
            complaint.id,
            classification,
            classification.confidence || 0.80,
            classification.category,
            classification.subcategory,
            classification.priority,
            classification.severity,
            routingRecommendation?.recommendedDepartment || classification.department,
            routingRecommendation?.departmentId || null,
            classification.reason,
            classification.keywords || [],
            classification.suggested_actions || [],
            classification.risk_assessment || null,
            JSON.stringify(duplicateResult.possibleDuplicates || []),
            classification.modelUsed || 'hybrid:ai'
          ]
        );

        // Record AI audit log
        await db.query(
          `INSERT INTO ai_audit_logs (complaint_id, event_type, model_used, recommendation, confidence, user_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
          [
            complaint.id,
            'AI_CLASSIFICATION_CREATED',
            classification.modelUsed || 'hybrid:ai',
            { classification, routing: routingRecommendation },
            classification.confidence || 0.80,
            payload.userId || null,
            { isFallback: classification.isFallback || false }
          ]
        );
      }

      realtimeGateway.publishAiEvent('AI_ANALYSIS_COMPLETED', {
        complaintId: complaint.id,
        ticketId: `CGN-${String(complaint.id).padStart(5, '0')}`,
        classification,
        routing: routingRecommendation,
        isDuplicate: duplicateResult.isPotentialDuplicate
      }, 'admin', payload.userId);
    } catch (e) {
      logger.error('Failed to store AI analysis / audit log', { err: e.message });
    }
  }

  // 6. Upload images to Cloudinary
  for (const file of files) {
    try {
      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const res = await cloudinary.uploader.upload(dataUri, { folder: 'complaints' });
      await complaintRepo.addComplaintImage(complaint.id, res.secure_url || res.url, res.public_id, { width: res.width, height: res.height });
    } catch (e) {
      logger.warn('Image upload failed', { err: e });
    }
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

  // Create database notification for admins
  try {
    const db = require('../config/db');
    const { rows: admins } = await db.query("SELECT id FROM users WHERE role='admin'");
    const notificationService = require('./notificationService');
    for (const admin of admins) {
      await notificationService.create(admin.id, 'COMPLAINT', {
        title: 'New Complaint Submitted',
        message: `Complaint #CGN-${String(complaint.id).padStart(5, '0')} requires attention.`,
        subtitle: `${complaint.title} reported in ${complaint.address || 'Chandigarh'}`,
        complaintId: complaint.id
      });
    }
  } catch (err) {
    logger.warn('Failed to create admin notifications for new complaint', { err: err.message });
  }

  // Real-time event dispatch
  try {
    const realtimeGateway = require('./realtimeGateway');
    realtimeGateway.publishComplaintEvent('COMPLAINT_CREATED', complaint);
  } catch (rtErr) {
    logger.warn('Failed to publish real-time COMPLAINT_CREATED event', { err: rtErr.message });
  }

  return complaint;
}

async function enrichComplaintsWithImages(complaints) {
  if (!complaints || !complaints.length) return complaints;
  const ids = complaints.map(c => c.id);
  const db = require('../config/db');
  try {
    const r = await db.query('SELECT id, complaint_id, url, public_id, metadata, created_at FROM complaint_images WHERE complaint_id = ANY($1) ORDER BY created_at', [ids]);
    const imagesByComplaintId = {};
    r.rows.forEach(img => {
      if (!imagesByComplaintId[img.complaint_id]) {
        imagesByComplaintId[img.complaint_id] = [];
      }
      imagesByComplaintId[img.complaint_id].push(img);
    });
    complaints.forEach(c => {
      c.images = imagesByComplaintId[c.id] || [];
    });
  } catch (e) {
    logger.warn('Failed to enrich complaints with images', { err: e.message || e });
    complaints.forEach(c => {
      c.images = [];
    });
  }
  return complaints;
}

async function listComplaints(opts) {
  const rows = await complaintRepo.listComplaints(opts);
  return enrichComplaintsWithImages(rows);
}

async function searchComplaints(opts) {
  const rows = await complaintRepo.searchComplaints(opts);
  return enrichComplaintsWithImages(rows);
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

module.exports = { createComplaint, listComplaints, searchComplaints, getComplaint, updateComplaint, deleteComplaint, enrichComplaintsWithImages };
