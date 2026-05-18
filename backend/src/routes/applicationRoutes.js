const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/applicationController');

const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect all application routes

router.get('/',      ctrl.getAllApplications);
router.get('/:id',   ctrl.getApplicationById);
router.post('/',     ctrl.createApplication);
router.put('/:id',   ctrl.updateApplication);
router.delete('/:id', ctrl.deleteApplication);

module.exports = router;
