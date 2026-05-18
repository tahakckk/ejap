const { all } = require('../models/database');

async function getAllStatuses() {
  return all('SELECT * FROM statuses ORDER BY id ASC');
}

module.exports = { getAllStatuses };
