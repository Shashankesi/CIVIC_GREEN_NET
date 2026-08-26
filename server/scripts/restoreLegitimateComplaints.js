require('dotenv').config();
const db = require('../config/db');

async function restore() {
  if (!db._pool) {
    console.error('Database pool not initialized.');
    process.exit(1);
  }

  const client = await db._pool.connect();
  try {
    await client.query('BEGIN');

    const complaintsToRestore = [
      {
        id: 12,
        user_id: 4,
        department_id: 1,
        officer_id: 181,
        title: 'Illegal garbage dumping behind market',
        summary: 'Commercial garbage dumping accumulating near Sector market.',
        description: 'Large piles of solid waste and commercial dumping accumulating behind the market area causing severe foul smell and sanitary hazards.',
        category: 'sanitation',
        priority: 'high',
        severity: 'high',
        status: 'closed',
        is_anonymous: false,
        address: 'Sector 22 Market, Chandigarh',
        lng: 76.7725,
        lat: 30.7302,
        created_at: '2026-08-09T07:49:26.772Z'
      },
      {
        id: 73,
        user_id: 4,
        department_id: 2,
        officer_id: 181,
        title: 'Pothole on main corridor',
        summary: 'Deep pothole causing road traffic obstruction.',
        description: 'Large hazardous pothole on the main transit corridor creating vehicular risk and congestion.',
        category: 'roads',
        priority: 'high',
        severity: 'high',
        status: 'closed',
        is_anonymous: false,
        address: 'Sector 17, Chandigarh',
        lng: 76.7800,
        lat: 30.7350,
        created_at: '2026-08-13T05:18:47.046Z'
      },
      {
        id: 617,
        user_id: 4,
        department_id: 4,
        officer_id: null,
        title: 'Severe Water Pollution',
        summary: 'Contaminated water supply reported in local residential pipeline.',
        description: 'Residential water pipeline discharge contains discoloration and strong chemical odor. Immediate municipal pipeline inspection requested.',
        category: 'water',
        priority: 'medium',
        severity: 'medium',
        status: 'open',
        is_anonymous: false,
        address: 'Sector 15, Chandigarh',
        lng: 76.7750,
        lat: 30.7300,
        created_at: '2026-08-26T12:47:37.696Z'
      },
      {
        id: 619,
        user_id: 4,
        department_id: 2,
        officer_id: null,
        title: 'Pothole on 5th Main',
        summary: 'Multiple craters and asphalt erosion along 5th Main road.',
        description: 'Road surface has severely deteriorated after recent monsoon rains creating large craters and vehicle damage risk.',
        category: 'roads',
        priority: 'high',
        severity: 'high',
        status: 'in_progress',
        is_anonymous: false,
        address: '5th Main Road, Sector 17, Chandigarh',
        lng: 76.7780,
        lat: 30.7320,
        created_at: '2026-08-24T12:59:53.859Z'
      },
      {
        id: 620,
        user_id: 4,
        department_id: 3,
        officer_id: null,
        title: 'Streetlight broken',
        summary: 'Street lamp unlit for consecutive days creating dark spot.',
        description: 'Lamp post electrical fixture damaged and dark street section poses safety hazard for pedestrians at night.',
        category: 'lighting',
        priority: 'medium',
        severity: 'medium',
        status: 'open',
        is_anonymous: false,
        address: '7th Cross, Sector 19, Chandigarh',
        lng: 76.7820,
        lat: 30.7380,
        created_at: '2026-08-25T12:59:53.974Z'
      },
      {
        id: 621,
        user_id: 4,
        department_id: 2,
        officer_id: null,
        title: 'Hazardous deep pothole near Sector 17 main market',
        summary: 'Deep road cavity causing severe traffic bottleneck near main shopping complex.',
        description: 'Deep road cavity on the main approach to Sector 17 commercial market causing traffic bottleneck and accident hazard.',
        category: 'roads',
        priority: 'high',
        severity: 'high',
        status: 'open',
        is_anonymous: false,
        address: 'Sector 17, Chandigarh',
        lng: 76.7794,
        lat: 30.7333,
        created_at: '2026-08-26T13:12:02.612Z'
      }
    ];

    for (const c of complaintsToRestore) {
      await client.query(`
        INSERT INTO complaints (id, user_id, department_id, officer_id, title, summary, description, category, priority, severity, status, is_anonymous, address, location, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, ST_SetSRID(ST_MakePoint($14, $15), 4326), $16)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          address = EXCLUDED.address,
          location = EXCLUDED.location;
      `, [
        c.id, c.user_id, c.department_id, c.officer_id, c.title, c.summary, c.description,
        c.category, c.priority, c.severity, c.status, c.is_anonymous, c.address,
        c.lng, c.lat, c.created_at
      ]);
    }

    // Update sequence to be safely higher than max ID
    await client.query(`SELECT setval('complaints_id_seq', (SELECT GREATEST(MAX(id), 650) FROM complaints))`);

    await client.query('COMMIT');
    console.log(`✅ Restored ${complaintsToRestore.length} legitimate complaints successfully!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to restore complaints:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

restore();
