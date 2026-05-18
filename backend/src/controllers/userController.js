const userService = require('../services/userService');

async function register(req, res) {
  try {
    const { username, password } = req.body;
    const data = await userService.registerUser(username, password);
    res.status(201).json({ message: 'User registered successfully', user: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const data = await userService.loginUser(username, password);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

module.exports = {
  register,
  login
};
