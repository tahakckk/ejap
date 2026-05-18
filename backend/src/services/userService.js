const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../models/database');
const { JWT_SECRET } = require('../middleware/authMiddleware');

function validateUserData(username, password) {
  if (!username || username.trim() === '') return 'Username is required';
  if (!password || password.trim() === '') return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  return null;
}

async function registerUser(username, password) {
  const error = validateUserData(username, password);
  if (error) throw { status: 400, message: error };

  const existing = await get('SELECT id FROM users WHERE username = ?', [username.trim()]);
  if (existing) throw { status: 400, message: 'Username is already taken' };

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username.trim(), hashedPassword]
  );
  
  return { id: result.lastID, username: username.trim() };
}

async function loginUser(username, password) {
  if (!username || !password) {
    throw { status: 400, message: 'Username and password are required' };
  }

  const user = await get('SELECT * FROM users WHERE username = ?', [username.trim()]);
  if (!user) {
    throw { status: 401, message: 'Invalid username or password' };
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw { status: 401, message: 'Invalid username or password' };
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, role: user.role }
  };
}

module.exports = {
  registerUser,
  loginUser
};
