const statusService = require('../services/statusService');

async function getAllStatuses(req, res) {
  try {
    const data = await statusService.getAllStatuses();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

module.exports = { getAllStatuses };
