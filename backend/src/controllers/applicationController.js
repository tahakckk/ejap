const applicationService = require('../services/applicationService');

async function getAllApplications(req, res) {
  try {
    const reqUser = req.user;
    const { company_name, status_id } = req.query;
    const data = await applicationService.getAllApplications(reqUser, { company_name, status_id });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

async function getApplicationById(req, res) {
  try {
    const reqUser = req.user;
    const data = await applicationService.getApplicationById(reqUser, req.params.id);
    if (!data) return res.status(404).json({ error: 'Application not found or unauthorized' });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

async function createApplication(req, res) {
  try {
    const reqUser = req.user;
    const data = await applicationService.createApplication(reqUser, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

async function updateApplication(req, res) {
  try {
    const reqUser = req.user;
    const data = await applicationService.updateApplication(reqUser, req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

async function deleteApplication(req, res) {
  try {
    const reqUser = req.user;
    const result = await applicationService.deleteApplication(reqUser, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
}

module.exports = {
  getAllApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
};
