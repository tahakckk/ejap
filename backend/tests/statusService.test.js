const sqlite3 = require('sqlite3').verbose();
const db = require('../src/models/database');
const { getAllStatuses } = require('../src/services/statusService');

beforeEach(async () => {
  const testDb = new sqlite3.Database(':memory:');
  db.setDb(testDb);
  await db.createSchema();
  await db.seedStatuses();
});

afterEach(() => db.resetDb());

describe('getAllStatuses', () => {
  test('returns 5 statuses after seed', async () => {
    const statuses = await getAllStatuses();
    expect(statuses).toHaveLength(5);
  });

  test('contains all expected status names', async () => {
    const statuses = await getAllStatuses();
    const names = statuses.map(s => s.name);
    expect(names).toContain('Pending');
    expect(names).toContain('HR Interview');
    expect(names).toContain('Technical Interview');
    expect(names).toContain('Offer');
    expect(names).toContain('Rejected');
  });

  test('each status has id and name fields', async () => {
    const statuses = await getAllStatuses();
    statuses.forEach(s => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('name');
    });
  });

  test('statuses are ordered by id ascending', async () => {
    const statuses = await getAllStatuses();
    for (let i = 1; i < statuses.length; i++) {
      expect(statuses[i].id).toBeGreaterThan(statuses[i - 1].id);
    }
  });
});
