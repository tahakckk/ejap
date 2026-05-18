const { get, all, run } = require('../models/database');

function validateApplicationData(data) {
  const errors = [];
  if (!data.company_name || String(data.company_name).trim() === '') errors.push('company_name is required');
  if (!data.position || String(data.position).trim() === '')         errors.push('position is required');
  if (!data.status_id)                                                errors.push('status_id is required');
  if (!data.application_date || String(data.application_date).trim() === '') {
    errors.push('application_date is required');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.application_date)) {
    errors.push('application_date must be in YYYY-MM-DD format');
  }
  return errors;
}

async function getApplicationById(reqUser, applicationId) {
  const isUser = reqUser.role !== 'admin';
  const query = `
     SELECT a.*, s.name AS status_name, u.username AS owner_name
     FROM applications a
     LEFT JOIN statuses s ON a.status_id = s.id
     LEFT JOIN users u ON a.user_id = u.id
     WHERE a.id = ? ${isUser ? 'AND a.user_id = ?' : ''}`;
  
  const params = [Number(applicationId)];
  if (isUser) params.push(Number(reqUser.id));
  
  return get(query, params);
}

async function getAllApplications(reqUser, filters = {}) {
  const isUser = reqUser.role !== 'admin';
  const conditions = [];
  const params = [];

  if (isUser) {
    conditions.push('a.user_id = ?');
    params.push(Number(reqUser.id));
  }

  if (filters.company_name) { 
    conditions.push('a.company_name LIKE ?'); 
    params.push(`%${filters.company_name}%`); 
  }
  if (filters.status_id) { 
    conditions.push('a.status_id = ?');       
    params.push(Number(filters.status_id)); 
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT a.*, s.name AS status_name, u.username AS owner_name
    FROM applications a
    LEFT JOIN statuses s ON a.status_id = s.id
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.application_date DESC
  `;
  
  return all(query, params);
}

async function createApplication(reqUser, data) {
  const errors = validateApplicationData(data);
  if (errors.length > 0) throw { status: 400, message: errors.join(', ') };

  const status = await get('SELECT id FROM statuses WHERE id = ?', [Number(data.status_id)]);
  if (!status) throw { status: 400, message: 'Invalid status_id' };

  const result = await run(
    `INSERT INTO applications (user_id, company_name, position, status_id, application_date, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(reqUser.id),
      data.company_name.trim(),
      data.position.trim(),
      Number(data.status_id),
      data.application_date.trim(),
      data.notes ? data.notes.trim() : null,
    ]
  );
  return getApplicationById(reqUser, result.lastID);
}

async function updateApplication(reqUser, applicationId, data) {
  const existing = await getApplicationById(reqUser, applicationId);
  if (!existing) throw { status: 404, message: 'Application not found or unauthorized' };

  const errors = validateApplicationData(data);
  if (errors.length > 0) throw { status: 400, message: errors.join(', ') };

  const status = await get('SELECT id FROM statuses WHERE id = ?', [Number(data.status_id)]);
  if (!status) throw { status: 400, message: 'Invalid status_id' };

  const isUser = reqUser.role !== 'admin';
  const query = `
     UPDATE applications
     SET company_name = ?, position = ?, status_id = ?, application_date = ?, notes = ?
     WHERE id = ? ${isUser ? 'AND user_id = ?' : ''}`;
     
  const params = [
    data.company_name.trim(),
    data.position.trim(),
    Number(data.status_id),
    data.application_date.trim(),
    data.notes ? data.notes.trim() : null,
    Number(applicationId)
  ];
  if (isUser) params.push(Number(reqUser.id));

  await run(query, params);
  return getApplicationById(reqUser, applicationId);
}

async function deleteApplication(reqUser, applicationId) {
  const existing = await getApplicationById(reqUser, applicationId);
  if (!existing) throw { status: 404, message: 'Application not found or unauthorized' };
  
  const isUser = reqUser.role !== 'admin';
  const query = `DELETE FROM applications WHERE id = ? ${isUser ? 'AND user_id = ?' : ''}`;
  const params = [Number(applicationId)];
  if (isUser) params.push(Number(reqUser.id));

  await run(query, params);
  return { message: 'Application deleted successfully' };
}

module.exports = {
  validateApplicationData,
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
};
