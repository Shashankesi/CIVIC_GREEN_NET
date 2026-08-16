const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const scheduledReportWorker = require('../services/analytics/scheduledReportWorker');
const reportService = require('../services/analytics/reportService');
const emailService = require('../services/emailService');

describe('Phase 6 Hardening — Scheduled Reports & Concurrency Worker Test Suite', () => {
  let adminToken = null;
  let citizenToken = null;
  let adminUserId = null;
  let citizenUserId = null;
  let createdScheduleId = null;

  beforeAll(async () => {
    // 1. Setup Admin user
    const adminEmail = `admin_sched_${Date.now()}@test.com`;
    const adminRes = await db.query(`
      INSERT INTO users (name, email, password, role, status, is_verified)
      VALUES ('Admin Sched Test', $1, '$2b$10$abcdefghijklmnopqrstuv', 'admin', 'active', true)
      RETURNING id;
    `, [adminEmail]);
    adminUserId = adminRes.rows[0].id;

    // 2. Setup Citizen user
    const citizenEmail = `citizen_sched_${Date.now()}@test.com`;
    const citizenRes = await db.query(`
      INSERT INTO users (name, email, password, role, status, is_verified)
      VALUES ('Citizen Sched Test', $1, '$2b$10$abcdefghijklmnopqrstuv', 'citizen', 'active', true)
      RETURNING id;
    `, [citizenEmail]);
    citizenUserId = citizenRes.rows[0].id;

    // Generate tokens
    const tokenService = require('../services/tokenService');
    adminToken = tokenService.generateAccessToken({ userId: adminUserId, role: 'admin' });
    citizenToken = tokenService.generateAccessToken({ userId: citizenUserId, role: 'citizen' });
  });

  afterAll(async () => {
    // Cleanup created test records
    try {
      if (adminUserId) {
        await db.query('DELETE FROM governance_report_history WHERE generated_by = $1', [adminUserId]);
        await db.query('DELETE FROM scheduled_reports WHERE created_by = $1', [adminUserId]);
        await db.query('DELETE FROM users WHERE id = $1', [adminUserId]);
      }
      if (citizenUserId) {
        await db.query('DELETE FROM users WHERE id = $1', [citizenUserId]);
      }
    } catch (e) {}
  });

  describe('1. Schedule Calculations & Timezones', () => {
    test('calculateNextRun calculates daily schedule at 09:00 IST', () => {
      const baseDate = new Date('2026-08-15T12:00:00Z');
      const nextRun = scheduledReportWorker.calculateNextRun('daily', baseDate, 'Asia/Kolkata');
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(baseDate.getTime());
      // In IST (UTC+5:30), 09:00 IST is 03:30 UTC
      expect(nextRun.getUTCHours()).toBe(3);
      expect(nextRun.getUTCMinutes()).toBe(30);
    });

    test('calculateNextRun calculates weekly schedule on next Monday', () => {
      const baseDate = new Date('2026-08-15T12:00:00Z'); // Saturday
      const nextRun = scheduledReportWorker.calculateNextRun('weekly', baseDate, 'Asia/Kolkata');
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(baseDate.getTime());
      // Should be Monday Aug 17, 2026
      expect(nextRun.getUTCDay()).toBe(1); // Monday
    });

    test('calculateNextRun calculates monthly schedule on 1st of next month', () => {
      const baseDate = new Date('2026-08-15T12:00:00Z');
      const nextRun = scheduledReportWorker.calculateNextRun('monthly', baseDate, 'Asia/Kolkata');
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(baseDate.getTime());
      // Target day is 1st
      expect(nextRun.getUTCDate()).toBe(1);
    });

    test('calculateNextRun works for UTC timezone', () => {
      const baseDate = new Date('2026-08-15T12:00:00Z');
      const nextRun = scheduledReportWorker.calculateNextRun('daily', baseDate, 'UTC');
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getUTCHours()).toBe(9);
      expect(nextRun.getUTCMinutes()).toBe(0);
    });
  });

  describe('2. Schedule Validation', () => {
    test('validates and accepts valid schedule payload', () => {
      const valid = scheduledReportWorker.validateScheduleData({
        title: 'Weekly Executive Brief',
        reportType: 'executive_summary',
        frequency: 'weekly',
        recipientEmail: 'commissioner@city.gov',
        timezone: 'Asia/Kolkata',
        format: 'csv'
      });
      expect(valid.isValid).toBe(true);
      expect(valid.errors.length).toBe(0);
    });

    test('rejects schedule with missing title, invalid email, invalid frequency, invalid report type', () => {
      const invalid = scheduledReportWorker.validateScheduleData({
        title: '',
        reportType: 'invalid_type',
        frequency: 'every_second',
        recipientEmail: 'not-an-email',
        timezone: 'Invalid/Zone',
        format: 'zip'
      });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('3. Admin Schedule Management API & RBAC', () => {
    test('POST /api/governance/reports/schedule allows admin to create schedule', async () => {
      const res = await request(app)
        .post('/api/governance/reports/schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Automated Municipal KPI Briefing',
          reportType: 'executive_summary',
          frequency: 'daily',
          timezone: 'Asia/Kolkata',
          format: 'csv',
          recipientEmail: 'governance-lead@civicgreennet.gov',
          filters: { timeframe: '30d' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Automated Municipal KPI Briefing');
      expect(res.body.data.next_run_at).toBeDefined();
      createdScheduleId = res.body.data.id;
    });

    test('POST /api/governance/reports/schedule rejects unauthenticated and citizen users (RBAC)', async () => {
      // Unauthenticated
      const unauthRes = await request(app)
        .post('/api/governance/reports/schedule')
        .send({ title: 'Hacked Schedule', reportType: 'sla', frequency: 'daily', recipientEmail: 'hack@test.com' });
      expect(unauthRes.status).toBe(401);

      // Citizen
      const citizenRes = await request(app)
        .post('/api/governance/reports/schedule')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ title: 'Citizen Schedule', reportType: 'sla', frequency: 'daily', recipientEmail: 'citizen@test.com' });
      expect(citizenRes.status).toBe(403);
    });

    test('GET /api/governance/reports/schedules lists configured schedules', async () => {
      const res = await request(app)
        .get('/api/governance/reports/schedules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find(s => s.id === createdScheduleId);
      expect(found).toBeDefined();
      expect(found.isActive).toBe(true);
    });

    test('PATCH /api/governance/reports/schedules/:id/pause pauses schedule', async () => {
      const res = await request(app)
        .patch(`/api/governance/reports/schedules/${createdScheduleId}/pause`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(false);
    });

    test('PATCH /api/governance/reports/schedules/:id/resume resumes schedule and updates next_run_at', async () => {
      const res = await request(app)
        .patch(`/api/governance/reports/schedules/${createdScheduleId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.is_active).toBe(true);
      expect(res.body.data.next_run_at).toBeDefined();
    });

    test('PUT /api/governance/reports/schedules/:id updates schedule details', async () => {
      const res = await request(app)
        .put(`/api/governance/reports/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Municipal KPI Briefing',
          frequency: 'weekly'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Municipal KPI Briefing');
      expect(res.body.data.frequency).toBe('weekly');
    });
  });

  describe('4. PostgreSQL Locking & Duplicate Execution Prevention', () => {
    test('acquireDueReports safely acquires due reports with SKIP LOCKED', async () => {
      // Set next_run_at to past to simulate due report
      await db.query('UPDATE scheduled_reports SET next_run_at = now() - INTERVAL \'1 hour\', is_active = true WHERE id = $1', [createdScheduleId]);

      const lockedReports = await scheduledReportWorker.acquireDueReports('test-worker-alpha', 5);
      expect(Array.isArray(lockedReports)).toBe(true);
      const target = lockedReports.find(r => r.id === createdScheduleId);
      expect(target).toBeDefined();
      expect(target.locked_by).toBe('test-worker-alpha');

      // Second concurrent attempt from worker-beta must SKIP LOCKED and return 0 for this item
      const concurrentReports = await scheduledReportWorker.acquireDueReports('test-worker-beta', 5);
      const duplicate = concurrentReports.find(r => r.id === createdScheduleId);
      expect(duplicate).toBeUndefined(); // Zero duplicate execution!
    });
  });

  describe('5. Report Execution, Email Delivery, & History Recording', () => {
    test('processScheduledReport successfully generates report, logs history, sends email, and advances next_run_at', async () => {
      const schedule = await reportService.getScheduleById(createdScheduleId);
      const execResult = await scheduledReportWorker.processScheduledReport(schedule, 'scheduled');

      expect(execResult.success).toBe(true);
      expect(execResult.scheduleId).toBe(createdScheduleId);
      expect(execResult.reportResult).toBeDefined();
      expect(execResult.reportResult.totalRows).toBeGreaterThanOrEqual(0);
      expect(execResult.durationMs).toBeGreaterThan(0);
      expect(execResult.nextRun).toBeInstanceOf(Date);

      // Verify database state
      const updatedSchedule = await reportService.getScheduleById(createdScheduleId);
      expect(updatedSchedule.last_run_status).toBe('completed');
      expect(updatedSchedule.run_count).toBeGreaterThanOrEqual(1);
      expect(updatedSchedule.locked_at).toBeNull();
      expect(updatedSchedule.locked_by).toBeNull();

      // Verify report history recorded
      const history = await reportService.getReportHistory(10);
      const historyEntry = history.find(h => h.scheduledReportId === createdScheduleId);
      expect(historyEntry).toBeDefined();
      expect(historyEntry.executionType).toBe('scheduled');
      expect(historyEntry.durationMs).toBeGreaterThan(0);
    });

    test('POST /api/governance/reports/schedules/:id/run-now triggers immediate execution', async () => {
      const res = await request(app)
        .post(`/api/governance/reports/schedules/${createdScheduleId}/run-now`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    }, 15000);

    test('Handles execution error gracefully without crashing worker', async () => {
      // Create a corrupted schedule to test error isolation
      const badSchedRes = await db.query(`
        INSERT INTO scheduled_reports (title, report_type, frequency, recipient_email, created_by, next_run_at, is_active)
        VALUES ('Failing Schedule Test', 'unknown_type_test', 'daily', 'bad@test.com', $1, now() - INTERVAL '1 hour', true)
        RETURNING *;
      `, [adminUserId]);
      const badSched = badSchedRes.rows[0];

      const result = await scheduledReportWorker.processScheduledReport(badSched, 'scheduled');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Ensure error was safely recorded in DB and lock was released
      const checkBad = await reportService.getScheduleById(badSched.id);
      expect(checkBad.last_run_status).toBe('failed');
      expect(checkBad.locked_at).toBeNull();

      // Cleanup bad schedule
      await db.query('DELETE FROM scheduled_reports WHERE id = $1', [badSched.id]);
    });
  });

  describe('6. Scheduler Health & Observability', () => {
    test('GET /api/governance/scheduler/health returns complete scheduler metrics', async () => {
      const res = await request(app)
        .get('/api/governance/scheduler/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBeDefined();
      expect(res.body.data.workerId).toBeDefined();
      expect(typeof res.body.data.activeSchedules).toBe('number');
      expect(typeof res.body.data.dueSchedules).toBe('number');
      expect(res.body.data.stats).toBeDefined();
    });

    test('GET /api/admin/system-health includes scheduler diagnostics', async () => {
      const res = await request(app)
        .get('/api/admin/system-health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.scheduler).toBeDefined();
      expect(res.body.data.database).toBe('operational');
    });
  });

  describe('7. Schedule Deletion', () => {
    test('DELETE /api/governance/reports/schedules/:id deletes schedule', async () => {
      const res = await request(app)
        .delete(`/api/governance/reports/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await reportService.getScheduleById(createdScheduleId);
      expect(check).toBeNull();
    });
  });
});
