const repo = require('../repositories/complaintRepository');

describe('Complaint repository test', () => {
  test('create, get, list complaints', async () => {
    const c = await repo.createComplaint({ userId: null, title: 'Test', description: 'desc', category: 'sanitation', priority: 'low', location: { lat: 1, lng: 2 } });
    expect(c).toBeDefined();
    expect(c.id).toBeDefined();
    const fetched = await repo.getById(c.id);
    expect(fetched).toBeDefined();
    const list = await repo.listComplaints({ limit: 10, offset: 0, filters: {} });
    expect(Array.isArray(list)).toBe(true);

    // Clean up created test complaint
    const db = require('../config/db');
    await db.query('DELETE FROM complaints WHERE id=$1', [c.id]);
  });
});
