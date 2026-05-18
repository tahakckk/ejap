const sqlite3 = require('sqlite3').verbose();
const db = require('../src/models/database');
const {
  validateApplicationData,
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
} = require('../src/services/applicationService');

/* ── Test DB setup ── */
beforeEach(async () => {
  const testDb = new sqlite3.Database(':memory:');
  db.setDb(testDb);
  await db.createSchema();
  await db.seedStatuses();
  await db.run('INSERT INTO users (id, username, password) VALUES (1, "user1", "hash"), (2, "user2", "hash")');
});

afterEach(() => db.resetDb());

/* Helper */
async function seedApp(userId = 1, overrides = {}) {
  return createApplication({ id: userId, role: 'user' }, {
    company_name: 'Test Corp',
    position: 'Developer',
    status_id: 1,
    application_date: '2026-01-15',
    notes: 'Test note',
    ...overrides,
  });
}

/* ─────────────────────────────────────
   validateApplicationData
───────────────────────────────────── */
describe('validateApplicationData', () => {
  test('returns no errors for valid data', () => {
    const errors = validateApplicationData({
      company_name: 'Google', position: 'Engineer',
      status_id: 1, application_date: '2026-05-01',
    });
    expect(errors).toHaveLength(0);
  });

  test('requires company_name', () => {
    const errors = validateApplicationData({ position: 'Dev', status_id: 1, application_date: '2026-05-01' });
    expect(errors).toContain('company_name is required');
  });

  test('requires position', () => {
    const errors = validateApplicationData({ company_name: 'X', status_id: 1, application_date: '2026-05-01' });
    expect(errors).toContain('position is required');
  });

  test('requires status_id', () => {
    const errors = validateApplicationData({ company_name: 'X', position: 'Y', application_date: '2026-05-01' });
    expect(errors).toContain('status_id is required');
  });

  test('requires application_date', () => {
    const errors = validateApplicationData({ company_name: 'X', position: 'Y', status_id: 1 });
    expect(errors).toContain('application_date is required');
  });

  test('rejects wrong date format', () => {
    const errors = validateApplicationData({ company_name: 'X', position: 'Y', status_id: 1, application_date: '01/05/2026' });
    expect(errors).toContain('application_date must be in YYYY-MM-DD format');
  });

  test('returns multiple errors for empty object', () => {
    expect(validateApplicationData({})).toHaveLength(4);
  });
});

/* ─────────────────────────────────────
   getAllApplications
───────────────────────────────────── */
describe('getAllApplications', () => {
  const user1 = { id: 1, role: 'user' };
  const user2 = { id: 2, role: 'user' };
  const adminUser = { id: 3, role: 'admin' };

  test('returns empty array initially', async () => {
    await expect(getAllApplications(user1)).resolves.toEqual([]);
  });

  test('returns all applications for the user', async () => {
    await seedApp(1, { company_name: 'Alpha' });
    await seedApp(1, { company_name: 'Beta' });
    const apps = await getAllApplications(user1);
    expect(apps).toHaveLength(2);
  });

  test('filters by company_name (partial match)', async () => {
    await seedApp(1, { company_name: 'Google LLC' });
    await seedApp(1, { company_name: 'Microsoft' });
    const result = await getAllApplications(user1, { company_name: 'goog' });
    expect(result).toHaveLength(1);
    expect(result[0].company_name).toBe('Google LLC');
  });

  test('filters by status_id', async () => {
    await seedApp(1, { status_id: 1 });
    await seedApp(1, { status_id: 2 });
    const result = await getAllApplications(user1, { status_id: 2 });
    expect(result).toHaveLength(1);
    expect(result[0].status_id).toBe(2);
  });

  test('includes status_name join and owner_name join', async () => {
    // Note: since test db doesn't actually have users seeded in the helper yet,
    // the owner_name might be null, but the join shouldn't fail.
    await seedApp(1, { status_id: 1 });
    const result = await getAllApplications(user1);
    expect(result[0]).toHaveProperty('status_name', 'Pending');
    expect(result[0]).toHaveProperty('owner_name');
  });

  test('data isolation: user2 cannot see user1 applications', async () => {
    await seedApp(1, { company_name: 'User1 App' });
    await seedApp(2, { company_name: 'User2 App' });
    
    const appsUser1 = await getAllApplications(user1);
    expect(appsUser1).toHaveLength(1);
    expect(appsUser1[0].company_name).toBe('User1 App');

    const appsUser2 = await getAllApplications(user2);
    expect(appsUser2).toHaveLength(1);
    expect(appsUser2[0].company_name).toBe('User2 App');
  });

  test('admin role: can see all users applications', async () => {
    await seedApp(1, { company_name: 'User1 App' });
    await seedApp(2, { company_name: 'User2 App' });
    
    const allApps = await getAllApplications(adminUser);
    expect(allApps.length).toBeGreaterThanOrEqual(2);
  });
});

/* ─────────────────────────────────────
   getApplicationById
───────────────────────────────────── */
describe('getApplicationById', () => {
  const user1 = { id: 1, role: 'user' };
  const user2 = { id: 2, role: 'user' };
  const adminUser = { id: 3, role: 'admin' };

  test('returns the correct application', async () => {
    const created = await seedApp(1, { company_name: 'GitHub' });
    const found = await getApplicationById(user1, created.id);
    expect(found).not.toBeNull();
    expect(found.company_name).toBe('GitHub');
  });

  test('returns null for non-existent id', async () => {
    await expect(getApplicationById(user1, 9999)).resolves.toBeNull();
  });

  test('data isolation: returns null if application belongs to another user', async () => {
    const created = await seedApp(1, { company_name: 'GitHub' });
    await expect(getApplicationById(user2, created.id)).resolves.toBeNull();
  });

  test('admin role: can get application belonging to another user', async () => {
    const created = await seedApp(1, { company_name: 'GitHub' });
    const found = await getApplicationById(adminUser, created.id);
    expect(found).not.toBeNull();
    expect(found.company_name).toBe('GitHub');
  });
});

/* ─────────────────────────────────────
   createApplication
───────────────────────────────────── */
describe('createApplication', () => {
  const user1 = { id: 1, role: 'user' };

  test('creates and returns a new application with id', async () => {
    const app = await createApplication(user1, {
      company_name: 'Amazon', position: 'SDE',
      status_id: 1, application_date: '2026-04-20', notes: 'Remote role',
    });
    expect(app).toMatchObject({ company_name: 'Amazon', position: 'SDE', status_name: 'Pending' });
    expect(app.id).toBeDefined();
  });

  test('throws 400 for missing fields', async () => {
    await expect(createApplication(user1, {})).rejects.toMatchObject({ status: 400 });
  });

  test('throws 400 for invalid status_id', async () => {
    await expect(createApplication(user1, {
      company_name: 'X', position: 'Y', status_id: 999, application_date: '2026-01-01',
    })).rejects.toMatchObject({ status: 400 });
  });

  test('stores null when notes are not provided', async () => {
    const app = await createApplication(user1, {
      company_name: 'Apple', position: 'Intern', status_id: 1, application_date: '2026-03-01',
    });
    expect(app.notes).toBeNull();
  });
});

/* ─────────────────────────────────────
   updateApplication
───────────────────────────────────── */
describe('updateApplication', () => {
  const user1 = { id: 1, role: 'user' };
  const user2 = { id: 2, role: 'user' };
  const adminUser = { id: 3, role: 'admin' };

  test('updates and returns the application', async () => {
    const app = await seedApp(1, { company_name: 'Old Co' });
    const updated = await updateApplication(user1, app.id, {
      company_name: 'New Co', position: 'Manager',
      status_id: 2, application_date: '2026-06-01',
    });
    expect(updated.company_name).toBe('New Co');
    expect(updated.status_id).toBe(2);
  });

  test('throws 404 when application not found', async () => {
    await expect(updateApplication(user1, 9999, {
      company_name: 'X', position: 'Y', status_id: 1, application_date: '2026-01-01',
    })).rejects.toMatchObject({ status: 404 });
  });

  test('throws 400 for invalid data', async () => {
    const app = await seedApp(1);
    await expect(updateApplication(user1, app.id, {})).rejects.toMatchObject({ status: 400 });
  });

  test('data isolation: throws 404 if user tries to update another users application', async () => {
    const app = await seedApp(1);
    await expect(updateApplication(user2, app.id, {
      company_name: 'X', position: 'Y', status_id: 1, application_date: '2026-01-01',
    })).rejects.toMatchObject({ status: 404 });
  });

  test('admin role: can update another users application', async () => {
    const app = await seedApp(1);
    const updated = await updateApplication(adminUser, app.id, {
      company_name: 'Admin Edited', position: 'Y', status_id: 1, application_date: '2026-01-01',
    });
    expect(updated.company_name).toBe('Admin Edited');
  });
});

/* ─────────────────────────────────────
   deleteApplication
───────────────────────────────────── */
describe('deleteApplication', () => {
  const user1 = { id: 1, role: 'user' };
  const user2 = { id: 2, role: 'user' };
  const adminUser = { id: 3, role: 'admin' };

  test('deletes the application', async () => {
    const app = await seedApp(1);
    const result = await deleteApplication(user1, app.id);
    expect(result.message).toMatch(/deleted/i);
    await expect(getApplicationById(user1, app.id)).resolves.toBeNull();
  });

  test('throws 404 when application not found', async () => {
    await expect(deleteApplication(user1, 9999)).rejects.toMatchObject({ status: 404 });
  });

  test('data isolation: throws 404 if user tries to delete another users application', async () => {
    const app = await seedApp(1);
    await expect(deleteApplication(user2, app.id)).rejects.toMatchObject({ status: 404 });
  });

  test('admin role: can delete another users application', async () => {
    const app = await seedApp(1);
    await deleteApplication(adminUser, app.id);
    await expect(getApplicationById(adminUser, app.id)).resolves.toBeNull();
  });
});
