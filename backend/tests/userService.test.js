const sqlite3 = require('sqlite3').verbose();
const db = require('../src/models/database');
const { registerUser, loginUser } = require('../src/services/userService');

beforeEach(async () => {
  const testDb = new sqlite3.Database(':memory:');
  db.setDb(testDb);
  await db.createSchema();
});

afterEach(() => db.resetDb());

describe('userService', () => {
  describe('registerUser', () => {
    test('successfully registers a user', async () => {
      const user = await registerUser('testuser', 'password123');
      expect(user).toHaveProperty('id');
      expect(user.username).toBe('testuser');
    });

    test('fails if username is missing', async () => {
      await expect(registerUser('', 'password123')).rejects.toMatchObject({ status: 400 });
    });

    test('fails if password is too short', async () => {
      await expect(registerUser('user', '123')).rejects.toMatchObject({ status: 400 });
    });

    test('fails if username is already taken', async () => {
      await registerUser('testuser', 'password123');
      await expect(registerUser('testuser', 'password456')).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      await registerUser('testuser', 'password123');
    });

    test('successfully logs in and returns token', async () => {
      const result = await loginUser('testuser', 'password123');
      expect(result).toHaveProperty('token');
      expect(result.user.username).toBe('testuser');
    });

    test('fails with wrong password', async () => {
      await expect(loginUser('testuser', 'wrongpass')).rejects.toMatchObject({ status: 401 });
    });

    test('fails with wrong username', async () => {
      await expect(loginUser('wronguser', 'password123')).rejects.toMatchObject({ status: 401 });
    });
  });
});
