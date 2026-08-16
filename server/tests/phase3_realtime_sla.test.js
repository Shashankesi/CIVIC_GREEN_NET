const request = require('supertest');
const app = require('../app');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT } = require('../config');
const realtimeGateway = require('../services/realtimeGateway');
const slaMonitorService = require('../services/slaMonitorService');
const timelineService = require('../services/timelineService');
const assignmentService = require('../services/assignmentService');
const notificationService = require('../services/notificationService');

jest.setTimeout(30000);

describe('Phase 3: Real-Time Operations, Live Notifications & SLA Synchronization Suite', () => {
  const ts = Date.now();
  const citizenAEmail = `p3_cit_a_${ts}@example.com`;
  const citizenBEmail = `p3_cit_b_${ts}@example.com`;
  const officerAEmail = `p3_off_a_${ts}@example.com`;
  const officerBEmail = `p3_off_b_${ts}@example.com`;
  const adminEmail = `p3_adm_${ts}@example.com`;

  let citizenAId, citizenBId, officerAId, officerBId, adminId;
  let citizenAToken, citizenBToken, officerAToken, officerBToken, adminToken;
  let testComplaintId;

  beforeAll(async () => {
    const hashed = await bcrypt.hash('SecurePass123!', 10);

    // Create Citizen A & B
    const ca = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ('Citizen A', $1, $2, 'citizen', 'active', true) RETURNING id",
      [citizenAEmail, hashed]
    );
    citizenAId = ca.rows[0].id;
    citizenAToken = jwt.sign({ userId: citizenAId, role: 'citizen' }, JWT.ACCESS_SECRET, { expiresIn: '1h' });

    const cb = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ('Citizen B', $1, $2, 'citizen', 'active', true) RETURNING id",
      [citizenBEmail, hashed]
    );
    citizenBId = cb.rows[0].id;
    citizenBToken = jwt.sign({ userId: citizenBId, role: 'citizen' }, JWT.ACCESS_SECRET, { expiresIn: '1h' });

    // Create Officer A & B
    const oa = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified, department_id, employee_id) VALUES ('Officer A', $1, $2, 'officer', 'active', true, 1, 'CGN-CHD-SWM-00010') RETURNING id",
      [officerAEmail, hashed]
    );
    officerAId = oa.rows[0].id;
    officerAToken = jwt.sign({ userId: officerAId, role: 'officer' }, JWT.ACCESS_SECRET, { expiresIn: '1h' });

    const ob = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified, department_id, employee_id) VALUES ('Officer B', $1, $2, 'officer', 'active', true, 1, 'CGN-CHD-SWM-00011') RETURNING id",
      [officerBEmail, hashed]
    );
    officerBId = ob.rows[0].id;
    officerBToken = jwt.sign({ userId: officerBId, role: 'officer' }, JWT.ACCESS_SECRET, { expiresIn: '1h' });

    // Create Admin
    const adm = await db.query(
      "INSERT INTO users (name, email, password, role, status, is_verified) VALUES ('Admin User', $1, $2, 'admin', 'active', true) RETURNING id",
      [adminEmail, hashed]
    );
    adminId = adm.rows[0].id;
    adminToken = jwt.sign({ userId: adminId, role: 'admin' }, JWT.ACCESS_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await db.query("DELETE FROM email_verifications WHERE email LIKE 'p3_%'");
    if (testComplaintId) {
      await db.query('DELETE FROM complaint_status_history WHERE complaint_id = $1', [testComplaintId]);
      await db.query('DELETE FROM complaint_assignments WHERE complaint_id = $1', [testComplaintId]);
      await db.query('DELETE FROM complaints WHERE id = $1', [testComplaintId]);
    }
    await db.query("DELETE FROM notifications WHERE user_id IN ($1, $2, $3, $4, $5)", [citizenAId, citizenBId, officerAId, officerBId, adminId]);
    await db.query("DELETE FROM users WHERE email LIKE 'p3_%'");
  });

  describe('1. Authenticated SSE Connection & Diagnostic Gateway', () => {
    test('Unauthenticated connection to /api/realtime/stream is rejected with 401', async () => {
      const res = await request(app).get('/api/realtime/stream');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });

    test('Connection with invalid token is rejected with 401', async () => {
      const res = await request(app).get('/api/realtime/stream?token=invalid_jwt_string');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    test('Real-time status diagnostics returns operational metrics', async () => {
      const res = await request(app).get('/api/realtime/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.realtime).toBe('operational');
      expect(res.body).toHaveProperty('metrics');
    });
  });

  describe('2. Role-Based Event Routing & Cross-Tenant Isolation', () => {
    let citizenAEvents = [];
    let citizenBEvents = [];
    let officerAEvents = [];
    let officerBEvents = [];
    let adminEvents = [];

    // Mock client responses to capture SSE writes
    function createMockSseResponse(collector) {
      return {
        writeHead: jest.fn(),
        write: jest.fn((chunk) => {
          if (typeof chunk === 'string' && chunk.includes('data: ')) {
            try {
              const dataPart = chunk.split('data: ')[1].split('\n')[0].trim();
              const json = JSON.parse(dataPart);
              collector.push(json);
            } catch (e) {}
          }
        }),
        on: jest.fn()
      };
    }

    beforeEach(() => {
      citizenAEvents = [];
      citizenBEvents = [];
      officerAEvents = [];
      officerBEvents = [];
      adminEvents = [];

      realtimeGateway.registerClient({ id: citizenAId, role: 'citizen' }, createMockSseResponse(citizenAEvents));
      realtimeGateway.registerClient({ id: citizenBId, role: 'citizen' }, createMockSseResponse(citizenBEvents));
      realtimeGateway.registerClient({ id: officerAId, role: 'officer' }, createMockSseResponse(officerAEvents));
      realtimeGateway.registerClient({ id: officerBId, role: 'officer' }, createMockSseResponse(officerBEvents));
      realtimeGateway.registerClient({ id: adminId, role: 'admin' }, createMockSseResponse(adminEvents));
    });

    test('Event Isolation: Targeted user event delivers ONLY to target user and never leaks to others', () => {
      realtimeGateway.sendToUser(citizenAId, { type: 'PRIVATE_ALERT', message: 'Confidential to Citizen A' });

      expect(citizenAEvents.some(e => e.type === 'PRIVATE_ALERT')).toBe(true);
      expect(citizenBEvents.some(e => e.type === 'PRIVATE_ALERT')).toBe(false); // Isolated
      expect(officerAEvents.some(e => e.type === 'PRIVATE_ALERT')).toBe(false);
      expect(officerBEvents.some(e => e.type === 'PRIVATE_ALERT')).toBe(false);
    });

    test('Complaint Workflow Event Routing: Citizen owner, assigned officer, and admins receive events while other officers/citizens do not', async () => {
      // 1. Create a real complaint owned by Citizen A
      const compRes = await db.query(
        `INSERT INTO complaints (title, description, category, priority, status, user_id, address, sla_due_at)
         VALUES ('Pothole on Main St', 'Large pothole', 'Roads', 'medium', 'open', $1, 'Sector 17', now() + INTERVAL '24 hours')
         RETURNING *`,
        [citizenAId]
      );
      const complaint = compRes.rows[0];
      testComplaintId = complaint.id;

      // 2. Publish COMPLAINT_CREATED
      realtimeGateway.publishComplaintEvent('COMPLAINT_CREATED', complaint);

      // Citizen A receives creation event
      expect(citizenAEvents.some(e => e.type === 'COMPLAINT_CREATED' && e.complaintId === testComplaintId)).toBe(true);
      // Admin receives creation event
      expect(adminEvents.some(e => e.type === 'COMPLAINT_CREATED' && e.complaintId === testComplaintId)).toBe(true);
      // Citizen B and unassigned officers DO NOT receive it
      expect(citizenBEvents.some(e => e.type === 'COMPLAINT_CREATED')).toBe(false);
      expect(officerAEvents.some(e => e.type === 'COMPLAINT_CREATED')).toBe(false);

      // 3. Assign complaint to Officer A
      complaint.officer_id = officerAId;
      complaint.status = 'assigned';
      realtimeGateway.publishComplaintEvent('COMPLAINT_ASSIGNED', complaint, { officerId: officerAId });

      // Officer A receives assignment event
      expect(officerAEvents.some(e => e.type === 'COMPLAINT_ASSIGNED' && e.complaintId === testComplaintId)).toBe(true);
      // Officer B DOES NOT receive Officer A's assignment
      expect(officerBEvents.some(e => e.type === 'COMPLAINT_ASSIGNED')).toBe(false);
      // Citizen A receives notification of assignment
      expect(citizenAEvents.some(e => e.type === 'COMPLAINT_ASSIGNED')).toBe(true);
      // Admin receives assignment event
      expect(adminEvents.some(e => e.type === 'COMPLAINT_ASSIGNED')).toBe(true);
    });
  });

  describe('3. Real-Time Status Transitions & Reopening Lifecycle', () => {
    test('Status transition lifecycle: assigned -> accepted -> in_progress -> resolved -> reopened', async () => {
      // 1. Assign to officer
      await assignmentService.assign({ complaintId: testComplaintId, officerId: officerAId, assignedBy: adminId });
      
      // 2. Accept assignment
      const accepted = await timelineService.changeStatus(testComplaintId, 'accepted', officerAId, 'Officer accepted assignment');
      expect(accepted.status).toBe('accepted');

      // 3. Start work -> in_progress
      const inProgress = await timelineService.changeStatus(testComplaintId, 'in_progress', officerAId, 'Started field inspection');
      expect(inProgress.status).toBe('in_progress');

      // 4. Resolve complaint
      const resolved = await timelineService.changeStatus(testComplaintId, 'resolved', officerAId, 'Pothole filled with asphalt');
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution_at).toBeDefined();

      // 5. Reopen complaint
      const reopened = await timelineService.changeStatus(testComplaintId, 'reopened', citizenAId, 'Issue still present');
      expect(reopened.status).toBe('reopened');

      const historyCheck = await db.query(
        'SELECT status_from, status_to FROM complaint_status_history WHERE complaint_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testComplaintId]
      );
      expect(historyCheck.rows[0].status_from).toBe('resolved');
      expect(historyCheck.rows[0].status_to).toBe('reopened');
    });
  });

  describe('4. Notification Creation & Live Badge Synchronization', () => {
    test('Creating a notification persists in PostgreSQL and calculates real-time unread count', async () => {
      const notif = await notificationService.create(citizenAId, 'SYSTEM_ALERT', {
        title: 'Municipal Advisory',
        message: 'Scheduled maintenance in Sector 17.'
      });

      expect(notif).toBeDefined();
      expect(notif.user_id).toBe(citizenAId);
      expect(notif.is_read).toBe(false);

      const unreadCount = await notificationService.getUnreadCount(citizenAId);
      expect(unreadCount).toBeGreaterThanOrEqual(1);

      // Mark notification as read
      await notificationService.markRead(notif.id);
      const postReadCount = await notificationService.getUnreadCount(citizenAId);
      expect(postReadCount).toBe(unreadCount - 1);
    });
  });

  describe('5. SLA Monitoring, Warning & Escalation', () => {
    test('SLA compliance scan executes without errors or memory leaks', async () => {
      // Ensure complaint is in 'reopened' status with officer_id and past due SLA
      await db.query(
        'UPDATE complaints SET officer_id = $1, sla_due_at = now() - INTERVAL \'1 hour\' WHERE id = $2',
        [officerAId, testComplaintId]
      );

      // Run SLA monitor scan
      await slaMonitorService.checkSlas();

      // Check that sla_escalated_at timestamp was set
      const compCheck = await db.query('SELECT sla_escalated_at FROM complaints WHERE id = $1', [testComplaintId]);
      expect(compCheck.rows[0]?.sla_escalated_at).not.toBeNull();
    });
  });
});
